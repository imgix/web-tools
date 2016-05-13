ar path = require('path'),
    _ = require('lodash');

module.exports = function(task, args) {
  var name = 'imgix-app',
      ngName = 'imgix.app',
      appBase = '.',

      // Server numbers count up from here, per-environment
      baseServerPort = 9870,

      // Template for banner that goes atop all compiled assets
      banner = '/* ' + name + ' - Built: ' + Date.now() + ' */\n',
      allEnvs = ['dev', 'test', 'prod'],
      env,
      isProd,
      appSrcBase,
      appTestBase,
      appDestBase;

  // Set environment based on task and args passed in
  if (/^test/.test(task)) {
    env = 'test';
  } else if (args.env && _.includes(allEnvs, args.env)) {
    env = args.test;
  } else {
    env = 'dev';
  }

  isProd = (env === 'prod');

  // Base paths for src and dest files
  appSrcBase = path.join(appBase, 'app');
  appDestBase = path.join(appBase, '.' + env + '_srv');
  appTestBase = path.join(appBase, 'test');

  return {
    name: name,
    ngModule: ngName,
    destPath: appDestBase,

    // The components object tells web-tools which gulp tasks to set up and how
    appAssets: {
        js: {
            src: [
                path.join(appSrcBase, 'base', '**', '*.js'),
                path.join(appSrcBase, '**', '*.js'),
                '!' + path.join('**', 'test.*.js'),
                '!' + path.join('**', 'test-data.*.js')
              ],
            dest: path.join(appDestBase, 'scripts'),
            build: true,
            buildOptions: {
                doMinify: isProd,
                doConcat: isProd,
                doBanner: isProd,
                doVersioning: isProd,
                doSourceMaps: isProd,
                concatName: name + '.js',
                banner: banner
              }
          },
        templates: {
            src: [
                path.join(appSrcBase, '**', '*.tmpl')
              ],
            dest: path.join(appDestBase, 'scripts'),
            build: true,
            buildOptions: {
                doMinify: isProd,
                doConcat: isProd,
                doBanner: isProd,
                doVersioning: isProd,
                doSourceMaps: isProd,
                concatName: name + '.tmpl.js',
                banner: banner,
                ngHtml2JsOptions: {
                    moduleName: ngName
                  }
              }
          },
        css: {
            src: [
                path.join(appSrcBase, 'base', '**', '*.css'),
                path.join(appSrcBase, '**', '*.css')
              ],
            dest: path.join(appDestBase, 'styles'),
            build: true,
            buildOptions: {
                doMinify: isProd,
                doConcat: isProd,
                doBanner: isProd,
                doVersioning: isProd,
                doSourceMaps: isProd,
                concatName: name + '.css',
                banner: banner,
                pluginOptions: {
                    'postcss-import': {
                        path: [
                            path.join(appBase, 'base', 'styles')
                          ]
                      }
                  }
              }
          },
        svg: {
            src: [
                path.join(appSrcBase, 'static', 'svg', '**', '*.svg')
              ],
            dest: path.join(appDestBase, 'svg'),
            build: true,
            buildOptions: {
                doMinify: isProd,
                concatName: name + '.svg'
              }
          },
        partials: {
            src: [
                path.join(appSrcBase, 'partials', '*.html')
              ],
            build: true,
            builder: 'html',
            buildOptions: {
                doMinify: false, // No need to ever minify here, since minifying the whole page will take care of it
                processOptions: {
                    environment: env,
                  }
              }
          },
        html: {
            src: [
                path.join(appSrcBase, '*.html')
              ],
            dest: appDestBase,
            build: true,
            buildOptions: {
                doMinify: isProd,
                doInject: true,
                injectOptions: {
                    ignorePath: appDestBase
                  },
                processOptions: {
                    environment: env,
                  }
              },
            appAssetDependencies: [
                'js',
                'templates',
                'css',
                'svg',
                'partials'
              ],
            extAssetDependencies: [
                'js',
                'css',
                'svg',
                'partials'
              ]
          },
        misc: {
            src: [
                path.join(appSrcBase, 'static', 'misc', '**', '*.*')
              ],
            dest: appDestBase
          }
      },

    extAssets: {
        js: {
            build: true,
            buildOptions: {
                doCheck: false,
                doMinify: isProd,
                doConcat: isProd,
                doBanner: false,
                doVersioning: isProd,
                doSourceMaps: isProd,
                concatName: 'libs.js'
              },
            dest: path.join(appDestBase, 'scripts', 'libs')
          },
        css: {
            build: true,
            buildOptions: {
                doCheck: false,
                doMinify: isProd,
                doConcat: isProd,
                doBanner: false,
                doVersioning: isProd,
                doSourceMaps: isProd,
                concatName: 'libs.css'
              },
            dest: path.join(appDestBase, 'styles', 'libs')
          },
        svg: {},
        partials: {
            filter: path.join('**', '*.html')
          },
        fonts: {
            filter: [
                '**/*.woff2',
                '**/*.woff',
                '**/*.ttf'
              ],
            dest: path.join(appDestBase, 'fonts')
          }
      },

    bower: {
        json: path.join(appBase, 'bower.json'),
        components: path.join(appBase, 'bower_components')
      },

    server: {
        port: baseServerPort + allEnvs.indexOf(env),
        hostname: 'localhost',
        root: appDestBase,
        ssl: true,
        key: path.join(appBase, 'dev_certs', 'key.pem'),
        cert: path.join(appBase, 'dev_certs', 'cert.pem')
      },

    unitTests: {
        src: [
            path.join(appSrcBase, '**', 'test.*.js')
          ],
        karmaOptions: {
            browsers: ['Chrome', 'Firefox', 'Safari'],
            ngHtml2JsPreprocessor: {
                moduleName: ngName
              }
          }
      },

    integrationTests: {
        src: [
            path.join(appTestBase, '**', 'spec.*.js')
          ],
        browser: 'Firefox',
        eyeballOptions: {
            screenshotRoot: appTestBase,
            widths: [320, 480, 640, 768, 1024]
          }
      },

    deployment: {
        jumpServer: 'server.ex.imgix.com',
        loko: {
            package: 'imgix-app-deploy'
          },
        ansible: {
            configFile: 'this_app.yml'
          },
        repository: {
            url: 'git@github.com:zebrafishlabs/imgix-app',
            branch: 'master'
          }
      }
  };
}
