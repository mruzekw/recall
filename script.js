(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Recall = factory();
  }
}(this, function () {

  var tileTemplate = '<div class="recall-grid-tile" data-row="<%= row %>" data-col="<%= col %>"></div>',
      rowTemplate  = '<div class="recall-grid-row"><%= tiles %></div>',
      gameTemplate = '<div class="recall">' +
                     '  <div class="recall-message recall-win-message is-hidden">'+
                     '    You win!' +
                     '    <button class="recall-restart-btn">Do it again!</button> ' +
                     '  </div>' +
                     '  <div class="recall-message recall-lose-message is-hidden">' +
                     '    Whomp... Sorry' +
                     '    <button class="recall-restart-btn">Try again...</button> ' +
                     '  </div>' +
                     '  <div class="recall-grid">' +
                     '    <%= gridMarkup %>' +
                     '  </div>' +
                     '</div>';

  function Recall(options) {
    this.options = options || {};
    this._ensureOptions();

    this.isDisabled = true;

    this.tileClass = 'recall-grid-tile';
    this.resetBtnClass = 'recall-restart-btn';

    this.ui = {};

    this.expectedMatrix = [];
    this.domMatrix = generateSquareMatrix(5, null);
    this.selectedMatrix = [];

    this.el = this._ensureElement();
    this.$render();
  }

 /**
  * Setup
  */

  Recall.prototype._ensureOptions = function () {
    if(!this.options.el) throw Error('No element or selector provided');

    this.options.numToChoose = this.options.numToChoose || 9;
    this.options.size = this.options.size || 5;
  };

  Recall.prototype._ensureElement = function () {
    var el = this.options.el;

    if(typeof this.options.el === 'string') {
      el = document.querySelectorAll(this.options.el);

      if(!el.length) throw Error('Element not found in document');
      return el[0];
    }

    return el;
  };

  Recall.prototype.$render = function () {
    // Render and place in DOM
    this.el.innerHTML = tmpl(gameTemplate, { gridMarkup: this._renderGrid() });

    // Keep mirrored references for easy access
    this._populateDomMatrix();

    // Record UI References
    this.ui = {
      winMessage: this.el.querySelector('.recall-win-message'),
      loseMessage: this.el.querySelector('.recall-lose-message'),
    };

    // Delegate events
    this.el.addEventListener('click', function (event) {
      var el = event.target;
      if (el) {
        if (hasClass(el, this.tileClass) && !this.isDisabled) {
          this.selectTile(el.getAttribute('data-row'), el.getAttribute('data-col'));
        }

        if(hasClass(el, this.resetBtnClass)) { this.restart(); }
      }
    }.bind(this));

    return this;
  };

  Recall.prototype.destroy = function () {
    this.el.removeEventListener('click');
  };

 /**
  * Business
  */

  Recall.prototype.start = function () {
    this.expectedMatrix = this._generateExpectedMatrix();
    this.selectedMatrix = this._generateInitSelectedMatrix();

    this.$applySelectionMatrix(this.expectedMatrix);

    setTimeout(function () {
      this.$applySelectionMatrix(this.selectedMatrix);
      this.isDisabled = false;
    }.bind(this), 5000);
  };

  Recall.prototype.restart = function () {
    this.$hideMessages();
    this.expectedMatrix = [];
    this.selectedMatrix = [];
    this.start();
  };

  Recall.prototype.selectTile = function (row, col) {
    this.selectedMatrix[row][col] = true;
    this.$applySelectionMatrix(this.selectedMatrix);

    if(this._getNumSelectedTiles() === this.options.numToChoose) this.checkAnswer();
  };

  Recall.prototype.checkAnswer = function () {
    if(this._isCorrectSelection()) {
      this.$showWinMessage();
    } else {
      this.$showLoseMessage();
    }

    this.isDisabled = true;
  };

  Recall.prototype._renderGrid = function () {
    var tileTemplateFn = tmpl(tileTemplate),
        rowTemplateFn = tmpl(rowTemplate),
        tiles = '', rows = '',
        num = this.options.size,
        row, col;

    for(row = 0; row < num; row++) {
      for(col = 0; col < num; col++) {
        tiles += tileTemplateFn({ row: row, col: col });
      }
      rows += rowTemplateFn({ tiles: tiles });
      tiles = '';
    }

    return rows;
  };

  Recall.prototype._getNumSelectedTiles = function () {
    return this.el.querySelectorAll('.' + this.tileClass + '.is-selected').length;
  };

  Recall.prototype._isCorrectSelection = function () {
    var row, col, num = this.options.size;
    for(row = 0; row < num; row++) {
      for(col = 0; col < num; col++) {
        if(this.expectedMatrix[row][col] !== this.selectedMatrix[row][col]) return false;
      }
    }

    return true;
  };

  Recall.prototype._generateExpectedMatrix = function () {
    var matrix = generateSquareMatrix(this.options.size, false),
        numSelected = 0,
        randRow = 0,
        randCol = 0;

    while(numSelected < this.options.numToChoose) {
      randRow = randomWithinRange(0, matrix.length);
      randCol = randomWithinRange(0, matrix[0].length);

      if(!matrix[randRow][randCol]) {
        matrix[randRow][randCol] = true;
        numSelected += 1;
      }
    }

    return matrix;
  };

  Recall.prototype._generateInitSelectedMatrix = function () {
    return generateSquareMatrix(this.options.size, false);
  };

  Recall.prototype._populateDomMatrix = function () {
    var tileElems = this.el.querySelectorAll('.' + this.tileClass);
    Array.prototype.forEach.call(tileElems, function(el, i) {
      this.domMatrix[el.getAttribute('data-row')][el.getAttribute('data-col')] = el;
    }.bind(this));
  };

 /**
  * DOM
  */

  Recall.prototype.$applySelectionMatrix = function (matrix) {
    var row, col, num = this.options.size;
    for(row = 0; row < num; row++) {
      for(col = 0; col < num; col++) {
        if (matrix[row][col]) {
          this._$selectTile(this.domMatrix[row][col]);
        } else {
          this._$deselectTile(this.domMatrix[row][col]);
        }
      }
    }
  };

  Recall.prototype.$showWinMessage = function () {
    removeClass(this.ui.winMessage, 'is-hidden');
  };

  Recall.prototype.$showLoseMessage = function () {
    removeClass(this.ui.loseMessage, 'is-hidden');
  };

  Recall.prototype.$hideMessages = function () {
    addClass(this.ui.winMessage, 'is-hidden');
    addClass(this.ui.loseMessage, 'is-hidden');
  };

  Recall.prototype._$selectTile = function (tile) {
    addClass(tile, 'is-selected');
  };

  Recall.prototype._$deselectTile = function (tile) {
    removeClass(tile, 'is-selected');
  };

 /**
  * Helpers
  */

  function generateSquareMatrix(num, value) {
    var arr = [], row, col;
    for(row = 0; row < num; row++) {
      arr[row] = [];
      for(col = 0; col < num; col++) {
        arr[row][col] = value;
      }
    }

    return arr;
  }

  function randomWithinRange(min, range) {
    return min + Math.floor(Math.random() * range);
  }

 /**
  * DOM Helpers
  */

  function addClass(el, className) {
    if (el.classList) {
      el.classList.add(className);
    } else {
      el.className += ' ' + className;
    }
  }

  function removeClass(el, className) {
    if (el.classList) {
      el.classList.remove(className);
    } else {
      el.className = el.className.replace(
        new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'),
        ' '
      );
    }
  }

  function hasClass(el, className) {
    if (el.classList) return el.classList.contains(className);
    return new RegExp(
      '(^| )' + className + '( |$)', 'gi'
    ).test(el.className);
  }

  // Simple JavaScript Templating
  // John Resig - http://ejohn.org/ - MIT Licensed
  (function () {
    var cache = {};

    this.tmpl = function tmpl(str, data){
       var fn = !/\W/.test(str) ?
        cache[str] = cache[str] ||
          tmpl(document.getElementById(str).innerHTML) :

        new Function("obj",
          "var p=[],print=function(){p.push.apply(p,arguments);};" +

          "with(obj){p.push('" +

          str
            .replace(/[\r\t\n]/g, " ")
            .split("<%").join("\t")
            .replace(/((^|%>)[^\t]*)'/g, "$1\r")
            .replace(/\t=(.*?)%>/g, "',$1,'")
            .split("\t").join("');")
            .split("%>").join("p.push('")
            .split("\r").join("\\'")
        + "');}return p.join('');");

      return data ? fn( data ) : fn;
    };
  })();

  return Recall;
}));
