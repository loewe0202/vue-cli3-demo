/* jshint esversion: 8 */
const path = require('path');
const webpack = require('webpack');
const resolve = dir => path.join(__dirname, dir);
const UglifyPlugin = require('uglifyjs-webpack-plugin');
const autoprefixer = require('autoprefixer');
const pxtorem = require('postcss-pxtorem');
const IS_PROD = ['production', 'prod'].includes(process.env.NODE_ENV);

module.exports = {
  publicPath: process.env.VUE_APP_PUBLIC_PATH, // 部署应用包时的基本路径
  outputDir: process.env.outputDir, // 输出文件目录
  lintOnSave: true, // eslint-loader 是否在保存的时候检查
  runtimeCompiler: true, // 是否使用包含运行时编译器的 Vue 构建版本
  productionSourceMap: !IS_PROD, // 生产环境是否生成 sourceMap 文件
  parallel: require('os').cpus().length > 1, // 是否为 Babel 或 TypeScript 使用 thread-loader。该选项在系统的 CPU 有多于一个内核时自动启用，仅作用于生产构建。
  pwa: {}, // PWA 插件相关配置
  // webpack配置
  chainWebpack: config => {
    if (process.env.npm_config_report) {
      config
        .plugin('webpack-bundle-analyzer')
        .use(require('webpack-bundle-analyzer').BundleAnalyzerPlugin)
        .end();
    }
    // 移除 prefetch 插件
    config.plugins.delete('prefetch');
    // 移除 preload 插件
    config.plugins.delete('preload');

    config.plugin('ignore').use(new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)); //忽略/moment/locale下的所有文
  },
  configureWebpack: config => {
    let optimization = {
      runtimeChunk: {
        name: 'manifest',
      },
      splitChunks: {
        chunks: 'async', //默认只作用于异步模块，为`all`时对所有模块生效,`initial`对同步模块有效
        minSize: 30000,
        cacheGroups: {
          vue: {
            name: 'vue',
            test: /[\\/]node_modules[\\/]vue/,
            chunks: 'initial',
            reuseExistingChunk: true,
            enforce: true,
            priority: 100,
          },
          moment: {
            name: 'moment',
            test: /[\\/]node_modules[\\/]moment/,
            chunks: 'initial',
            reuseExistingChunk: true,
            enforce: true,
            priority: 90,
          },
          vendors: {
            name: 'vendors',
            test: /[\\/]node_modules[\\/]/, // 指定是node_modules下的第三方包
            chunks: 'initial',
            reuseExistingChunk: true,
            enforce: true,
            priority: -10, // 抽取优先级
          },
          // 抽离自定义工具库
          common: {
            name: 'common',
            minChunks: 2, // 表示将引用模块如不同文件引用了多少次，才能分离生成新chunk
            priority: -20,
            chunks: 'all',
            reuseExistingChunk: true,
          },
        },
      },
    };
    let plugins = [...config.plugins];
    if (IS_PROD) {
      // 为生产环境修改配置...
      config.mode = 'production';
      config.output.filename = 'js/[name].[contenthash:10].js';
      config.output.chunkFilename = 'js/[id].[contenthash:10].js';
      // 将每个依赖包打包成单独的js文件
      optimization.minimizer = [
        new UglifyPlugin({
          uglifyOptions: {
            warnings: false,
            mangle: true,
            compress: {
              drop_console: true, // console
              drop_debugger: true,
              pure_funcs: ['console.log'], // 移除console
            },
            output: {
              comments: false,
            },
            toplevel: false,
            ie8: false,
          },
        }),
      ];
    } else {
      // 为开发环境修改配置...
      config.mode = 'development';
      config.output.filename = 'js/[name].[hash:10].js';
      config.output.chunkFilename = 'js/[id].[hash:10].js';
      config.devtool = 'source-map';
    }
    Object.assign(config, {
      // 开发生产共同配置
      optimization,
      plugins: [
        ...plugins,
        new webpack.DefinePlugin({
          //全局配置变量,直接使用
          storageExpire: 24,
        }),
      ],
      resolve: {
        alias: {
          '@': resolve('src'),
          '@assets': resolve('src/assets'),
          '@scss': resolve('src/assets/scss'),
          '@components': resolve('src/components'),
          '@plugins': resolve('src/plugins'),
          '@utils': resolve('src/utils'),
          '@views': resolve('src/views'),
          '@router': resolve('src/router'),
          '@store': resolve('src/store'),
          '@layouts': resolve('src/layouts'),
          '@static': resolve('src/static'),
        }, // 别名配置
      },
    });
  },
  // css相关配置
  css: {
    extract: {
      filename: 'css/[name].[contenthash:10].css',
      chunkFilename: 'css/[name].[contenthash:10].css',
      ignoreOrder: true,
    }, // 是否使用css分离插件 ExtractTextPlugin
    sourceMap: false, // 开启 CSS source maps?
    loaderOptions: {
      css: {}, // 这里的选项会传递给 css-loader
      postcss: {
        plugins: [
          autoprefixer(),
          pxtorem({
            rootValue: 100,
            minPixelValue: 2,
            propList: ['*'],
          }),
        ],
      }, // 这里的选项会传递给 postcss-loader
      // sass: {
      //   data: `@import "~@scss/fn.scss";`,
      // },
    }, // css预设器配置项
    modules: false, // 启用 CSS modules for all css / pre-processor files.
  },
  // webpack-dev-server 相关配置
  devServer: {
    open: true,
    disableHostCheck: true,
    host: '0.0.0.0', // 允许外部ip访问
    port: 8090, // 端口
    https: false, // 启用https
    overlay: {
      warnings: true,
      errors: true,
    }, // 错误、警告在页面弹出
  },
  // 第三方插件配置
  pluginOptions: {},
};
