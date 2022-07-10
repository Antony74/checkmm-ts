export type Tokens = { pop: () => string | undefined; front: () => string; empty: () => boolean };

class TokenArray extends Array<string> {
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

const createTokenArray = (...params: string[]): Tokens => {
    return new TokenArray(...params);
};

export default {
    get createTokenArray() {return createTokenArray},
};
