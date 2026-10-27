import { compareMavenVersions, isMavenVersion } from '../../src/core/MavenVersion';

/**
 * Vectors from Maven's own ComparableVersionTest (maven-artifact), in
 * ascending order. Every earlier entry must sort before every later one.
 */
const VERSIONS_QUALIFIER = [
  '1-alpha2snapshot',
  '1-alpha2',
  '1-alpha-123',
  '1-beta-2',
  '1-beta123',
  '1-m2',
  '1-m11',
  '1-rc',
  '1-cr2',
  '1-rc123',
  '1-SNAPSHOT',
  '1',
  '1-sp',
  '1-sp2',
  '1-sp123',
  '1-abc',
  '1-def',
  '1-pom-1',
  '1-1-snapshot',
  '1-1',
  '1-2',
  '1-123',
];

const VERSIONS_NUMBER = [
  '2.0',
  '2-1',
  '2.0.a',
  '2.0.0.a',
  '2.0.2',
  '2.0.123',
  '2.1.0',
  '2.1-a',
  '2.1b',
  '2.1-c',
  '2.1-1',
  '2.1.0.1',
  '2.2',
  '2.123',
  '11.a2',
  '11.a11',
  '11.b2',
  '11.b11',
  '11.m2',
  '11.m11',
  '11',
  '11.a',
  '11b',
  '11c',
  '11m',
];

const ascendingPairs = (versions: string[]) =>
  versions.flatMap((lower, index) => versions.slice(index + 1).map((higher) => [lower, higher]));

describe('compareMavenVersions (Maven ComparableVersionTest vectors)', () => {
  it.each(ascendingPairs(VERSIONS_QUALIFIER))('qualifier order: %s < %s', (lower, higher) => {
    expect(compareMavenVersions(lower, higher)).toBeLessThan(0);
    expect(compareMavenVersions(higher, lower)).toBeGreaterThan(0);
  });

  it.each(ascendingPairs(VERSIONS_NUMBER))('number order: %s < %s', (lower, higher) => {
    expect(compareMavenVersions(lower, higher)).toBeLessThan(0);
    expect(compareMavenVersions(higher, lower)).toBeGreaterThan(0);
  });

  it.each([
    ['1', '1'],
    ['1', '1.0'],
    ['1', '1.0.0'],
    ['1.0', '1.0.0'],
    ['1', '1-0'],
    ['1', '1.0-0'],
    ['1.0', '1.0-0'],
    ['1a', '1-a'],
    ['1a', '1.0-a'],
    ['1a', '1.0.0-a'],
    ['1.0a', '1-a'],
    ['1.0.0a', '1-a'],
    ['1x', '1-x'],
    ['1x', '1.0-x'],
    ['1x', '1.0.0-x'],
    ['1.0x', '1-x'],
    ['1.0.0x', '1-x'],
    ['1ga', '1'],
    ['1release', '1'],
    ['1final', '1'],
    ['1cr', '1rc'],
    ['1a1', '1-alpha-1'],
    ['1b2', '1-beta-2'],
    ['1m3', '1-milestone-3'],
    ['1X', '1x'],
    ['1A', '1a'],
    ['1B', '1b'],
    ['1M', '1m'],
    ['1Ga', '1'],
    ['1GA', '1'],
    ['1RELEASE', '1'],
    ['1RELeaSE', '1'],
    ['1Final', '1'],
    ['1FinaL', '1'],
    ['1FINAL', '1'],
    ['1Cr', '1Rc'],
    ['1cR', '1rC'],
    ['1m3', '1Milestone3'],
    ['1m3', '1MileStone3'],
    ['1m3', '1MILESTONE3'],
  ])('equal: %s == %s', (left, right) => {
    expect(compareMavenVersions(left, right)).toBe(0);
    expect(compareMavenVersions(right, left)).toBe(0);
  });

  it('compares every qualifier component, not only the first', () => {
    expect(compareMavenVersions('3.1.0-rc1-1', '3.1.0-rc1-2')).toBeLessThan(0);
    expect(compareMavenVersions('3.1.0-rc1', '3.1.0')).toBeLessThan(0);
    expect(compareMavenVersions('3.1.0-SNAPSHOT', '3.1.0')).toBeLessThan(0);
    expect(compareMavenVersions('3.1.0-1', '3.1.0')).toBeGreaterThan(0);
  });

  it('compares numbers beyond the safe integer range exactly', () => {
    expect(compareMavenVersions('1.0-9007199254740993', '1.0-9007199254740994')).toBeLessThan(0);
  });
});

describe('isMavenVersion', () => {
  it.each(['3.1.0', '3.1.0-SNAPSHOT', '3.1.0-rc1-1', '2.3.18', '1'])('accepts %s', (value) => {
    expect(isMavenVersion(value)).toBe(true);
  });

  it.each(['', 'latest', '${munit.version}', 's3cr3t-value', '3.1.0 extra', '3..1'])(
    'rejects %s',
    (value) => {
      expect(isMavenVersion(value)).toBe(false);
    },
  );
});
