"use strict";
// checkmm uses a little bit of C++'s Standard Template Library.  Simulate it.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deque = exports.Vector = void 0;
const isupper = (s) => {
    if (/[^A-Z]/.test(s)) {
        return false;
    }
    else {
        return true;
    }
};
const isalnum = (s) => {
    if (/[^a-zA-Z0-9]/.test(s)) {
        return false;
    }
    else {
        return true;
    }
};
const set_intersection = (s1, s2) => {
    const s3 = new Set();
    s1.forEach((value) => {
        if (s2.has(value)) {
            s3.add(value);
        }
    });
    return s3;
};
class Vector extends Array {
}
exports.Vector = Vector;
class Deque extends Array {
}
exports.Deque = Deque;
// Simple function for comparing arrays (in C++ STL handles this automatically)
const arraysequal = (arr1, arr2) => {
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (let n = 0; n < arr1.length; ++n) {
        if (arr1[n] !== arr2[n]) {
            return false;
        }
    }
    return true;
};
const createstack = (arr) => {
    let container = arr !== null && arr !== void 0 ? arr : [];
    return {
        push: (item) => {
            container.push(item);
        },
        pop: () => container.pop(),
        size: () => container.length,
        top: () => container[container.length - 1],
        truncate: (newLength) => {
            container = container.slice(0, newLength);
        },
        at: (index) => container[index],
        toArray: () => [...container],
    };
};
const std = {
    isupper,
    isalnum,
    set_intersection,
    arraysequal,
    createstack,
};
exports.default = std;
//# sourceMappingURL=std.js.map