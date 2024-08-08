import { describe, expect, it } from '@jest/globals';
import std, { createEmptyQueue } from '../src/std';

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

describe('Queue', () => {
    it('can create an empty queue', () => {
        const q = createEmptyQueue<string>();
        expect(q.size()).toEqual(0);
    });

    it('can pushBack to an empty queue', () => {
        const q = createEmptyQueue<string>();
        q.pushBack('Hello there');
        expect(q.size()).toEqual(1);
        expect(q.front()).toEqual('Hello there');
        expect(q.back()).toEqual('Hello there');
    });

    it('can popFront a one item queue', () => {
        const q = createEmptyQueue<string>();
        q.pushBack('Hello there');
        const result = q.popFront();
        expect(q.size()).toEqual(0);
        expect(result).toEqual('Hello there');
    });

    it('can popFront a two item queue', () => {
        const q = createEmptyQueue<string>();
        q.pushBack('Hello there');
        q.pushBack('General Kenobi');
        const result = q.popFront();
        expect(q.size()).toEqual(1);
        expect(result).toEqual('Hello there');
        expect(q.front()).toEqual('General Kenobi');
        expect(q.back()).toEqual('General Kenobi');
    });
});
