import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

// checkmm uses a little bit of C++'s Standard Template Library.  Simulate it.

const isupper = (s: string): boolean => {
    if (/[^A-Z]/.test(s)) {
        return false;
    } else {
        return true;
    }
};

const isalnum = (s: string): boolean => {
    if (/[^a-zA-Z0-9]/.test(s)) {
        return false;
    } else {
        return true;
    }
};

const set_intersection = <T>(s1: Set<T>, s2: Set<T>): Set<T> => {
    const s3 = new Set<T>();
    s1.forEach((value: T) => {
        if (s2.has(value)) {
            s3.add(value);
        }
    });
    return s3;
};

export interface Pair<T1, T2> {
    first: T1;
    second: T2;
}

export class Vector<T> extends Array<T> {}
export class Deque<T> extends Array<T> {}

export interface istream {
    get(): string;
    good(): boolean;
    unget(): void;
    eof(): boolean;
    fail(): boolean;
}

const stringstream = (str: string): istream => {
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

const ifstream = async (filename: string): Promise<istream> => {
    return stringstream(await readFile(filename, { encoding: 'utf-8' }));
};

// Simple function for comparing arrays (in C++ STL handles this automatically)
const arraysequal = (arr1: Array<unknown>, arr2: Array<unknown>): boolean => {
    if (arr1.length !== arr2.length) {
        return false;
    }

    for (let n = 0; n < arr1.length; ++n) {
        if (arr1[n] !== arr2[n]) {
            return false;
        }
    }

    return true;
};

export interface Stack<T> {
    push(item: T): void;
    pop(): T | undefined;
    size(): number;
    top(): T;
    truncate(newLength: number): void;
    at(index: number): T;
    toArray(): T[];
}

const createstack = <T>(arr?: T[]): Stack<T> => {
    let container: T[] = arr ?? [];

    return {
        push: (item: T) => {
            container.push(item);
        },
        pop: (): T | undefined => container.pop(),
        size: () => container.length,
        top: (): T => container[container.length - 1],
        truncate: (newLength: number) => {
            container = container.slice(0, newLength);
        },
        at: (index: number): T => container[index],
        toArray: (): T[] => [...container],
    };
};

export interface Std {
    isupper: (s: string) => boolean;
    isalnum: (s: string) => boolean;
    set_intersection: <T>(s1: Set<T>, s2: Set<T>) => Set<T>;
    stringstream: (str: string) => istream;
    ifstream: (filename: string) => Promise<istream>;
    arraysequal: (arr1: unknown[], arr2: unknown[]) => boolean;
    createstack: <T>(arr?: T[]) => Stack<T>;
}

const std: Std = {
    isupper,
    isalnum,
    set_intersection,
    stringstream,
    ifstream,
    arraysequal,
    createstack,
};

export default std;

