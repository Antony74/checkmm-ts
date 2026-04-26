#!/usr/bin/env node
/*global require*/
/* eslint-disable @typescript-eslint/no-require-imports */
const filename = './dist/checkmm.js';
let found = false;

try {
    require.resolve(filename);
    found = true;
} catch (_e) {
    // continue and handle error below
}

const api = found ? require(filename) : require('checkmm');

api.default.fsp = require('fs/promises');
api.default.path = require('path');
