export type Tokens = Pick<Array<string>, 'pop' | 'push' | 'reverse'> & {
    front: () => string;
    empty: () => boolean;
    clone: () => Tokens;
};

export class TokenArray extends Array<string> {
    constructor(...params: string[]) {
        super(...params);
    }
    front(): string {
        return this[this.length - 1];
    }
    empty(): boolean {
        return !this.length;
    }
    clone(): TokenArray {
        return new TokenArray(...this);
    }
}

export const createTokenArray = (...params: string[]): Tokens => {
    return new TokenArray(...params);
};
