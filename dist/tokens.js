"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTokenArray = exports.TokenArray = void 0;
class TokenArray extends Array {
    constructor(...params) {
        super(...params);
    }
    front() {
        return this[this.length - 1];
    }
    empty() {
        return !this.length;
    }
}
exports.TokenArray = TokenArray;
const createTokenArray = (...params) => {
    return new TokenArray(...params);
};
exports.createTokenArray = createTokenArray;
//# sourceMappingURL=tokens.js.map