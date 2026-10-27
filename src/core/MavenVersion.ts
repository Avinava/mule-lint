/**
 * Maven version syntax and ordering, for rules that compare POM versions.
 *
 * Ordering follows Maven's ComparableVersion for the forms POMs use: numeric
 * release segments, then a qualifier ranked
 * `alpha < beta < milestone < rc = cr < snapshot < (release) = ga = final < sp`,
 * then other text qualifiers (lexically), then numeric qualifiers. So
 * `3.1.0-SNAPSHOT` and `3.1.0-rc1` sort before `3.1.0`, while `3.1.0-1` sorts
 * after it, and `3.1` equals `3.1.0`.
 */

/**
 * A version string: numeric segments, optionally followed by a `-` or `.`
 * qualifier made of letters and digits. Anything else, such as a resolved
 * property holding unrelated text, is not a version and must not be printed.
 */
const VERSION_SYNTAX = /^\d+(\.\d+)*([.-][A-Za-z0-9]+)*$/;

export function isMavenVersion(value: string | undefined): value is string {
  return value !== undefined && VERSION_SYNTAX.test(value.trim());
}

const QUALIFIER_RANK: Record<string, number> = {
  alpha: 1,
  a: 1,
  beta: 2,
  b: 2,
  milestone: 3,
  m: 3,
  rc: 4,
  cr: 4,
  snapshot: 5,
  '': 6,
  ga: 6,
  final: 6,
  release: 6,
  sp: 7,
};
const TEXT_RANK = 8;
const NUMBER_RANK = 9;

interface Qualifier {
  rank: number;
  text: string;
  number: number;
}

function parse(version: string): { release: number[]; qualifier: Qualifier } {
  const trimmed = version.trim();
  const release = /^\d+(\.\d+)*/.exec(trimmed)?.[0] ?? '0';
  const rest = trimmed.slice(release.length).replace(/^[.-]/, '').toLowerCase();
  const numbers = release.split('.').map((part) => parseInt(part, 10));
  while (numbers.length > 1 && numbers.at(-1) === 0) numbers.pop();

  const first = rest.split(/[.-]/)[0] ?? '';
  let qualifier: Qualifier;
  if (/^\d+$/.test(first)) {
    qualifier = { rank: NUMBER_RANK, text: '', number: parseInt(first, 10) };
  } else {
    const [, name = '', digits = ''] = /^([a-z]*)(\d*)/.exec(first) ?? [];
    qualifier = {
      rank: QUALIFIER_RANK[name] ?? TEXT_RANK,
      text: name,
      number: digits ? parseInt(digits, 10) : 0,
    };
  }
  return { release: numbers, qualifier };
}

/** Negative, zero, or positive as `left` sorts before, equal to, or after `right`. */
export function compareMavenVersions(left: string, right: string): number {
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.release.length, b.release.length); index++) {
    const difference = (a.release[index] ?? 0) - (b.release[index] ?? 0);
    if (difference !== 0) return difference;
  }
  if (a.qualifier.rank !== b.qualifier.rank) return a.qualifier.rank - b.qualifier.rank;
  if (a.qualifier.text !== b.qualifier.text) return a.qualifier.text < b.qualifier.text ? -1 : 1;
  return a.qualifier.number - b.qualifier.number;
}
