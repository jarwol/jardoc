var fs = require('fs'),
    glob = require('glob'),
    jsp = require('uglify-js'),
    async = require('async'),
    Parser = require('./parser'),
    Handlebars = require('handlebars'),
    opts = require('node-getopt').create([
        ['s', 'source=ARG+', 'source file pattern(s)'],
        ['d', 'dest=ARG', 'output directory'],
        ['', 'template[=default.handlebars]', 'handlebars template'],
        ['h', 'help', 'display this help'],
        ['v', 'version', 'show version']
    ]).bindHelp().parseSystem();

var templateFn = null;

init();
globFilePatterns(opts.options.source);

function init() {
    Handlebars.registerHelper("key_val", function (obj, options) {
        var buffer = "";
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                buffer += options.fn({key : key, val : obj[key]});
            }
        }
        return buffer;
    });
    Handlebars.registerHelper("strip", function (str, options) {
        return str.replace(/\W/, "");
    });
    Handlebars.registerHelper('eq', function (val1, val2, options) {
        if (val1 == val2) {
            return options.fn(this);
        }
        return options.inverse(this);
    });
    Handlebars.registerHelper("debug", function (optionalValue) {
        console.log("Current Context");
        console.log("====================");
        console.log(this);

        if (optionalValue) {
            console.log("Value");
            console.log("====================");
            console.log(optionalValue);
        }
        console.log("\n");
    });
    Handlebars.registerPartial("field", fs.readFileSync("templates/field.handlebars", 'utf-8'))
    Handlebars.registerPartial("function", fs.readFileSync("templates/function.handlebars", 'utf-8'));
    var tmplFile = opts.options.template || "default.handlebars";
    var template = fs.readFileSync("templates/" + tmplFile, 'utf-8');
    templateFn = Handlebars.compile(template);
}

function parseFiles(data) {
    async.each(data, function (file, done) {
        file.ast = jsp.parse(file.text);
        done();
    }, function (err) {
        if (err) throw err;
        for (var i = 0; i < data.length; i++) {
            var ast = data[i].ast;
            var code = ast.print_to_string({
                comments : function (node, comment) {
                    Parser.parseComment(comment, node, data[i].file);
                }
            });
        }
        var html = templateFn({files : Parser.files});
        var dest = opts.options.dest || ".";
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        fs.writeFileSync(dest + "/index.html", html);
        copyFile("templates/default.css", dest);
    });
}

function copyFile(srcFile, dest) {
    var inStream = fs.createReadStream(srcFile);
    if (inStream) {
        var parts = srcFile.split("/");
        var fileName = parts[parts.length - 1];
        var outStream = fs.createWriteStream(dest + "/" + fileName);
        if (outStream) inStream.pipe(outStream);
    }
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