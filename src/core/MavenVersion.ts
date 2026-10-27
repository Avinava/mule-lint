/**
 * Maven version syntax and ordering, for rules that compare POM versions.
 *
 * A port of Maven's ComparableVersion (maven-artifact), so versions order the
 * way Maven, the Mule Maven plugin, and Exchange order them, and the way
 * @sfdxy/mule-build's MavenVersion port orders them. Each tool keeps its own
 * copy; the tests here pin Maven's own ComparableVersionTest vectors.
 *
 * A version splits on `.` and `-` and on every digit/letter transition. `-`
 * opens a sublist. Qualifiers rank
 * `alpha < beta < milestone < rc (= cr) < snapshot < "" (= ga, final, release) < sp`,
 * then any other text lexically; a number outranks any qualifier. Trailing
 * zeros and release qualifiers are dropped, so `1 == 1.0 == 1-ga`, while
 * `3.1.0-SNAPSHOT < 3.1.0 < 3.1.0-1`.
 */

/**
 * A version string: numeric segments, optionally followed by `-` or `.`
 * qualifiers made of letters and digits. Anything else, such as a resolved
 * property holding unrelated text, is not a version and must not be printed.
 */
const VERSION_SYNTAX = /^\d+(\.\d+)*([.-][A-Za-z0-9]+)*$/;

export function isMavenVersion(value: string | undefined): value is string {
  return value !== undefined && VERSION_SYNTAX.test(value.trim());
}

type Item = IntItem | StringItem | ListItem;

const QUALIFIERS = ['alpha', 'beta', 'milestone', 'rc', 'snapshot', '', 'sp'];
const ALIASES: Record<string, string> = { ga: '', final: '', release: '', cr: 'rc' };
const RELEASE_INDEX = String(QUALIFIERS.indexOf(''));

function compareStrings(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

/** Known qualifiers by rank; unknown ones after all of them, compared as text. */
function comparableQualifier(value: string): string {
  const index = QUALIFIERS.indexOf(value);
  return index === -1 ? `${QUALIFIERS.length}-${value}` : String(index);
}

class IntItem {
  constructor(readonly value: bigint) {}

  isNull(): boolean {
    return this.value === 0n;
  }

  compare(other: Item | undefined): number {
    if (other === undefined) return this.value === 0n ? 0 : 1;
    if (other instanceof IntItem) {
      return this.value === other.value ? 0 : this.value < other.value ? -1 : 1;
    }
    return 1; // a number is newer than a qualifier or a sublist
  }
}

class StringItem {
  readonly value: string;

  constructor(value: string, followedByDigit: boolean) {
    let normalized = value;
    if (followedByDigit && value.length === 1) {
      normalized = { a: 'alpha', b: 'beta', m: 'milestone' }[value] ?? value;
    }
    this.value = ALIASES[normalized] ?? normalized;
  }

  isNull(): boolean {
    return comparableQualifier(this.value) === RELEASE_INDEX;
  }

  compare(other: Item | undefined): number {
    if (other === undefined) return compareStrings(comparableQualifier(this.value), RELEASE_INDEX);
    if (other instanceof StringItem) {
      return compareStrings(comparableQualifier(this.value), comparableQualifier(other.value));
    }
    return -1; // a qualifier is older than a number or a sublist
  }
}

class ListItem {
  readonly items: Item[] = [];

  isNull(): boolean {
    return this.items.length === 0;
  }

  /** Drop trailing null items, looking through trailing sublists as Maven does. */
  normalize(): void {
    for (let index = this.items.length - 1; index >= 0; index--) {
      const item = this.items[index];
      if (item?.isNull()) this.items.splice(index, 1);
      else if (!(item instanceof ListItem)) break;
    }
  }

  compare(other: Item | undefined): number {
    if (other === undefined) return this.items[0]?.compare(undefined) ?? 0;
    if (other instanceof IntItem) return -1;
    if (other instanceof StringItem) return 1;
    const length = Math.max(this.items.length, other.items.length);
    for (let index = 0; index < length; index++) {
      const left = this.items[index];
      const right = other.items[index];
      const result =
        left === undefined
          ? right === undefined
            ? 0
            : -right.compare(undefined)
          : left.compare(right);
      if (result !== 0) return result;
    }
    return 0;
  }
}

function parseItem(isDigit: boolean, text: string): Item {
  return isDigit ? new IntItem(BigInt(text)) : new StringItem(text, false);
}

function parse(version: string): ListItem {
  const value = version.trim().toLowerCase();
  const root = new ListItem();
  let list = root;
  const stack: ListItem[] = [root];
  let isDigit = false;
  let start = 0;
  const open = (): void => {
    const sublist = new ListItem();
    list.items.push(sublist);
    list = sublist;
    stack.push(sublist);
  };

  for (let index = 0; index < value.length; index++) {
    const char = value.charAt(index);
    if (char === '.' || char === '-') {
      list.items.push(
        index === start ? new IntItem(0n) : parseItem(isDigit, value.slice(start, index)),
      );
      start = index + 1;
      if (char === '-') open();
    } else if (char >= '0' && char <= '9') {
      if (!isDigit && index > start) {
        list.items.push(new StringItem(value.slice(start, index), true));
        start = index;
        open();
      }
      isDigit = true;
    } else {
      if (isDigit && index > start) {
        list.items.push(parseItem(true, value.slice(start, index)));
        start = index;
        open();
      }
      isDigit = false;
    }
  }
  if (value.length > start) list.items.push(parseItem(isDigit, value.slice(start)));

  for (let sublist = stack.pop(); sublist; sublist = stack.pop()) sublist.normalize();
  return root;
}

/** Negative, zero, or positive as `left` sorts before, equal to, or after `right`. */
export function compareMavenVersions(left: string, right: string): number {
  return parse(left).compare(parse(right));
}
