import * as prettier from 'prettier';
import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';

/**
 * Anypoint Studio-compatible formatting defaults for Mule XML.
 *
 * These values match the standard Eclipse/Anypoint Studio XML editor:
 *   - 4-space indentation
 *   - 140-char line width
 *   - Attribute quotes are preserved (never mutates ' → " or vice-versa)
 */
export const MULE_XML_DEFAULTS = {
  tabWidth: 4,
  printWidth: 140,
  xmlQuoteAttributes: 'preserve' as const,
  xmlSortAttributesByKey: false,
  xmlSelfClosingSpace: true,
  xmlWhitespaceSensitivity: 'ignore' as const,
} as const;

/**
 * User-overridable formatting options.
 */
export interface FormatOptions {
  /** Spaces per indentation level (default: 4 — Anypoint Studio standard) */
  tabWidth?: number | undefined;
  /** Max line width before wrapping (default: 140) */
  printWidth?: number | undefined;
  /** Attribute quote handling: 'preserve' (default), 'single', or 'double' */
  xmlQuoteAttributes?: 'preserve' | 'single' | 'double' | undefined;
  /** Sort attributes alphabetically (default: false) */
  xmlSortAttributesByKey?: boolean | undefined;
  /** Dry-run mode — report changes without writing files */
  check?: boolean | undefined;
}

/**
 * Result of formatting a single file.
 */
export interface FormatResult {
  filePath: string;
  changed: boolean;
  error?: string | undefined;
}

/**
 * Result of formatting raw XML content.
 */
export interface ContentFormatResult {
  formatted: string;
  changed: boolean;
}

// ─── Core API ───────────────────────────────────────────────────────────────

/**
 * Format raw XML content using Prettier with Mule-safe defaults.
 *
 * @param content  Raw XML string
 * @param options  Override any formatting option
 * @returns        The formatted XML string
 */
export async function formatXmlContent(
  content: string,
  options?: FormatOptions,
): Promise<ContentFormatResult> {
  const prettierOptions = buildPrettierOptions(options);
  const formatted = await prettier.format(content, prettierOptions);
  return {
    formatted,
    changed: formatted !== content,
  };
}

/**
 * Format a single XML file on disk.
 *
 * In `check` mode the file is not written — only `changed` is set.
 */
export async function formatFile(filePath: string, options?: FormatOptions): Promise<FormatResult> {
  const absolutePath = path.resolve(filePath);

  try {
    if (!fs.existsSync(absolutePath)) {
      return { filePath: absolutePath, changed: false, error: `File not found: ${absolutePath}` };
    }

    const original = fs.readFileSync(absolutePath, 'utf-8');
    const prettierOptions = buildPrettierOptions(options);
    const formatted = await prettier.format(original, prettierOptions);
    const changed = formatted !== original;

    if (changed && !options?.check) {
      fs.writeFileSync(absolutePath, formatted, 'utf-8');
    }

    return { filePath: absolutePath, changed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { filePath: absolutePath, changed: false, error: message };
  }
}

/**
 * Format all Mule XML files in a project.
 *
 * Discovers files matching `src/main/mule/**\/*.xml` (the standard Mule layout).
 * In `check` mode no files are written.
 */
export async function formatProject(
  projectPath: string,
  options?: FormatOptions,
): Promise<FormatResult[]> {
  const absoluteProject = path.resolve(projectPath);

  if (!fs.existsSync(absoluteProject)) {
    return [
      {
        filePath: absoluteProject,
        changed: false,
        error: `Project path not found: ${absoluteProject}`,
      },
    ];
  }

  // Discover Mule XML files
  const pattern = 'src/main/mule/**/*.xml';
  const files = await fg(pattern, { cwd: absoluteProject, absolute: true });

  if (files.length === 0) {
    return [];
  }

  const results: FormatResult[] = [];
  for (const file of files) {
    results.push(await formatFile(file, options));
  }
  return results;
}

// ─── Internal helpers ───────────────────────────────────────────────────────

/**
 * Merge user options with Mule XML defaults into a full Prettier config.
 *
 * Passes `@prettier/plugin-xml` as a plugin name string so that Prettier's
 * own ESM-aware resolver handles the import. This avoids CJS/ESM issues.
 */
function buildPrettierOptions(options?: FormatOptions): prettier.Options {
  return {
    parser: 'xml',
    plugins: ['@prettier/plugin-xml'],
    tabWidth: options?.tabWidth ?? MULE_XML_DEFAULTS.tabWidth,
    printWidth: options?.printWidth ?? MULE_XML_DEFAULTS.printWidth,
    xmlQuoteAttributes: options?.xmlQuoteAttributes ?? MULE_XML_DEFAULTS.xmlQuoteAttributes,
    xmlSortAttributesByKey:
      options?.xmlSortAttributesByKey ?? MULE_XML_DEFAULTS.xmlSortAttributesByKey,
    xmlSelfClosingSpace: MULE_XML_DEFAULTS.xmlSelfClosingSpace,
    xmlWhitespaceSensitivity: MULE_XML_DEFAULTS.xmlWhitespaceSensitivity,
  };
}
