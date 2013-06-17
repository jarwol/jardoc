var cmtRegexp = /^\s*\*?\s*(.+)$/;

var Parser = function () {
    this.files = {};
    this.currentTag = null;
    this.currentFile = null;
    this.currentModule = "";
    this.currentNode = {};
    this.buffer = [];
}

/**
 * Hash of functions that parse the specific tags within comments
 * @field processTag
 */
var processTag = {
    'module' : function (comment) {
        var words = comment.split(' ');
        if (words.length !== 1) {
            throw "Usage: @module name [description]";
        }
        this.currentModule = words[0];
    },
    'private' : function () {
        this.currentNode.private = true;
    },
    'description' : function (comment) {
        this.currentNode.description = comment;
    },
    'function' : function (comment) {
        var words = comment.split(' ');
        if (words.length !== 1) {
            throw "Usage: @function name";
        }
        this.currentNode.function = words[0];
    },
    field : function (comment) {
        var words = comment.split(' ');
        if (words.length !== 1) {
            throw "Usage: @field name";
        }
        this.currentNode.field = words[0];
    },
    section : function (comment) {
        var words = comment.split(' ');
        if (words.length !== 1) {
            throw "Usage: @section name";
        }
        this.currentNode.section = words[0];
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

        var val = {};
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
                type = words[0].substr(1, words[0].length - 2);
                name = words[1];
                desc = words.slice(2, words.length).join(' ');
            }
            else {
                name = words[0];
                desc = words.slice(1, words.length).join(' ');
            }
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
        if (!this.currentNode.params) {
            this.currentNode.params = [];
        }
        this.currentNode.params.push(val);
    }
};

/**
 * Parse the tags in an AST comment node into property hashes ready for formatting into markup
 * @function parseComment
 * @param comment
 * @param node the Javascript node that this comment is related to
 * @param {String} file name of the file this comment is in
 */
Parser.prototype.parseComment = function (comment, node, file) {
    if (!file) throw "File name required";
    this.currentFile = file;
    if (comment.type === 'comment2' && comment.value.charAt(0) === '*') {
        this.currentTag = "description";
        var lines = comment.value.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var arr = cmtRegexp.exec(lines[i]);
            if (arr) {
                processLine.call(this, arr[1]);
            }
        }
        if (this.currentTag && this.buffer.length > 0) {
            var tagFunction = processTag[this.currentTag];
            if (tagFunction) {
                tagFunction.call(this, this.buffer.join('\n').trim());
                processNode()
            }
            else {
                throw "Unsupported tag: " + this.currentTag;
            }
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
            processTag[this.currentTag].call(this, this.buffer.join('\n').trim());
            this.buffer = [];
        }
        this.currentTag = tag;
    }
    var trimmed = line.trim();
    if (this.buffer.length > 0 || trimmed.length > 0) {
        this.buffer.push(line);
    }
}

function processNode() {
    var val = this.currentNode;
    if (!this.files[this.currentFile]) {
        this.files[this.currentFile] = {};
    }
    if (!this.files[this.currentFile][this.currentModule]) {
        this.files[this.currentFile][this.currentModule] = {};
    }
    var slot = this.files[this.currentFile][this.currentModule];
    if (val.function) {
        if (!slot.functions) slot.functions = {};
        slot.functions[val.function] = val;
    }
    else if (val.field) {
        if (!slot.fields) slot.fields = {};
        slot.fields[val.field] = val;
    }
    else if (val.section) {
        if (!slot.sections) slot.sections = {};
        slot.sections[val.section] = val;
    }
    else {
        throw "Each comment section must contain one of the following tags: @function, @field, @section.";
    }
}

module.exports = new Parser();