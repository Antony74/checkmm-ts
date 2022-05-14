#!/usr/bin/env node
/*global require*/
const filename = './dist/checkmm.js';
let found = false;

try {
    require.resolve(filename);
    found = true;
} catch (_e) {}

if (found) {
    require(filename);
} else {
    require('checkmm');
}
