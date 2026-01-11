import {
    MetricsAggregator,
    MetricRating,
} from '../../src/core/MetricsAggregator';

describe('MetricsAggregator', () => {
    describe('getComplexityRating', () => {
        it('should return A for low complexity', () => {
            expect(MetricsAggregator.getComplexityRating(3)).toBe('A');
            expect(MetricsAggregator.getComplexityRating(5)).toBe('A');
        });

        it('should return B for moderate complexity', () => {
            expect(MetricsAggregator.getComplexityRating(6)).toBe('B');
            expect(MetricsAggregator.getComplexityRating(10)).toBe('B');
        });

        it('should return C for medium-high complexity', () => {
            expect(MetricsAggregator.getComplexityRating(12)).toBe('C');
            expect(MetricsAggregator.getComplexityRating(15)).toBe('C');
        });

        it('should return D for high complexity', () => {
            expect(MetricsAggregator.getComplexityRating(18)).toBe('D');
            expect(MetricsAggregator.getComplexityRating(20)).toBe('D');
        });

        it('should return E for very high complexity', () => {
            expect(MetricsAggregator.getComplexityRating(25)).toBe('E');
        });
    });

    describe('getMaintainabilityRating', () => {
        it('should return A for low debt ratio', () => {
            expect(MetricsAggregator.getMaintainabilityRating(3)).toBe('A');
            expect(MetricsAggregator.getMaintainabilityRating(5)).toBe('A');
        });

        it('should return B for moderate debt ratio', () => {
            expect(MetricsAggregator.getMaintainabilityRating(8)).toBe('B');
        });

        it('should return E for high debt ratio', () => {
            expect(MetricsAggregator.getMaintainabilityRating(60)).toBe('E');
        });
    });

    describe('getReliabilityRating', () => {
        it('should return A for zero bugs', () => {
            expect(MetricsAggregator.getReliabilityRating(0)).toBe('A');
        });

        it('should return B for 1-2 bugs', () => {
            expect(MetricsAggregator.getReliabilityRating(1)).toBe('B');
            expect(MetricsAggregator.getReliabilityRating(2)).toBe('B');
        });

        it('should return E for many bugs', () => {
            expect(MetricsAggregator.getReliabilityRating(15)).toBe('E');
        });
    });

    describe('getSecurityRating', () => {
        it('should return A for zero vulnerabilities', () => {
            expect(MetricsAggregator.getSecurityRating(0)).toBe('A');
        });

        it('should return B for 1 vulnerability', () => {
            expect(MetricsAggregator.getSecurityRating(1)).toBe('B');
        });

        it('should return E for many vulnerabilities', () => {
            expect(MetricsAggregator.getSecurityRating(10)).toBe('E');
        });
    });

    describe('formatDuration', () => {
        it('should format minutes only', () => {
            expect(MetricsAggregator.formatDuration(30)).toBe('30min');
        });

        it('should format hours only', () => {
            expect(MetricsAggregator.formatDuration(120)).toBe('2h');
        });

        it('should format hours and minutes', () => {
            expect(MetricsAggregator.formatDuration(150)).toBe('2h 30min');
        });
    });

    describe('getFileComplexityRating', () => {
        it('should return A for 7 or fewer flows', () => {
            expect(MetricsAggregator.getFileComplexityRating(5)).toBe('A');
            expect(MetricsAggregator.getFileComplexityRating(7)).toBe('A');
        });

        it('should return B for 8-14 flows', () => {
            expect(MetricsAggregator.getFileComplexityRating(8)).toBe('B');
            expect(MetricsAggregator.getFileComplexityRating(14)).toBe('B');
        });

        it('should return C for 15-21 flows', () => {
            expect(MetricsAggregator.getFileComplexityRating(15)).toBe('C');
        });
    });
});
