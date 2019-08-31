var fs         = require('fs');
var mkdirp     = require('mkdirp');
var path       = require('path');
var RawSource  = require("webpack-sources/lib/RawSource");

function HtmlWebpackAlterDataPlugin (options) {
  this.options = {
    assetsConstants: false,
    debug: false,
    chunkFilenameReplacement: []
  }

  options && Object.assign(this.options, options);
}

HtmlWebpackAlterDataPlugin.prototype.apply = function (compiler) {
  var self = this;

  compiler.hooks.emit.tapAsync('HtmlWebpackAlterDataPlugin', (compilation, callback) => {
    var filenameHashed = null;
    self.options.chunkFilenameReplacement.forEach(function(replacement) {
      compilation.chunks.forEach(function(chunk) {
        if (chunk.name != 'spritemap') {
          return
        }
        filenameHashed = '/assets/spritemap.' + chunk.renderedHash + '.svg';
      });
    });
    if (filenameHashed) {
      for (var basename in compilation.assets) {
        var result = compilation.assets[basename].source();
        var regexp = /<use xlink:href="~assets\/spritemap\.svg#([a-zA-Z-]*)">/g;
        var replacement = '<use xlink:href="' + filenameHashed + '#$1">';
        var result = result.replace(regexp, replacement);
        var regexp = /<use xlink:href=\\"~assets\/spritemap\.svg#([a-zA-Z-]*)\\">/g;
        var replacement = '<use xlink:href=\\"' + filenameHashed + '#$1\\">';
        var result = result.replace(regexp, replacement);
        compilation.assets[basename] = new RawSource(result);
      }
    }
    callback();
  });

  compiler.hooks.compilation.tap('HtmlWebpackAlterDataPlugin', (compilation) => {
    compilation.hooks.htmlWebpackPluginAfterHtmlProcessing.tapAsync('HtmlWebpackAlterDataPlugin', (data, cb) => {
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
