// checkmm uses a little bit of C++'s Standard Template Library.  Simulate it.

let isupper = (s: string): boolean => {
    if (/[^A-Z]/.test(s)) {
        return false;
    } else {
        return true;
    }
};

let isalnum = (s: string): boolean => {
    if (/[^a-zA-Z0-9]/.test(s)) {
        return false;
    } else {
        return true;
    }
};

let set_intersection = <T>(s1: Set<T>, s2: Set<T>): Set<T> => {
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

// Simple function for comparing arrays (in C++ STL handles this automatically)
let arraysequal = (arr1: Array<unknown>, arr2: Array<unknown>): boolean => {
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

let createStack = <T>(arr?: T[]): Stack<T> => {
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

export default {
    isupper,
    setIsupper: (_isupper: (s: string) => boolean) => {
        isupper = _isupper;
    },
    isalnum,
    setIsalum: (_isalum: (s: string) => boolean) => {
        isalnum = _isalum;
    },
    set_intersection,
    setSet_intersection: (_set_intersection: <T>(s1: Set<T>, s2: Set<T>) => Set<T>) => {
        set_intersection = _set_intersection;
    },
    arraysequal,
    setArraysequal: (_arraysequal: (arr1: unknown[], arr2: unknown[]) => boolean) => {
        arraysequal = _arraysequal;
    },
    createStack,
    setCreateStack: (_createStack: <T>() => T) => {
        createStack = _createStack;
    },
};
