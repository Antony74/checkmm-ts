export const hackBannerComment = (lines: string[]): string => {
    lines[1] = '// Eric Schmidt (eric41293@comcast.net)';
    lines[8] = '// This is a standalone verifier for Metamath database files,';
    lines[9] = '// written in portable C++. Run it with a single file name as the';
    lines[10] = '// parameter.';
    lines[12] = '';
    lines[13] = '';
    lines[14] = '';
    lines[33] = '';

    const includes = [
        'algorithm',
        'cctype',
        'cstdlib',
        'deque',
        'fstream',
        'iostream',
        'iterator',
        'limits',
        'map',
        'queue',
        'set',
        'string',
        'utility',
        'vector',
    ].map(filename => `#include <${filename}>`);

    return [...lines.filter(line => line.length), '', ...includes].join('\n');
};
