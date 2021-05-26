// #!/usr/bin/env node

// THIS CODE IS TAKEN AND ADJUSTED FROM: https://www.npmjs.com/package/echomd  (package included) - To Remove the first line (otherwise it does not build)

/*
# echomd -- An md like conversion tool for shell terminals
#
# Fully inspired by the work of John Gruber
# <http://daringfireball.net/projects/markdown/>
#
# ────────────────────────────────────────────────────────────────────────
# The MIT License (MIT)
# Copyright (c) 2016 Andrea Giammarchi - @WebReflection
#
# Permission is hereby granted, free of charge, to any person obtaining a
# copy of this software and associated documentation files (the "Software"),
# to deal in the Software without restriction, including without limitation
# the rights to use, copy, modify, merge, publish, distribute, sublicense,
# and/or sell copies of the Software, and to permit persons to whom
# the Software is furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included
# in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
# IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
# DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
# TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH
# THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
# ────────────────────────────────────────────────────────────────────────
*/

let
  DIM_START = 2
let DIM_END = 22
const crypto = require('crypto')
const os = require('os')
const line = Array(73).join('─')
const some = [].some || function (cb) {
  for (let i = 0; i < this.length; i++) {
    if (cb(this[i])) return true
  }
  return false
}
// for old version of NodeJS __proto__ is sanitized
const md5Dunder = md5Base64('__proto__')
const findDunder = /^__proto__$/
const restoreDunder = new RegExp('^' + md5Dunder + '$')

try {
  if (/\bMicrosoft\b/.test(os.release()) || os.platform() === 'win32') {
    DIM_START = 90
    DIM_END = 37
  }
} catch (meh) {}

export function echomd () {
  let
    txt = slice.apply(0, arguments).join(' ')
  const code = new Dict()
  const multiLineCode = /(^|[^\\])(`{2,})([\s\S]+?)\2(?!`)/g
  const singleLineCode = /(^|[^\\])(`)(.+?)\2/gm
  const storeAndHide = function ($0, $1, $2, $3) {
    $3 = $3.replace(findDunder, md5Dunder)
    return $1 + $2 + (code[$3] = md5Base64($3)) + $2
  }
  const restoreHidden = function ($0, $1, $2, $3) {
    $3 = $3.replace(restoreDunder, '__proto__')
    return $1 + $2 + getSource($3, code) + $2
  }

  txt = txt.replace(multiLineCode, storeAndHide)
  txt = txt.replace(singleLineCode, storeAndHide)
  // horizontal
  txt = txt.replace(/^[ ]{0,2}([ ]?[*_-][ ]?){3,}[ \t]*$/gm,
    '\x1B[1m' + line + '\x1B[22m')
  // header
  txt = txt.replace(/^(\#{1,6})[ \t]+(.+?)[ \t]*\#*([\r\n]+|$)/gm, getHeader)
  // bold dim underline blink reverse hidden strike
  txt = txt.replace(/(\*{1,2})(?=\S)(.*?)(\S)\1/g, '\x1B[1m$2$3\x1B[22m')
  /* HUGO: Removed this so '-' characters don't disappear
    txt = txt.replace(
        /(-{1,2})(?=\S)(.*?)(\S)\1/g,
        '\x1B[' + DIM_START + 'm$2$3\x1B[' + DIM_END + 'm'
    ); */
  // HUGO: Removed this to make underscores look correctly
  // txt = txt.replace(/(_{1,2})(?=\S)(.*?)(\S)\1/g, '\x1B[4m$2$3\x1B[24m');
  txt = txt.replace(
    /(\:{1,2})(?=\S)(.*?)(\S)\1/g,
    function ($0, $1, $2, $3) {
      return DIM_START === 2
        ? ('\x1B[5m' + $2 + $3 + '\x1B[25m')
        : ('\x1B[7m' + $2 + $3 + '\x1B[27m')
    }
  )
  txt = txt.replace(/(\!{1,2})(?=\S)(.*?)(\S)\1/g, '\x1B[7m$2$3\x1B[27m')
  txt = txt.replace(/(\?{1,2})(?=\S)(.*?)(\S)\1/g, '\x1B[8m$2$3\x1B[28m')
  txt = txt.replace(/(~{1,2})(?=\S)(.*?)(\S)\1/g, '\x1B[9m$2$3\x1B[29m')
  // list
  txt = txt.replace(/^([ \t]{1,})[*+-]([ \t]{1,})/gm, '$1•$2')
  // quote
  txt = txt.replace(/^[ \t]*>([ \t]?)/gm, '\x1B[7m$1\x1B[27m$1')
  // color
  txt = txt.replace(/(!?)#([a-zA-Z0-9]{3,8})\((.+?)\)(?!\))/g, getColor)
  txt = txt.replace(singleLineCode, restoreHidden)
  txt = txt.replace(multiLineCode, restoreHidden)

  // HUGO: Added this to show the example
  txt = txt.replace('```console', '---')
  txt = txt.replace('```', '---')

  return txt
}

// HELPERS

function Dict () {}
Dict.has = function has (dict, property) {
  return Object.prototype.hasOwnProperty.call(dict, property)
}
Dict.prototype = (Object.create || Object)(null)

function getColor ($0, bg, rgb, txt) {
  let out = ''
  switch (rgb) {
    case 'black': out = '\x1B[30m'; break
    case 'red': out = '\x1B[31m'; break
    case 'green': out = '\x1B[32m'; break
    case 'blue': out = '\x1B[34m'; break
    case 'magenta': out = '\x1B[35m'; break
    case 'cyan': out = '\x1B[36m'; break
    case 'white': out = '\x1B[37m'; break
    case 'yellow': out = '\x1B[39m'; break
    case 'grey': out = '\x1B[90m'; break
  }
  out += out === '' ? txt : (txt + '\x1B[39m')
  return bg === '' ? out : ('\x1B[7m' + out + '\x1B[27m')
}

function getHeader ($0, $1, $2, $3) {
  if ($1.length === 1) {
    $2 = '\x1B[1m' + $2 + '\x1B[22m'
  }
  return '\x1B[7m ' + $2 + ' \x1B[27m' + $3
}

function getSource (hash, code) {
  for (const source in code) {
    if (Dict.has(code, source) && code[source] === hash) {
      return source
    }
  }
}

function md5Base64 (txt) {
  return crypto.createHash('md5').update(txt).digest('base64')
}

// https://gist.github.com/WebReflection/4327762cb87a8c634a29
function slice () {
  'use strict'
  for (var
    o = +this, // offset
    i = o, // start index
    l = arguments.length, // length
    n = l - o, // new length
    a = Array(n < 0 ? 0 : n); // new Array
    i < l; i++
  ) a[i - o] = arguments[i]
  return a
}

/*
function demo() {
    var output = echomd([
        '',
        '# # Bringing MD Like Syntax To Bash Shell',
        'It should be something as *** easy ***',
        'and as ___ natural ___ as writing text.',
        '',
        '> > Keep It Simple',
        '',
        'Is the idea',
        '',
        '  *  * behind',
        '  *  * all this',
        '',
        '~~~ striking ~~~ UX also for `shell` users.',
        '--- dimmed ---, !!! inverted !!!, or ::: blinking ::: too!',
        ''
    ].join('\n'));
    output += '- - -' + echomd('- - -');
    output += '\n./echomd #green(' + echomd('#green(v0.1.2)') + ')';
    console.log(output + '\n');
} */

if (module.parent == null) {
  if (some.call(process.argv, function (value) {
    return /^-h|--help$/.test(value)
  })) {
    // HUGO: Switched off since it was running in build mode...
    // demo();
  } else if (process.argv.length > 2) {
    console.log(
      echomd.apply(null, process.argv.slice(2))
    )
  }
} else {
  (module.exports = function echomd () {
    console.log(echomd.raw.apply(null, arguments))
  }).raw = echomd
}

export function myEchoMD (args) {
  console.log(echomd(args))
}
