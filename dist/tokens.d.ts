export declare type Tokens = Pick<Array<string>, 'pop' | 'push' | 'reverse'> & {
    front: () => string;
    empty: () => boolean;
};
export declare const createTokenArray: (...params: string[]) => Tokens;
