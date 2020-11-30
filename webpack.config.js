const path = require("path");
const webpack = require('webpack');

var fs = require('fs');
var nodeModules = {};
fs.readdirSync('node_modules')
    .filter(function(x) {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach(function(mod) {
        nodeModules[mod] = 'commonjs ' + mod;
    });

module.exports = {
    entry: './src/bin/cloud-cli.js',
    output: {
        path: path.join(__dirname, 'dist/tcli/'),
        filename: 'main.js'
    },
    target: 'node',
    mode: 'production',
    externals: nodeModules,
    plugins: [
        new webpack.BannerPlugin({banner: '#!/usr/bin/env node', raw: true})
    ]
}
