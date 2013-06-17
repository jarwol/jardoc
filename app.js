var fs = require('fs'),
    glob = require('glob'),
    jsp = require('uglify-js'),
    async = require('async'),
    Parser = require('./parser'),
    opts = require('node-getopt').create([
        ['s' , 'source=ARG+'            , 'source file pattern(s)'],
        ['d'  , 'dest=ARG'                , 'output directory'],
        ['h' , 'help'                , 'display this help'],
        ['v' , 'version'             , 'show version']
    ]).bindHelp().parseSystem();

globFilePatterns(opts.options.source);

function parseFiles(data) {
    async.each(data, function (file, done) {
        file.ast = jsp.parse(file.text);
        done();
    }, function (err) {
        for (var i = 0; i < data.length; i++) {
            var ast = data[i].ast;
            var code = ast.print_to_string({
                comments : function (node, comment) {
                    Parser.parseComment(comment, node, data[i].file);
                }
            });
        }
        if (err) throw err;
    });
}

function globFilePatterns(patterns) {
    var files = [];
    async.each(patterns, function (pattern, done) {
        glob(pattern, null, function (err, list) {
            if (err) done(err);
            files = files.concat(list);
            done();
        });
    }, function (err) {
        if (err) throw err;
        readFiles(files);
    });
}

function readFiles(files) {
    var contents = [];
    async.each(files, function (item, done) {
        fs.readFile(item, 'utf8', function (err, text) {
            if (err) done(err);
            contents.push({file : item, text : text});
            done();
        });
    }, function (err) {
        if (err) throw err;
        parseFiles(contents);
    });
}