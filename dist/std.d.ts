export interface Pair<T1, T2> {
    first: T1;
    second: T2;
}
export declare class Vector<T> extends Array<T> {
}
export declare class Deque<T> extends Array<T> {
}
export interface Stack<T> {
    push(item: T): void;
    pop(): T | undefined;
    size(): number;
    top(): T;
    truncate(newLength: number): void;
    at(index: number): T;
    toArray(): T[];
}
export interface Std {
    isupper: (s: string) => boolean;
    isalnum: (s: string) => boolean;
    set_intersection: <T>(s1: Set<T>, s2: Set<T>) => Set<T>;
    arraysequal: (arr1: unknown[], arr2: unknown[]) => boolean;
    createstack: <T>(arr?: T[]) => Stack<T>;
}
declare const std: Std;
export default std;
