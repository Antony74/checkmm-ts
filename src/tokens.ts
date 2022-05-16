export type Tokens = Pick<Array<string>, 'pop' | 'push' | 'reverse'> & { front: () => string; empty: () => boolean };

class TokensImplmentation extends Array<string> {
    constructor(...params: string[]) {
        super(...params);
    }
    front(): string {
        return this[this.length - 1];
    }
    empty(): boolean {
        return !this.length;
    }
}

let createTokens = (...params: string[]): Tokens => {
    return new TokensImplmentation(...params);
};

export default {
    createTokens,
    setCreateTokens: (_createTokens: (...params: string[]) => Tokens) => {
        createTokens = _createTokens;
    },
};
