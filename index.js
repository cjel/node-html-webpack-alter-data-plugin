const cheerio  = require('cheerio')

function HtmlWebpackAlterDataPlugin (options) {
  this.options = {
    assetsConstants: false,
    debug: false,
    chunkFilenameReplacement: []
  }

  options && Object.assign(this.options, options);
}

HtmlWebpackAlterDataPlugin.prototype.apply = function (compiler) {
  var self = this

  function processHtml(co, compilation) {
    self.options.chunkFilenameReplacement.forEach(function(replacement) {
      console.log('='.repeat(30))
      console.log(replacement.tag)
      co(replacement.tag).each(function(i, elem) {
        var tag = co(elem)[0]
        if ( (!tag)
          || (!('attribs' in tag))
          || (!(replacement.attribute in tag.attribs))
        ) {
          return
        }
        var url = tag.attribs[replacement.attribute]
        if (url[0] != '~') {
          return
        }
        url = url.substring(1)
        var hash = url.slice(url.indexOf('#'))
        var path = url.slice(0, url.indexOf('#'))
        var file = path.slice(url.lastIndexOf('/') + 1)
        var path = path.slice(0, url.lastIndexOf('/') + 1)
        var filename = file.slice(0, file.indexOf('.'))
        var extension = file.slice(file.indexOf('.') + 1)
        compilation.chunks.forEach(function(chunk) {
          if (chunk.name != filename) {
            return
          }
          chunk.files.forEach(function(file) {
            if (!file.startsWith(path)) {
              return
            }
            if (!file.endsWith('.' + extension)) {
              return
            }
            tag.attribs[replacement.attribute] = '/' + file + hash
          })
        })

      })
    })
    return co
  }

  compiler.hooks.compilation.tap('HtmlWebpackAlterDataPlugin', (compilation) => {

    compilation.hooks.htmlWebpackPluginAfterHtmlProcessing.tapAsync('HtmlWebpackAlterDataPlugin', (data, cb) => {

      if ('chunkFilenameReplacement' in this.options) {
        var co = cheerio.load(data.html, {
          recognizeSelfClosing: false,
          lowerCaseTags: false,
          lowerCaseAttributeNames: false,
          decodeEntities: false,
        })
        co = processHtml(co, compilation)
        co('script').each(function(i, elem) {
          if (co(elem).attr('type') != 'text/x-template') {
            return;
          }
          var script = cheerio.load(co(elem).html(), {
            recognizeSelfClosing: false,
            lowerCaseTags: false,
            lowerCaseAttributeNames: false,
            decodeEntities: false,
          })
          var scriptResult = processHtml(script, compilation).html()
          console.log(scriptResult)
          co(co('script').get(i)).html(scriptResult)
        })
        data.html = co.html()
      }
      data.html = data.html.replace('<!DOCTYPE html5>', '<!DOCTYPE html>')
      cb(null, data)
    })

  })

  compiler.hooks.emit.tap('HtmlWebpackAlterDataPlugin', (compilation) => {

    if (!this.options.assetsConstants) {
      return
    }

    fileContent = ''
    compilation.chunks.forEach(function(chunk) {
      chunk.files.forEach(function(file) {
        var extension = file.slice(file.lastIndexOf('.') + 1)
        line = 'asset.' + extension + '.' + chunk.name + ' = ' + '/' + file + '\n'
        fileContent += line
      })
    })

    compilation.assets[this.options.assetsConstants] = {
      source: function() {
        return fileContent;
      },
      size: function() {
        return fileContent.length;
      }
    };
  })

};

module.exports = HtmlWebpackAlterDataPlugin
