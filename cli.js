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

if (found) {
    require(filename);
} else {
    require('checkmm');
}
