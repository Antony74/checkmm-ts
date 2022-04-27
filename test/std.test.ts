import { it, expect } from '@jest/globals';
import { std } from '../ts/std';

it('can detect upper case', () => {
    expect(std.isupper('Z')).toEqual(true);
    expect(std.isupper('a')).toEqual(false);
});

it('can detect alphanumerics', () => {
    expect(std.isalnum('1')).toEqual(true);
    expect(std.isalnum(')')).toEqual(false);
});
