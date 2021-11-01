var fs         = require('fs');
var mkdirp     = require('mkdirp');
var path       = require('path');
var RawSource  = require("webpack-sources/lib/RawSource");
var parse      = require('node-html-parser').default;

const HtmlWebpackPlugin = require('html-webpack-plugin');

function HtmlWebpackAlterDataPlugin (options) {
  this.options = {
    assetsConstants:          false,
    assetPrefix:              '~',
    manifestFilename:         'manifest.json',
    debug:                    false,
    chunkFilenameReplacement: [],
  }
  options && Object.assign(this.options, options);
}

HtmlWebpackAlterDataPlugin.prototype.apply = function (compiler) {
  var self = this;
  compiler.hooks.emit.tapAsync('HtmlWebpackAlterDataPlugin', (compilation, callback) => {
    var manifest = JSON.parse(
      compilation.assets[this.options.manifestFilename]._value
    );
    //callback();
    //return;
    for (var basename in compilation.assets) {
      var result = compilation.assets[basename].source();
      if (typeof result == 'string') {
        var root = parse(result);
        var nodes = root.querySelectorAll('svg use');
        if (!nodes) {
          continue;
        }
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[i];
          var attribute = node.getAttribute('xlink:href');
          if (!attribute) {
            continue;
          }
          for (var [source, target] of Object.entries(manifest)) {
            attribute = attribute.replace(
              this.options.assetPrefix + source + '#',
              target + '#',
            )
          }
          node.setAttribute('xlink:href', attribute);
        }
        var result = root.toString();
        compilation.assets[basename] = new RawSource(result);
      }
    }
    callback();
  });

  compiler.hooks.compilation.tap('HtmlWebpackAlterDataPlugin', (compilation) => {
    const beforeEmit = compilation.hooks.htmlWebpackPluginAfterHtmlProcessing ||
      HtmlWebpackPlugin.getHooks(compilation).beforeEmit;
    beforeEmit.tapAsync('HtmlWebpackAlterDataPlugin', (data, cb) => {
      data.html = data.html.replace('<!DOCTYPE html5>', '<!DOCTYPE html>');
      data.html = data.html.replace(/<!--\|\%\|/g, '');
      data.html = data.html.replace(/\|\%\|-->/g, '');
      cb(null, data)
    });
  });

  compiler.hooks.emit.tap('HtmlWebpackAlterDataPlugin', (compilation) => {
    if (!this.options.assetsConstants) {
      return;
    }
    fileContent = ''
    compilation.chunks.forEach(function(chunk) {
      chunk.files.forEach(function(file) {
        var extension = file.slice(file.lastIndexOf('.') + 1);
        line = 'asset.' + extension + '.' + chunk.name + ' = ' + '/' + file + '\n';
        fileContent += line;
      });
    });
    compilation.assets[this.options.assetsConstants] = {
      source: function() {
        return fileContent;
      },
      size: function() {
        return fileContent.length;
      }
    };
    var fullPath = path.resolve(this.outputPath || compilation.compiler.outputPath, this.options.assetsConstants);
    var directory = path.dirname(fullPath);
    mkdirp(directory, function (err) {
      fs.writeFile(fullPath, fileContent, function (err) {});
    });
  });

};

module.exports = HtmlWebpackAlterDataPlugin
