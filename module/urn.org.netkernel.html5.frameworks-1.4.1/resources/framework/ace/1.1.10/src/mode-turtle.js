define("ace/mode/turtle_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"], function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

var TurtleHighlightRules = function() {

    this.$rules = { start: 
       [ { token: 'keyword.turtle',
           regex: '(?:^|\\s+)(?:@base|@prefix)\\b',
           comment: 'Keywords' },
         { token: 'string.uri.turtle',
           regex: '<[^<>"{}|^`\\]\\\\]*>',
           comment: 'URI' },
         { token: [ 'constant.language.turtle', 'entity.name.class.turtle' ],
           regex: '(_:)([^\\s]+)',
           comment: 'Blank node' },
         { token: [ 'constant.prefix.turtle', 'entity.name.class.turtle' ],
           regex: '(\\w*:)([^\\s|/^*?+{}()]*)',
           comment: 'Prefix / prefixed URI' },
         { token: 'entity.name.class.rdfs-type.turtle',
           regex: '\\sa\\s',
           comment: 'The special triple predicate \'a\'' },
         { token: 
            [ 'string.turtle',
              'keyword.operator.turtle',
              'support.type.turtle' ],
           regex: '("[^"]*")(\\^\\^)(<[^<>"{}|^`\\]\\\\]*>|\\w*:[^\\s)]+)',
           comment: 'Typed literal' },
         {
           token : "string.turtle",
           regex : '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]',
           comment: 'String literal'
         },
         {
           token : "string.turtle",
           regex : '[\'](?:(?:\\\\.)|(?:[^"\\\\]))*?[\']',
           comment: 'String literal'
         },
         {
           token : "support.type.turtle",
           regex : '@[a-z]+(?:-[a-z0-9]+)?',
           comment : 'Language specifier'
         },
         { token: 'comment.line.number-sign.turtle',
           regex: '#.*$',
           comment: 'Comments' },
         { token: 'constant.numeric.turtle',
           regex: '\\b[+-]?(?:\\d+|[0-9]+\\.[0-9]*|\\.[0-9]+(?:[eE][+-]?\\d+)?)\\b',
           comment: 'Numeric literal' },
         { token: 'constant.language.turtle',
           regex: '\\b(?:true|false)\\b',
           comment: 'Boolean' } ] }
    
    this.normalizeRules();
};

TurtleHighlightRules.metaData = { fileTypes: [ 'ttl' ],
      name: 'Turtle',
      scopeName: 'source.turtle' }


oop.inherits(TurtleHighlightRules, TextHighlightRules);

exports.TurtleHighlightRules = TurtleHighlightRules;
});

define("ace/mode/folding/cstyle",["require","exports","module","ace/lib/oop","ace/range","ace/mode/folding/fold_mode"], function(require, exports, module) {
"use strict";

var oop = require("../../lib/oop");
var Range = require("../../range").Range;
var BaseFoldMode = require("./fold_mode").FoldMode;

var FoldMode = exports.FoldMode = function(commentRegex) {
    if (commentRegex) {
        this.foldingStartMarker = new RegExp(
            this.foldingStartMarker.source.replace(/\|[^|]*?$/, "|" + commentRegex.start)
        );
        this.foldingStopMarker = new RegExp(
            this.foldingStopMarker.source.replace(/\|[^|]*?$/, "|" + commentRegex.end)
        );
    }
};
oop.inherits(FoldMode, BaseFoldMode);

(function() {
    
    this.foldingStartMarker = /(\{|\[)[^\}\]]*$|^\s*(\/\*)/;
    this.foldingStopMarker = /^[^\[\{]*(\}|\])|^[\s\*]*(\*\/)/;
    this.singleLineBlockCommentRe= /^\s*(\/\*).*\*\/\s*$/;
    this.tripleStarBlockCommentRe = /^\s*(\/\*\*\*).*\*\/\s*$/;
    this.startRegionRe = /^\s*(\/\*|\/\/)#region\b/;
    this._getFoldWidgetBase = this.getFoldWidget;
    this.getFoldWidget = function(session, foldStyle, row) {
        var line = session.getLine(row);
    
        if (this.singleLineBlockCommentRe.test(line)) {
            if (!this.startRegionRe.test(line) && !this.tripleStarBlockCommentRe.test(line))
                return "";
        }
    
        var fw = this._getFoldWidgetBase(session, foldStyle, row);
    
        if (!fw && this.startRegionRe.test(line))
            return "start"; // lineCommentRegionStart
    
        return fw;
    };

    this.getFoldWidgetRange = function(session, foldStyle, row, forceMultiline) {
        var line = session.getLine(row);
        
        if (this.startRegionRe.test(line))
            return this.getCommentRegionBlock(session, line, row);
        
        var match = line.match(this.foldingStartMarker);
        if (match) {
            var i = match.index;

            if (match[1])
                return this.openingBracketBlock(session, match[1], row, i);
                
            var range = session.getCommentFoldRange(row, i + match[0].length, 1);
            
            if (range && !range.isMultiLine()) {
                if (forceMultiline) {
                    range = this.getSectionRange(session, row);
                } else if (foldStyle != "all")
                    range = null;
            }
            
            return range;
        }

        if (foldStyle === "markbegin")
            return;

        var match = line.match(this.foldingStopMarker);
        if (match) {
            var i = match.index + match[0].length;

            if (match[1])
                return this.closingBracketBlock(session, match[1], row, i);

            return session.getCommentFoldRange(row, i, -1);
        }
    };
    
    this.getSectionRange = function(session, row) {
        var line = session.getLine(row);
        var startIndent = line.search(/\S/);
        var startRow = row;
        var startColumn = line.length;
        row = row + 1;
        var endRow = row;
        var maxRow = session.getLength();
        while (++row < maxRow) {
            line = session.getLine(row);
            var indent = line.search(/\S/);
            if (indent === -1)
                continue;
            if  (startIndent > indent)
                break;
            var subRange = this.getFoldWidgetRange(session, "all", row);
            
            if (subRange) {
                if (subRange.start.row <= startRow) {
                    break;
                } else if (subRange.isMultiLine()) {
                    row = subRange.end.row;
                } else if (startIndent == indent) {
                    break;
                }
            }
            endRow = row;
        }
        
        return new Range(startRow, startColumn, endRow, session.getLine(endRow).length);
    };
    
    this.getCommentRegionBlock = function(session, line, row) {
        var startColumn = line.search(/\s*$/);
        var maxRow = session.getLength();
        var startRow = row;
        
        var re = /^\s*(?:\/\*|\/\/)#(end)?region\b/;
        var depth = 1;
        while (++row < maxRow) {
            line = session.getLine(row);
            var m = re.exec(line);
            if (!m) continue;
            if (m[1]) depth--;
            else depth++;

            if (!depth) break;
        }

        var endRow = row;
        if (endRow > startRow) {
            return new Range(startRow, startColumn, endRow, line.length);
        }
    };

}).call(FoldMode.prototype);

});

define("ace/mode/turtle",["require","exports","module","ace/lib/oop","ace/mode/text","ace/mode/turtle_highlight_rules","ace/mode/folding/cstyle"], function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var TextMode = require("./text").Mode;
var TurtleHighlightRules = require("./turtle_highlight_rules").TurtleHighlightRules;
var FoldMode = require("./folding/cstyle").FoldMode;

var Mode = function() {
    this.HighlightRules = TurtleHighlightRules;
    this.foldingRules = new FoldMode();
};
oop.inherits(Mode, TextMode);

(function() {
    this.$id = "ace/mode/turtle"
}).call(Mode.prototype);

exports.Mode = Mode;
});
