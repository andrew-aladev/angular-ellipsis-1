"use strict";

angular.module("dibari.angular-ellipsis", [])
  .directive("ellipsis", function($timeout, $window) {
    var DEFAULT_SEPARATOR        = " ";
    var DEFAULT_SYMBOL           = "...";
    var DEFAULT_DEBOUNCE_TIMEOUT = 500;

    function debounce(func, timeout) {
      var timer = null;

      return function () {
        var context = this;
        var args    = arguments;

        if (timer != null) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {
          timer = null;
          func(context, args);
        }, timeout);
      };
    }

    function hasOverflow(node) {
      return node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight;
    }

    function buildEllipsis(element, node, originalText, separator, symbol, appendText) {
      if (originalText == null) {
        return;
      }
      if (originalText == "") {
        element.text("");
        return;
      }

      element.text(originalText);
      if (!hasOverflow(node)) {
        return;
      }

      var words = originalText.split(separator);

      // We need to calculate biggest possible string without ellipsis symbol.
      var text           = "";
      var wordsCount     = 0;
      var tailWordsCount = words.length;

      while(true) {
        var leftTailWordsCount = Math.ceil(tailWordsCount / 2);
        var newText            = words.slice(0, wordsCount + leftTailWordsCount).join(separator);
        element.text(newText);

        if (hasOverflow(node)) {
          tailWordsCount = leftTailWordsCount;

          if (tailWordsCount == 1) {
            // We couldn't append the last word.
            element.text(text);
            break;
          }

          continue;
        }

        text           = newText;
        wordsCount     += leftTailWordsCount;
        tailWordsCount -= leftTailWordsCount;

        if (tailWordsCount == 0) {
          // We could append the last word.
          break;
        }
      }

      if (wordsCount == words.length) {
        return;
      }

      // Original string was trimmed. Let's try to append ellipsis symbol.

      while(true) {
        var newText = text + symbol;
        element.text(newText);

        if (hasOverflow(node)) {
          if (wordsCount == 0) {
            // It is not possible to append ellipsis symbol, it is bigger than text itself.
            element.text(text);
            break;
          }

          wordsCount--;
          text = words.slice(0, wordsCount).join(separator);
          continue;
        }

        text = newText
        break;
      }

      if (appendText != null) {
        element.text(text + appendText);
      }
    }

    return {
      restrict: "A",

      scope: {
        ngShow: "=",
        ngBind: "=",

        ellipsisSeparator:       "@",
        ellipsisSymbol:          "@",
        ellipsisAppend:          "@",
        ellipsisDebounceTimeout: "@"
      },

      compile: function(_element, _attributes, _linker) {
        return function(scope, element, attributes) {
          var node = element[0];

          var process = debounce(
            function () {
              buildEllipsis(
                element,
                node,
                scope.ngBind,
                scope.ellipsisSeparator || DEFAULT_SEPARATOR,
                scope.ellipsisSymbol    || DEFAULT_SYMBOL,
                scope.ellipsisAppend
              );
            },
            scope.ellipsisDebounceTimeout || DEFAULT_DEBOUNCE_TIMEOUT
          );

          scope.$watchGroup(
            [
              "ngShow", "ngBind",
              "ellipsisSeparator", "ellipsisSymbol", "ellipsisAppend", "ellipsisDebounceTimeout",
              function() { return node.offsetWidth > 0 && node.offsetHeight != 0; }
            ],
            process
          );

          var windowWidth  = null;
          var windowHeight = null;
          var scrollWidth  = null;
          var clientWidth  = null;
          var scrollHeight = null;
          var clientHeight = null;

          function onResize() {
            if (
              windowWidth  == $window.innerWidth && windowHeight == $window.innerHeight &&
              scrollWidth  == node.scrollWidth   && clientWidth  == node.clientWidth &&
              scrollHeight == node.scrollHeight  && clientHeight == node.clientHeight
            ) {
              return;
            }

            windowWidth  = $window.innerWidth;
            windowHeight = $window.innerHeight;
            scrollWidth  = node.scrollWidth;
            clientWidth  = node.clientWidth;
            scrollHeight = node.scrollHeight;
            clientHeight = node.clientHeight;

            process();
          }

          var window = angular.element($window);
          window.bind("resize", onResize);

          scope.$on("$destroy", function() {
            window.unbind("resize", onResize);
          });
        };
      }
    };
  });
