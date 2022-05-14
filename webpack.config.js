/*global module, __dirname */

module.exports = {
    target: 'node',
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
    },
    output: {
        filename: 'checkmm.js',
        path: __dirname + '/dist',
    },
    devtool: 'source-map',
};
