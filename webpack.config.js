/*global module, __dirname */

module.exports = {
    entry: './src/checkmm.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {
            path: false,
            fs: false,
            util: false,
        },
    },
    output: {
        filename: 'checkmm.js',
        path: __dirname,
    },
};
