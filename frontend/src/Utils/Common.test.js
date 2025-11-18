import { compareLsns, getLatestLsn } from './Common';

describe('PostgreSQL LSN Utilities', () => {

    describe('compareLsns()', () => {
        test('should return 0 for identical LSNs', () => {
            expect(compareLsns('0/1A5C', '0/1A5C')).toBe(0);
        });

        test('should correctly identify later LSN based on Offset', () => {
            // Same page (0), different offset (1A0 < 1B0)
            expect(compareLsns('0/1A0', '0/1B0')).toBe(-1);
            expect(compareLsns('0/1B0', '0/1A0')).toBe(1);
        });

        test('should correctly identify later LSN based on Page', () => {
            // Different page (0 < 1)
            expect(compareLsns('0/FFFFFF', '1/000000')).toBe(-1);
            expect(compareLsns('2/0', '1/FFFFFFFF')).toBe(1);
        });

        test('should handle critical Page Boundary correctly', () => {
            // This is the specific case where simple string comparison fails 
            // without padding ("1/..." vs "0/...").
            // 1/0 is chronologically LATER than 0/FFFFFFFF
            expect(compareLsns('1/00000000', '0/FFFFFFFF')).toBe(1);
            expect(compareLsns('0/FFFFFFFF', '1/00000000')).toBe(-1);
        });

        test('should handle variable length hex inputs via padding', () => {
            // 'A' is 10, '10' is 16. So 0/A < 0/10
            expect(compareLsns('0/A', '0/10')).toBe(-1);
            // 0/100 (256) > 0/10 (16)
            expect(compareLsns('0/100', '0/10')).toBe(1);
        });

        test('should throw error on invalid format', () => {
            expect(() => compareLsns('invalid', '0/0')).toThrow();
            expect(() => compareLsns('0/0', '0/0/0')).toThrow();
        });
    });

    describe('getLatestLsn()', () => {
        test('should return empty string if both inputs are empty/null/undefined', () => {
            expect(getLatestLsn(null, null)).toBe(undefined);
            expect(getLatestLsn(undefined, '')).toBe(undefined);
            expect(getLatestLsn('', '')).toBe(undefined);
        });

        test('should return the valid LSN if the other is empty', () => {
            expect(getLatestLsn('0/123', '')).toBe('0/123');
            expect(getLatestLsn(null, '0/456')).toBe('0/456');
            expect(getLatestLsn(undefined, '0/789')).toBe('0/789');
        });

        test('should return the chronologically later LSN when both are valid', () => {
            const earlier = '0/1000';
            const later = '0/2000';
            expect(getLatestLsn(earlier, later)).toBe(later);
            expect(getLatestLsn(later, earlier)).toBe(later);
        });

        test('should handle boundary cases safely', () => {
            const preBoundary = '0/FFFFFFFF';
            const postBoundary = '1/0'; // 1/00000000
            expect(getLatestLsn(preBoundary, postBoundary)).toBe(postBoundary);
        });

        test('should return empty string gracefully if format is invalid', () => {
            // The function catches the error and returns ''
            expect(getLatestLsn('invalid-lsn', '0/123')).toBe(undefined);
        });
    });
});
