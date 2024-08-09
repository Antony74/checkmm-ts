export type ReverseStoredArray<T> = {
    length: number;
    unshift: (item: T) => void;
    find: Array<T>['findLast'];
    at: (n: number) => T;
    toArray: () => Array<T>;
};

export const createReverseStoredArray = <T>(_arr?: Array<T>): ReverseStoredArray<T> => {
    const arr: Array<T> = _arr ?? [];
    arr.reverse();

    const reverseFilledArray = {
        get length() {
            return arr.length;
        },
        unshift: (item: T) => arr.push(item),
        find: arr.findLast,
        at: (n: number) => arr[arr.length - n - 1],
        toArray: () => {
            const result = [...arr];
            result.reverse();
            return result;
        },
    };

    return reverseFilledArray;
};
