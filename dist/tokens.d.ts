export type Tokens = Pick<Array<string>, 'pop' | 'push' | 'reverse'> & {
    front: () => string;
    empty: () => boolean;
    clone: () => Tokens;
};
export declare class TokenArray extends Array<string> {
    constructor(...params: string[]);
    front(): string;
    empty(): boolean;
    clone(): TokenArray;
}
export declare const createTokenArray: (...params: string[]) => Tokens;
