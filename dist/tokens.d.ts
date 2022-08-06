export declare type Tokens = Pick<Array<string>, 'pop' | 'push' | 'reverse'> & {
    front: () => string;
    empty: () => boolean;
};
export declare class TokenArray extends Array<string> {
    constructor(...params: string[]);
    front(): string;
    empty(): boolean;
}
export declare const createTokenArray: (...params: string[]) => Tokens;
