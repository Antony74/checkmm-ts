import { describe, expect, it } from '@jest/globals';
import { CheckmmState, getCheckmmState, setCheckmmState } from '../src/state';

const checkInitialState = (state: CheckmmState) => {
    expect(state.data).toEqual('');
    expect(state.dataPosition).toEqual(0);
    expect(state.readtokenstofileinclusion).toBeTruthy();
    expect(state.readFile).toBeTruthy();
    expect(state.std).toBeTruthy();
    expect(state.createTokenArray).toBeTruthy();
    expect(state.tokens.empty()).toEqual(true);
    expect(state.constants.size).toEqual(0);
    expect(state.hypotheses.size).toEqual(0);
    expect(state.variables.size).toEqual(0);
    expect(state.assertions.size).toEqual(0);
    expect(state.scopes.length).toEqual(0);
    expect(state.labelused).toBeTruthy();
    expect(state.getfloatinghyp).toBeTruthy();
    expect(state.isactivevariable).toBeTruthy();
    expect(state.isactivehyp).toBeTruthy();
    expect(state.isdvr).toBeTruthy();
    expect(state.ismmws).toBeTruthy();
    expect(state.islabeltoken).toBeTruthy();
    expect(state.ismathsymboltoken).toBeTruthy();
    expect(state.containsonlyupperorq).toBeTruthy();
    expect(state.nexttoken).toBeTruthy();
    expect(state.mmfilenamesalreadyencountered.size).toEqual(0);
    expect(state.readcomment).toBeTruthy();
    expect(state.nexttokenskipcomments).toBeTruthy();
    expect(state.readfileinclusion).toBeTruthy();
    expect(state.readtokens).toBeTruthy();
    expect(state.constructassertion).toBeTruthy();
    expect(state.readexpression).toBeTruthy();
    expect(state.makesubstitution).toBeTruthy();
    expect(state.getproofnumbers).toBeTruthy();
    expect(state.verifyassertionref).toBeTruthy();
    expect(state.verifyregularproof).toBeTruthy();
    expect(state.verifycompressedproof).toBeTruthy();
    expect(state.parsep).toBeTruthy();
    expect(state.parsee).toBeTruthy();
    expect(state.parsea).toBeTruthy();
    expect(state.parsef).toBeTruthy();
    expect(state.parselabel).toBeTruthy();
    expect(state.parsed).toBeTruthy();
    expect(state.parsec).toBeTruthy();
    expect(state.parsev).toBeTruthy();
    expect(state.processtokens).toBeTruthy();
    expect(state.main).toBeTruthy();
};

const makeStateBad = (state: CheckmmState) => {
    state.tokens.push('token');
    state.constants.add('hello');
    state.hypotheses.set('blah', { first: [], second: true });
    state.variables.add('blah');
    state.assertions.set('blah', {
        hypotheses: [],
        disjvars: new Set([{ first: 'hello', second: 'world' }]),
        expression: [],
    });
    state.scopes.push({ activevariables: new Set(), activehyp: [], disjvars: [], floatinghyp: new Map() });
    state.mmfilenamesalreadyencountered.add('blah.mm');
};

describe(`getCheckmmState`, () => {
    it(`returns a *copy* of the state`, () => {
        const state = getCheckmmState();
        checkInitialState(state);
        makeStateBad(state);
        checkInitialState(getCheckmmState());
    });
});

describe(`setCheckmmState`, () => {
    it(`takes a *copy* of the state`, () => {
        let state = getCheckmmState();
        checkInitialState(state);
        setCheckmmState(state);
        makeStateBad(state);
        state = getCheckmmState();
        checkInitialState(state);
    });
});
