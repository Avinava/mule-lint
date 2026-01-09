import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';

/**
 * Options for file scanning
 */
export interface ScanOptions {
    /** Glob patterns for files to include */
    include: string[];
    /** Glob patterns for files to exclude */
    exclude: string[];
    /** Maximum depth to traverse */
    maxDepth?: number;
    /** Follow symbolic links */
    followSymlinks?: boolean;
}

/**
 * Default scan options for Mule projects
 */
export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
    include: ['**/*.xml'],
    exclude: ['**/target/**', '**/node_modules/**', '**/.git/**', '**/*.munit.xml'],
    followSymlinks: false,
};

/**
 * Information about a scanned file
 */
export interface ScannedFile {
    /** Absolute path to the file */
    absolutePath: string;
    /** Path relative to the scan root */
    relativePath: string;
    /** File size in bytes */
    size: number;
}

/**
 * Scan a directory for XML files
 *
 * @param rootPath - Root directory to scan
 * @param options - Scan options (include/exclude patterns)
 * @returns Array of scanned file info
 */
export async function scanDirectory(
    rootPath: string,
    options: Partial<ScanOptions> = {},
): Promise<ScannedFile[]> {
    const opts: ScanOptions = { ...DEFAULT_SCAN_OPTIONS, ...options };
    const absoluteRoot = path.resolve(rootPath);

    // Verify root exists and is a directory
    if (!fs.existsSync(absoluteRoot)) {
        throw new Error(`Path does not exist: ${absoluteRoot}`);
    }

    const stats = fs.statSync(absoluteRoot);

    // If it's a single file, return just that file
    if (stats.isFile()) {
        return [
            {
                absolutePath: absoluteRoot,
                relativePath: path.basename(absoluteRoot),
                size: stats.size,
            },
        ];
    }

    // Use fast-glob for directory scanning
    const files = await fg(opts.include, {
        cwd: absoluteRoot,
        absolute: true,
        ignore: opts.exclude,
        followSymbolicLinks: opts.followSymlinks,
        onlyFiles: true,
        deep: opts.maxDepth,
    });

    return files.map((filePath) => ({
        absolutePath: filePath,
        relativePath: path.relative(absoluteRoot, filePath),
        size: fs.statSync(filePath).size,
    }));
}

/**
 * Synchronous version of scanDirectory
 */
export function scanDirectorySync(
    rootPath: string,
    options: Partial<ScanOptions> = {},
): ScannedFile[] {
    const opts: ScanOptions = { ...DEFAULT_SCAN_OPTIONS, ...options };
    const absoluteRoot = path.resolve(rootPath);

    // Verify root exists
    if (!fs.existsSync(absoluteRoot)) {
        throw new Error(`Path does not exist: ${absoluteRoot}`);
    }

    const stats = fs.statSync(absoluteRoot);

    // If it's a single file, return just that file
    if (stats.isFile()) {
        return [
            {
                absolutePath: absoluteRoot,
                relativePath: path.basename(absoluteRoot),
                size: stats.size,
            },
        ];
    }

    // Use fast-glob sync for directory scanning
    const files = fg.sync(opts.include, {
        cwd: absoluteRoot,
        absolute: true,
        ignore: opts.exclude,
        followSymbolicLinks: opts.followSymlinks,
        onlyFiles: true,
        deep: opts.maxDepth,
    });

    return files.map((filePath) => ({
        absolutePath: filePath,
        relativePath: path.relative(absoluteRoot, filePath),
        size: fs.statSync(filePath).size,
    }));
}

/**
 * Read file content
 */
export function readFileContent(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
}

/**
 * Get the Mule project source directory
 * Returns the path if it exists, null otherwise
 */
export function getMuleSourceDir(projectRoot: string): string | null {
    const muleDir = path.join(projectRoot, 'src', 'main', 'mule');
    return fs.existsSync(muleDir) ? muleDir : null;
}

/**
 * Get the resources directory
 */
export function getResourcesDir(projectRoot: string): string | null {
    const resourcesDir = path.join(projectRoot, 'src', 'main', 'resources');
    return fs.existsSync(resourcesDir) ? resourcesDir : null;
}
