import fs from 'fs';

// checkmm uses a little bit of C++'s Standard Template Library.  Simulate it.
export namespace std {
    export function isupper(s: string): boolean {
        if (/[^A-Z]/.test(s)) {
            return false;
        } else {
            return true;
        }
    }

    export function isalnum(s: string): boolean {
        if (/[^a-zA-Z0-9]/.test(s)) {
            return false;
        } else {
            return true;
        }
    }

    export function set_intersection<T>(s1: Set<T>, s2: Set<T>): Set<T> {
        const s3 = new Set<T>();
        s1.forEach((value: T) => {
            if (s2.has(value)) {
                s3.add(value);
            }
        });
        return s3;
    }

    export class Pair<T1, T2> {
        first: T1;
        second: T2;
    }

    export class Vector<T> extends Array<T> {}
    export class Queue<T> extends Array<T> {}
    export class Deque<T> extends Array<T> {}
}

export interface istream {
    get(): string;
    good(): boolean;
    unget(): void;
    eof(): boolean;
    fail(): boolean;
}

export class stringstream implements istream {
    private index: number = 0;

    constructor(private data: string) {}

    get(): string {
        const ch = this.data.charAt(this.index);
        ++this.index;
        return ch;
    }

    good(): boolean {
        return true;
    }

    unget(): void {
        --this.index;
    }

    eof(): boolean {
        return this.index >= this.data.length;
    }

    fail(): boolean {
        return false;
    }
}

export class ifstream extends stringstream {
    constructor(filename: string) {
        super(fs.readFileSync(filename, { encoding: 'utf-8' }));
    }
}
