ar path = require('path'),
    _ = require('lodash');

module.exports = function(args) {
  var name = 'imgix-webapp',
      ngName = 'imgix.webapp',
      appBase = '.',

      // Set environment based on args passed in
      allEnvs = ['dev', 'test', 'prod'],
      env = _.includes(allEnvs, args.env) ? args.env : allEnvs[0],
      isProd = (env === 'prod'),

      // Base paths for src and dest files
      appSrcBase = path.join(appBase, 'app'),
      appDestBase = path.join(appBase, '.' + env + '_srv'),

      // Server numbers count up from here, per-environment
      baseServerPort = 9120,

      // Template for banner that goes atop all compiled assets.
      banner = '/* ' + name + ' - Built: ' + Date.now() + ' */\n';

  return {
    name: name,
    ngModule: ngName,

    srcFiles: {
        js: [
            path.join(appSrcBase, 'base', 'scripts', 'app.js'),
            path.join(appSrcBase, 'base', '**', '*.js'),
            path.join(appSrcBase, '**', '*.js'),
            '!' + path.join('**', 'test.*.js')
          ],
        templates: [
            path.join(appSrcBase, '**', '*.tmpl')
          ],
        css: [
            path.join(appSrcBase, 'base', '**', '*.css'),
            path.join(appSrcBase, '**', '*.css')
          ],
        svg: [
            path.join(appSrcBase, 'static', 'svg', '**', '*.svg')
          ],
        html: [
            path.join(appSrcBase, '*.html')
          ],
        misc: [
            path.join(appSrcBase, 'static', 'misc', '**', '*.*')
          ]
      },

    testFiles: {
        unit: [
            path.join(appSrcBase, '**', 'test.*.js')
          ],
        integration: [
            path.join(appBase, 'test', '**', 'spec.*.js')
          ]
      },

    destPaths: {
        base:
          appDestBase,
        js:
          path.join(appDestBase, 'scripts'),
        css:
          path.join(appDestBase, 'styles'),
        svg:
          path.join(appDestBase, 'svg'),
        html:
          appDestBase,
        misc:
          appDestBase
      },

    // Options describing how to build assets
    buildOptions: {
        js: {
            doMinify: isProd,
            doConcat: isProd,
            doBanner: isProd,
            doVersioning: isProd,
            doSourcemaps: isProd,
            concatName: name + '.js',
            banner: banner
          },
        templates: {
            doMinify: isProd,
            doConcat: isProd,
            doBanner: isProd,
            doVersioning: isProd,
            doSourcemaps: isProd,
            concatName: name + '.tmpl.js',
            banner: banner,
            ngHtml2JsConfig: {
                moduleName: ngName
              }
          },
        css: {
            doMinify: isProd,
            doConcat: isProd,
            doBanner: isProd,
            doVersioning: isProd,
            doSourcemaps: isProd,
            concatName: name + '.css',
            banner: banner,
            pluginConfigs: {
                'postcss-import': {
                    path: [path.join(appBase, 'base')]
                  }
              }
          },
        svg: {
            doMinify: isProd,
            concatName: name + '.svg'
          },
        html: {
            doMinify: isProd,
            injectConfig: {
                ignorePath: appDestBase
              },
            processConfig: {
                environment: env,
              }
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

    karma: {
        browsers: ['Chrome', 'Firefox', 'Safari']
      },

    webdriver: {
        browser: 'Firefox',
        defaultWidths: [320, 480, 640, 768, 1024],
        screenshotPath: path.join(appBase, 'test')
      }
  };
}
