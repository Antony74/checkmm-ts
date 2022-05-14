#!/usr/bin/env node
/*global require*/
const filename = '../checkmm/dist/checkmm.js';
let found = false;

try {
    require.resolve('../checkmm/dist/checkmm.js');
    found = true;
} catch (_e) {}

if (found) {
    require(filename);
} else {
    require('./dist/checkmm.js');
}
