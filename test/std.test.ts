import { it, expect, describe } from '@jest/globals';
import std from '../ts/std';

describe('isupper', () => {
    it('can detect upper case', () => {
        expect(std.isupper('Z')).toEqual(true);
        expect(std.isupper('a')).toEqual(false);
    });
});

describe('isalnum', () => {
    it('can detect alphanumerics', () => {
        expect(std.isalnum('1')).toEqual(true);
        expect(std.isalnum(')')).toEqual(false);
    });
});
