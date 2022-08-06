export type Tokens = Pick<Array<string>, 'pop' | 'push' | 'reverse'> & { front: () => string; empty: () => boolean };

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
}

export const createTokenArray = (...params: string[]): Tokens => {
    return new TokenArray(...params);
};

