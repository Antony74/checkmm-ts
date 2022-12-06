"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCheckmmState = exports.getCheckmmState = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const checkmm_1 = __importDefault(require("./checkmm"));
const getCheckmmState = () => {
    return Object.assign({}, checkmm_1.default);
};
exports.getCheckmmState = getCheckmmState;
const setCheckmmState = (state) => {
    for (const key in checkmm_1.default) {
        if (state[key] !== undefined) {
            checkmm_1.default[key] = state[key];
        }
    }
};
exports.setCheckmmState = setCheckmmState;
//# sourceMappingURL=state.js.map