import fs from 'fs';

// checkmm uses a little bit of C++'s Standard Template Library.  Simulate it.

export let isupper = (s: string): boolean => {
    if (/[^A-Z]/.test(s)) {
        return false;
    } else {
        return true;
    }
};

export let isalnum = (s: string): boolean => {
    if (/[^a-zA-Z0-9]/.test(s)) {
        return false;
    } else {
        return true;
    }
};

export let set_intersection = <T>(s1: Set<T>, s2: Set<T>): Set<T> => {
    const s3 = new Set<T>();
    s1.forEach((value: T) => {
        if (s2.has(value)) {
            s3.add(value);
        }
    });
    return s3;
};

export class Pair<T1, T2> {
    first: T1;
    second: T2;
}

export class Vector<T> extends Array<T> {}
export class Queue<T> extends Array<T> {}
export class Deque<T> extends Array<T> {}

export interface istream {
    get(): string;
    good(): boolean;
    unget(): void;
    eof(): boolean;
    fail(): boolean;
}

export let stringstream = (str: string): istream => {
    let index = 0;

    const stream: istream = {
        get: (): string => {
            const ch = str.charAt(index);
            ++index;
            return ch;
        },
        good: (): boolean => true,
        unget: (): void => {
            --index;
        },
        eof: (): boolean => index >= stringstream.length,
        fail: (): boolean => false,
    };

    return stream;
};

export let ifstream = (filename: string): istream => {
    return stringstream(fs.readFileSync(filename, {encoding: 'utf-8'}))
}

