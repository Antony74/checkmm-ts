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

export type Queue<T> = {
    pushBack: (t: T) => void;
    popFront: () => T;
    back: () => T;
    front: () => T;
    size: () => number;
    empty: () => boolean;
};

type QueueItem<T> = {
    t: T;
    prev: QueueItem<T> | undefined;
    next: QueueItem<T> | undefined;
};

export const createEmptyQueue = <T>(): Queue<T> => {
    let back: QueueItem<T> | undefined = undefined;
    let front: QueueItem<T> | undefined = undefined;
    let size = 0;

    const queue: Queue<T> = {
        pushBack: (t: T) => {
            const queueItem = { t, prev: undefined, next: back };
            if (back !== undefined) {
                back.prev = queueItem;
            }
            back = queueItem;
            if (front === undefined) {
                front = queueItem;
            }
            ++size;
        },
        popFront: (): T => {
            const result = front;
            if (result === undefined) {
                throw new Error(`popFront called on empty queue`);
            } else {
                front = result.prev;
                if (front === undefined) {
                    back = undefined;
                } else {
                    front.next = undefined;
                }
                --size;
                return result.t;
            }
        },
        back: () => {
            if (back === undefined) {
                throw new Error(`back falled on empty queue`);
            } else {
                return back.t;
            }
        },
        front: () => {
            if (front === undefined) {
                throw new Error(`front called on empty queue`);
            } else {
                return front.t;
            }
        },
        size: () => size,
        empty: () => size === 0,
    };

    return queue;
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
    arraysequal: (arr1: unknown[], arr2: unknown[]) => boolean;
    createstack: <T>(arr?: T[]) => Stack<T>;
}

const std: Std = {
    isupper,
    isalnum,
    set_intersection,
    arraysequal,
    createstack,
};

export default std;
