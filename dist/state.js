"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetState = exports.setCheckmmState = exports.getCheckmmState = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const checkmm_1 = __importDefault(require("./checkmm"));
const getCheckmmState = () => {
    return {
        ...checkmm_1.default,
        tokens: checkmm_1.default.tokens.clone(),
        constants: new Set(checkmm_1.default.constants),
        hypotheses: new Map(checkmm_1.default.hypotheses),
        variables: new Set(checkmm_1.default.variables),
        assertions: new Map(checkmm_1.default.assertions),
        scopes: [...checkmm_1.default.scopes],
        mmfilenamesalreadyencountered: new Set(checkmm_1.default.mmfilenamesalreadyencountered),
    };
};
exports.getCheckmmState = getCheckmmState;
const setCheckmmState = (state) => {
    for (const key in checkmm_1.default) {
        if (state[key] !== undefined) {
            checkmm_1.default[key] = state[key];
        }
    }
    const { tokens, constants, hypotheses, variables, assertions, scopes, mmfilenamesalreadyencountered } = state;
    if (tokens) {
        checkmm_1.default.tokens = tokens.clone();
    }
    if (constants) {
        checkmm_1.default.constants = new Set(constants);
    }
    if (hypotheses) {
        checkmm_1.default.hypotheses = new Map(hypotheses);
    }
    if (variables) {
        checkmm_1.default.variables = new Set(variables);
    }
    if (assertions) {
        checkmm_1.default.assertions = new Map(assertions);
    }
    if (scopes) {
        checkmm_1.default.scopes = [...scopes];
    }
    if (mmfilenamesalreadyencountered) {
        checkmm_1.default.mmfilenamesalreadyencountered = new Set(mmfilenamesalreadyencountered);
    }
};
exports.setCheckmmState = setCheckmmState;
const initialState = (0, exports.getCheckmmState)();
const resetState = () => {
    (0, exports.setCheckmmState)(initialState);
};
exports.resetState = resetState;
//# sourceMappingURL=state.js.map