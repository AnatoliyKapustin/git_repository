import webpack from 'webpack';
import path from 'path';
// const ExtractTextPlugin = require('extract-text-webpack-plugin');
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import ScriptExtHtmlWebpackPlugin from 'script-ext-html-webpack-plugin';
import UglifyJSPlugin from 'uglifyjs-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';

// import sassThreadLoader from 'thread-loader';
//
// sassThreadLoader.warmup({workerParallelJobs: 2}, ['sass-loader', 'css-loader', 'style-loader', 'babel-loader']);

// replace localhost with 0.0.0.0 if you want to access
// your app from wifi or a virtual machine
const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 3000;
const sourcePath = path.join(__dirname, 'src');
const prodHtmlTemplate = path.join(__dirname, 'src/index.prod.ejs');
const devHtmlTemplate = path.join(__dirname, 'src/index.dev.ejs');
const publicDir = path.join(__dirname, 'public/images');
const buildDirectory = path.join(__dirname, 'build');

const stats = {
    assets: true,
    children: false,
    chunks: false,
    hash: false,
    modules: false,
    publicPath: false,
    timings: true,
    version: false,
    warnings: true,
    colors: {
        green: '\u001b[32m',
    },
};

module.exports = function (env) {
    const nodeEnv = env && env.prod ? 'production' : 'development';
    const isProd = nodeEnv === 'production';

    const htmlTemplate = isProd ? prodHtmlTemplate : devHtmlTemplate;

    let cssLoader;
    let cssLoaderForNodeModules;

    const plugins = [

        new CopyWebpackPlugin([
            {
                from: publicDir,
                to: path.join(buildDirectory, "static"),
                force: true
            }
        ]),

        new webpack.optimize.CommonsChunkPlugin({
            async: true,
            children: true,
            minChunks: 2,
        }),

        // setting production environment will strip out
        // some of the development code from the app
        // and libraries
        new webpack.DefinePlugin({
            'process.env': {NODE_ENV: JSON.stringify(nodeEnv)},
        }),

        // create index.html
        new HtmlWebpackPlugin({
            template: htmlTemplate,
            inject: true,
            production: isProd,
            preload: ['*.css'],
            minify: isProd && {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true,
            },
        }),

        // make sure script tags are async to avoid blocking html render
        new ScriptExtHtmlWebpackPlugin({
            defaultAttribute: 'async',
            preload: {
                test: /^0-|^main-|^style-.*$/,
                chunks: 'all',
            },
        }),
    ];

    if (isProd) {
        console.log('===========>Prod environment config')
        plugins.push(
            // create css bundle
            new ExtractTextPlugin('style-[contenthash:8].css'),
            // minify remove some of the dead code
            new UglifyJSPlugin({
                compress: {
                    warnings: false,
                    screw_ie8: true,
                    conditionals: true,
                    unused: true,
                    comparisons: true,
                    sequences: true,
                    dead_code: true,
                    evaluate: true,
                    if_return: true,
                    join_vars: true,
                },
            })
        );

        cssLoader = ExtractTextPlugin.extract({
            fallback: 'style-loader',
            test: /\.css$/,
            use: [
                'cache-loader',
                {
                    loader: 'thread-loader',
                    options: {
                        workerParallelJobs: 2,
                    },
                },
                {
                    loader: 'css-loader',
                    options: {
                        module: true, // css-loader 0.14.5 compatible
                        modules: true,
                        importLoaders: 1,
                        localIdentName: '[hash:base64:5]',
                    },
                },
                {
                    loader: 'postcss-loader',
                    options: {
                        ident: 'postcss',
                        plugins: (loader) => [
                            require('postcss-import')({ root: loader.resourcePath }),
                            require('postcss-cssnext')(),
                            require('autoprefixer')(),
                            require('cssnano')()
                        ]
                    }
                },
                {
                    loader: 'sass-loader',
                    options: {
                        outputStyle: 'collapsed',
                        sourceMap: true,
                        includePaths: [sourcePath],
                    },
                },
            ],
        });

        cssLoaderForNodeModules = ExtractTextPlugin.extract({
            fallback: 'style-loader',
            test: /\.css$/,
            use: [
                'cache-loader',
                {
                    loader: 'thread-loader',
                    options: {
                        workerParallelJobs: 2,
                    },
                },
                {
                    loader: 'css-loader',
                    options: {
                        modules: true,
                        importLoaders: 1,
                    },
                },
                {
                    loader: 'postcss-loader',
                    options: {
                        ident: 'postcss',
                        plugins: (loader) => [
                            require('postcss-import')({ root: loader.resourcePath }),
                            require('postcss-cssnext')(),
                            require('autoprefixer')(),
                            require('cssnano')()
                        ]
                    }
                },
                {
                    loader: 'sass-loader',
                    options: {
                        outputStyle: 'collapsed',
                        sourceMap: true,
                        includePaths: [sourcePath],
                    },
                },
            ],
        });
    } else {
        plugins.push(
            // make hot reloading work
            new webpack.HotModuleReplacementPlugin(),
            // show module names instead of numbers in webpack stats
            new webpack.NamedModulesPlugin(),
            // don't spit out any errors in compiled assets
            new webpack.NoEmitOnErrorsPlugin()
            // load DLL files
            /* eslint-disable global-require */
            // new webpack.DllReferencePlugin({
            //     context: __dirname,
            //     manifest: require('./dll/libs-manifest.json')
            // }),
            /* eslint-enable global-require */

            // make DLL assets available for the app to download
            // new AddAssetHtmlPlugin([{filepath: require.resolve('./dll/libs.dll.js')}])
        );

        cssLoader = [
            // cache css output for faster rebuilds
            'cache-loader',
            {
                // build css/sass in threads (faster)
                loader: 'thread-loader',
                options: {
                    workerParallelJobs: 2,
                },
            },
            {
                loader: 'style-loader'
            },
            {
                loader: 'css-loader',
                options: {
                    importLoaders: 0, // 0 => no loaders (default); 1 => postcss-loader; 2 => postcss-loader, sass-loader
                    modules: true,
                    localIdentName: '[name]-[local]',
                },
            },
            {
                loader: 'sass-loader',
                options: {
                    outputStyle: 'expanded',
                    sourceMap: false,
                    includePaths: [sourcePath],
                },
            },
            {
                loader: 'postcss-loader',
                options: {
                    ident: 'postcss',
                    plugins: (loader) => [
                        require('postcss-import')({ root: loader.resourcePath }),
                        require('postcss-cssnext')(),
                        require('cssnano')()
                    ]
                }
            }
        ];

        cssLoaderForNodeModules = [
            // cache css output for faster rebuilds
            'cache-loader',
            {
                // build css/sass in threads (faster)
                loader: 'thread-loader',
                options: {
                    workerParallelJobs: 2,
                },
            },
            {
                loader: 'style-loader'
            },
            {
                loader: 'css-loader',
                options: {
                    modules: true,
                    localIdentName: '[local]',
                },
            },
            {
                loader: 'sass-loader',
                options: {
                    outputStyle: 'expanded',
                    sourceMap: false,
                    includePaths: [sourcePath],
                },
            },
            {
                loader: 'postcss-loader',
                options: {
                    ident: 'postcss',
                    plugins: (loader) => [
                        require('postcss-import')({ root: loader.resourcePath }),
                        require('postcss-cssnext')(),
                        require('cssnano')()
                    ]
                }
            }
        ]
    }

    const entryPoint = isProd
        ? './index.js'
        : [
            // activate HMR for React
            'react-hot-loader/patch',

            // bundle the client for webpack-dev-server
            // and connect to the provided endpoint
            `webpack-dev-server/client?http://${host}:${port}`,

            // bundle the client for hot reloading
            // only- means to only hot reload for successful updates
            'webpack/hot/only-dev-server',

            // the entry point of our app
            './index.js',
        ];

    return {
        devtool: isProd ? 'cheap-source-map' : 'source-map',
        context: sourcePath,
        entry: {
            polyfill: 'babel-polyfill',
            main: entryPoint
        },
        output: {
            path: buildDirectory,
            publicPath: '/',
            filename: '[name]-[hash:8].js',
            chunkFilename: '[name]-[chunkhash:8].js',
        },
        module: {
            rules: [
                {
                    test: /\.(html|svg|jpe?g|png|ttf|woff2?)$/,
                    include: [sourcePath, publicDir],
                    use: {
                        loader: 'url-loader',
                        options: {
                            name: 'static/[name]-[hash:8].[ext]',
                        },
                    },
                },
                {
                    test: /\.(css|scss)$/,
                    include: path.join(__dirname, 'node_modules'),
                    use: cssLoaderForNodeModules,
                },
                {
                    test: /\.(css|scss)$/,
                    include: sourcePath,
                    use: cssLoader,
                },
                {
                    test: /\.(js|jsx)$/,
                    include: sourcePath,
                    use: [
                        {
                            loader: 'thread-loader',
                            options: {
                                workerParallelJobs: 2,
                            },
                        },
                        'babel-loader',
                    ],
                },
            ],
        },
        resolve: {
            extensions: ['.webpack-loader.js', '.web-loader.js', '.loader.js', '.js', '.scss', '.css'],
            modules: [path.resolve(__dirname, 'node_modules'), sourcePath],
            symlinks: false,
        },

        plugins,

        performance: isProd && {
            maxAssetSize: 300000,
            maxEntrypointSize: 300000,
            hints: 'warning',
        },

        stats: stats,

        devServer: {
            contentBase: 'build',
            publicPath: '/',
            historyApiFallback: true,
            port: port,
            host: host,
            hot: !isProd,
            compress: isProd,
            stats: stats,
        },
    };
};