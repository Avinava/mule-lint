import * as path from 'node:path';
import fs from 'node:fs';
import { expand } from 'brace-expansion';
import globParent from 'glob-parent';
import picomatch from 'picomatch';
import {
  glob,
  globSync,
  isDynamicPattern,
  type GlobOptions,
  type FileSystemAdapter,
} from 'tinyglobby';

/** The subset used by scanners, resource discovery, and XML formatting. */
interface FileGlobOptions {
  cwd: string;
  absolute?: boolean;
  ignore?: readonly string[];
  followSymbolicLinks?: boolean;
  onlyFiles?: boolean;
  deep?: number;
}

const MAX_PATTERNS = 1000;
const MAX_PATTERN_LENGTH = 4096;

function expandPatterns(patterns: readonly string[]): string[] {
  const expanded: string[] = [];
  for (const pattern of patterns) {
    if (!pattern || pattern.length > MAX_PATTERN_LENGTH) {
      throw new Error('Glob patterns must contain between 1 and 4096 characters');
    }
    let nesting = 0;
    let groups = 0;
    for (let index = 0; index < pattern.length; index++) {
      const character = pattern[index];
      if (character === '\\') {
        index++;
      } else if (character === '{' || character === '(' || character === '[') {
        nesting++;
        groups++;
        if (nesting > 32 || groups > 256) {
          throw new Error('Glob pattern nesting or complexity exceeds the supported limit');
        }
      } else if (character === '}' || character === ')' || character === ']') {
        nesting = Math.max(0, nesting - 1);
      }
    }
    // This is brace-expansion, not the vulnerable braces package. Keep padded and
    // stepped ranges while bounding expansion before handing patterns to picomatch.
    expanded.push(
      ...expand(pattern, {
        max: MAX_PATTERNS + 1,
        maxLength: MAX_PATTERN_LENGTH * (MAX_PATTERNS + 1),
        maxDepth: 64,
        maxRewrites: 512,
      }),
    );
    if (expanded.length > MAX_PATTERNS) {
      throw new Error('Glob patterns expand to more than 1000 alternatives');
    }
  }
  return expanded;
}

interface Task {
  patterns: string[];
  options: GlobOptions;
  absolute: boolean;
  dotPrefix: boolean;
  excluded: (file: string) => boolean;
}

function createTasks(patterns: string | string[], options: FileGlobOptions): Task[] {
  const input = expandPatterns(typeof patterns === 'string' ? [patterns] : patterns);
  const negative = input.filter((pattern) => pattern.startsWith('!') && !pattern.startsWith('!('));
  const positive = input.filter((pattern) => !negative.includes(pattern));
  const ignored = [
    ...negative.map((pattern) => pattern.slice(1)),
    ...expandPatterns(options.ignore ?? []),
  ];
  const excludeRelative = picomatch(
    ignored.filter((pattern) => !path.posix.isAbsolute(pattern)),
    { dot: true, nobrace: true },
  );
  const excludeAbsolute = picomatch(
    ignored.filter((pattern) => path.posix.isAbsolute(pattern)),
    { dot: true, nobrace: true },
  );
  const tasks: Task[] = [];
  // Static patterns have never been restricted by traversal depth. Dynamic
  // patterns share a root task if any starts there, matching the previous scanner.
  for (const dynamic of [false, true]) {
    const selected = positive.filter((pattern) => isDynamicPattern(pattern) === dynamic);
    const hasRoot = selected.some((pattern) => globParent(pattern) === '.');
    const groups = new Map<string, string[]>();
    for (const pattern of selected) {
      const outside = pattern.startsWith('../') || path.posix.isAbsolute(pattern);
      const base = hasRoot && !outside ? '.' : globParent(pattern);
      const group = groups.get(base) ?? [];
      group.push(pattern);
      groups.set(base, group);
    }
    for (const [base, group] of groups) {
      const cwd = path.resolve(options.cwd, base);
      const rebase = (pattern: string): string => path.posix.relative(base, pattern);
      tasks.push({
        patterns: group.map(rebase),
        absolute: options.absolute === true || path.posix.isAbsolute(base),
        dotPrefix: base.startsWith('./'),
        excluded: (file) =>
          excludeAbsolute(file) ||
          excludeRelative(
            path.posix.isAbsolute(base)
              ? file
              : path.relative(options.cwd, file).split(path.sep).join('/'),
          ),
        options: {
          cwd,
          absolute: true,
          expandDirectories: false,
          braceExpansion: false,
          onlyFiles: options.onlyFiles ?? true,
          followSymbolicLinks: options.followSymbolicLinks ?? true,
          ignore: ignored
            .filter(
              (pattern) =>
                !path.posix.isAbsolute(base) ||
                path.posix.isAbsolute(pattern) ||
                pattern.startsWith('**/'),
            )
            .map((pattern) => (pattern.startsWith('**/') ? pattern : rebase(pattern))),
          ...(dynamic && options.deep !== undefined && Number.isFinite(options.deep)
            ? { deep: Math.max(0, Math.ceil(options.deep) - 1) }
            : {}),
        },
      });
    }
  }
  return tasks;
}

function formatResults(results: string[][], tasks: Task[], cwd: string): string[] {
  return [
    ...new Set(
      results.flatMap((files, index) =>
        files
          .filter((file) => !tasks[index]?.excluded(file))
          .map((file) =>
            tasks[index]?.absolute
              ? file
              : (tasks[index]?.dotPrefix ? './' : '') +
                path.relative(cwd, file).split(path.sep).join('/'),
          ),
      ),
    ),
  ].sort();
}

/** tinyglobby suppresses I/O errors; never turn an unreadable tree into a clean scan. */
function strictFileSystem(): { fs: FileSystemAdapter; check: () => void } {
  let failure: Error | undefined;
  const record = (error: unknown): void => {
    if (error && !(typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) {
      failure ??= error instanceof Error ? error : new Error('File discovery failed');
    }
  };
  const synchronous = <T extends (...args: never[]) => unknown>(operation: T): T =>
    new Proxy(operation, {
      apply(target, receiver: unknown, args: unknown[]) {
        try {
          const result: unknown = Reflect.apply(target, receiver, args);
          return result;
        } catch (error) {
          record(error);
          throw error;
        }
      },
    });
  const asynchronous = <T extends (...args: never[]) => unknown>(operation: T): T =>
    new Proxy(operation, {
      apply(target, receiver: unknown, args: unknown[]) {
        const callback = args[args.length - 1];
        const observed = (error: unknown, ...values: unknown[]): void => {
          record(error);
          if (typeof callback === 'function') Reflect.apply(callback, receiver, [error, ...values]);
        };
        const result: unknown = Reflect.apply(target, receiver, [...args.slice(0, -1), observed]);
        return result;
      },
    });
  return {
    fs: {
      readdir: asynchronous(fs.readdir),
      readdirSync: synchronous(fs.readdirSync),
      realpath: asynchronous(fs.realpath),
      realpathSync: synchronous(fs.realpathSync),
      stat: asynchronous(fs.stat),
      statSync: synchronous(fs.statSync),
    },
    check() {
      if (failure) throw failure;
    },
  };
}

async function scan(patterns: string | string[], options: FileGlobOptions): Promise<string[]> {
  const tasks = createTasks(patterns, options);
  const checked = strictFileSystem();
  const results = await Promise.all(
    tasks.map((task) => glob(task.patterns, { ...task.options, fs: checked.fs })),
  );
  checked.check();
  return formatResults(results, tasks, options.cwd);
}

function scanSync(patterns: string | string[], options: FileGlobOptions): string[] {
  const tasks = createTasks(patterns, options);
  const checked = strictFileSystem();
  const results = tasks.map((task) => globSync(task.patterns, { ...task.options, fs: checked.fs }));
  checked.check();
  return formatResults(results, tasks, options.cwd);
}

export default Object.assign(scan, { sync: scanSync });
