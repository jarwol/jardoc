var cmtRegexp = /^\s*\*?(.)$/;

/**
 *
 * @param {String} file name of the file being parsed
 */
var Parser = function () {
    this.files = {};
    this.currentModule = null;
    this.currentTag = null;
    this.currentFile = null;
    this.buffer = [];
}

/**
 * Hash of functions that parse the specific tags within comments
 * @name processTag
 */
var processTag = {
    'module' : function (comment) {
        var val = {type : "module"};
        var words = comment.split(' ');
        if (words.length !== 1) {
            throw "Usage: @module name [description]";
        }
        val.name = words[0];
        return val;
    },
    'private' : function () {
        return {type : 'private'};
    },
    'description' : function (comment) {
        return {type : 'description', description : comment};
    },
    'function' : function (comment) {
        var val = {type : "function"};
        var words = comment.split(' ');
        if (words.length !== 1) {
            throw "Usage: @function name";
        }
        val.name = words[0];
        return val;
    },
    param : function (comment) {
        function isType(str) {
            var firstChar = str.charAt(0);
            var lastChar = str.charAt(str.length - 1);
            return firstChar === '{' && lastChar === '}';
        }

        function isOptional(str) {
            var firstChar = str.charAt(0);
            var lastChar = str.charAt(str.length - 1);
            if ((firstChar === '[' && lastChar !== ']') || (firstChar !== '[' && lastChar === ']')) throw "Optional param must be enclosed in []";
            return firstChar === '[';
        }

        var val = {type : "param"};
        var words = comment.split(' ');
        var type = null;
        var name = null;
        var desc = null;
        if (words.length < 1) {
            throw "Usage: @param [type] paramName[=defaultVal]";
        }
        if (words.length === 1) {
            name = words[0];
        }
        else {
            if (isType(words[0])) {
                type = words[0].substr(1, type.length - 2);
                name = words[1];
                desc = words.slice(2, words.length).join(' ');
            }
            else {
                name = words[0];
                desc = words.slice(1, words.length).join(' ');
            }

            val.optional = isOptional(name);
            val.paramType = type;
            val.description = desc;
            if (val.optional) {
                name = name.substr(1, name.length - 2);
                var parts = name.split('=');
                val.paramName = parts[0];
                if (parts.length === 2) {
                    val.default = parts[1];
                }
            }
            else {
                val.paramName = name;
            }
            return val;
        }
    }
};

/**
 *
 * @param comment
 * @param node the Javascript node that this comment is related to
 * @param {String} file name of the file this comment is in
 */
Parser.prototype.parseComment = function (comment, node, file) {
    if (!file) throw "File name required";
    this.currentFile = file;
    if (comment.type === 'comment2' && comment.value.charAt(0) === '*') {
        var lines = comment.value.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var arr = cmtRegexp.exec(lines[i]);
            if (arr) {
                processLine(arr[1]);
            }
        }
        if (this.currentTag && this.buffer.length > 0) {
            processTag[this.currentTag](this.buffer.join('\n'));
        }
        this.buffer = [];
        this.currentTag = null;
    }
}

function processLine(line) {
    if (line.charAt(0) === '@') {
        var words = line.split(' ');
        var tag = words[0].substr(1, words[0].length - 1);
        if (words.length > 1) {
            line = words.slice(1, words.length).join(' ');
        }
        if (this.currentTag && this.buffer.length > 0) {
            processTag[this.currentTag](this.buffer.join('\n'));
            this.buffer = [];
        }
        this.currentTag = tag;
    }
    if (line.length > 0) {
        this.buffer.push(line);
    }
}

module.exports = new Parser();