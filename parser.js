var cmtRegexp = /^\s*\*?(.)$/;

var Parser = function (module) {
    this.module = module;
    this.functions = {};
    this.members = {};
};

Parser.prototype.parseComment = function (comment) {
    if (comment.type === 'comment2' && comment.value.charAt(0) === '*') {
        var lines = comment.value.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var arr = cmtRegexp.exec(lines[i]);
            if (arr) {
                lines[i] = arr[1];
            }
        }
    }
}

exports.Parser = Parser;