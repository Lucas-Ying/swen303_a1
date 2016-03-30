var express = require ( 'express' );
var router = express.Router ();

var basex = require ( 'basex' );
var client = new basex.Session ( "127.0.0.1", 1984, "admin", "admin" );

var cheerio = require('cheerio');
var multer = require('multer');
var fs = require('fs');

/* connect to the Colenso database */
client.execute ( "OPEN Colenso" );

var tei = "XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0'; ";

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '../Colenso/uploads');
    },
    filename: function (req, file, cb) {
        if (!fs.existsSync('../Colenso/uploads')){
            fs.mkdirSync('../Colenso/uploads');
        }
        var extension = file.originalname.substring(file.originalname.lastIndexOf('.')+1);
        if (extension != "xml") {
            cb("Invalid file type (only .xml is allowed).", null);
        }
        else {
            cb(null, file.originalname);
        }
    }
});

var upload = multer({storage: storage}).single('file');

router.get ( '/', function ( req, res) {
    client.execute ( tei + "(//name[@type='place'])[1]", function ( error, result ) {
        if ( error ) {
            console.error ( error );
        } else {
            res.render ( 'index', {title: 'Colenso', place: result.result, isHome: true } );
        }
    } );
} );

router.get ( '/search', function (req, res) {
    var search = req.query.searchString;
    if (search !== undefined) {
        search = search
            .replace(/\s*&\s*/, "' ftand '")
            .replace(/\s*\|\s*/, "' ftor '")
            .replace(/\s*!\s*/, "' ftnot '")
            .replace(" AND ", "' ftand '")
            .replace(" NOT ", "' ftnot '")
            .replace(" OR ", "' ftor '");
        search = "'" + search + "'";
        var query = tei +
            "for $n in (//TEI[. contains text " + search + " using wildcards])\n" +
            "return concat('<result><path>', db:path($n), '</path>\n <title>', $n//title, '</title>\n <size>', string-length($n), '</size></result>\n')";
        client.execute(query, function (error, result) {
            if (error) {
                console.error(error);
            } else {
                var results = [];
                var count = 0;
                $ = cheerio.load(result.result, {xmlMode: true});
                $('result').each(function(i, elem){
                    count++;
                    results[i] = {
                        path: $(elem).find('path').first().text(),
                        title: $(elem).find('title').first().text(),
                        size: $(elem).find('size').first().text(),
                    }
                });
                res.render('search', {title: 'Search', results: results, count: count, search: req.query.searchString});
            }
        });
    } else {
        res.render('search', {title: 'Search'});
    }
} );

router.get ( '/searchQuery', function (req, res) {
    var search = req.query.searchString;
    if (search !== undefined) {
        var query = tei +
            "for $n in (" + search + ")\n" +
            "return concat('<result><path>', db:path($n), '</path>\n <title>', $n//title, '</title>\n <size>', string-length($n), '</size></result>\n')";
        client.execute(query, function (error, result) {
            if (error) {
                console.error(error);
            } else {
                var results = [];
                var count = 0;
                $ = cheerio.load(result.result, {xmlMode: true});
                $('result').each(function(i, elem){
                    count++;
                    results[i] = {
                        path: $(elem).find('path').first().text(),
                        title: $(elem).find('title').first().text(),
                        size: $(elem).find('size').first().text(),
                    }
                });
                res.render('search', {title: 'Search', results: results, count: count, search: req.query.searchString});
            }
        });
    } else {
        res.render('search', {title: 'Search'});
    }
} );

router.get ( '*/browse', function ( req, res) {
    var original_dir = req.originalUrl.replace('/','').replace('/browse', '').split('/');
    var depth = original_dir.length;
    var query = tei +
        "for $n in (//TEI)\n" +
        "return concat('<result><path>', db:path($n), '</path>\n <title>', $n//title, '</title>\n <size>', string-length($n), '</size></result>\n')";
    client.execute(query, function (error, result) {
        if ( error ) {
            console.error ( error );
        } else {
            var results = [];
            var count = 0;
            var subdirectories = [];
            var isPush;
            if (depth > 1) {
                $ = cheerio.load(result.result, {xmlMode: true});
                $('result').each(function (i, elem) {
                    isPush = true;
                    var path = $(elem).find('path').first().text();
                    var path_directories = path.split('/');
                    var original_p = '';
                    var path_d = '';
                    for (var i = 0; i < depth-1; i++){
                        original_p = original_p + original_dir[i+1] + '/';
                    }
                    for (var i = 0; i < depth-1; i++){
                        path_d = path_d + path_directories[i] + '/';
                    }
                    if (original_p == path_d) {
                        for (var i = 0; i < subdirectories.length; i++) {
                            if (subdirectories[i] == path_d + path_directories[depth - 1]) {
                                isPush = false;
                            }
                        }
                        if (isPush) {
                            subdirectories.push(path_d + path_directories[depth - 1]);
                            count++;
                        }
                        results[i] = {
                            path: path,
                            title: $(elem).find('title').first().text(),
                            size: $(elem).find('size').first().text()
                        }
                    }
                });
            } else {
                $ = cheerio.load(result.result, {xmlMode: true});
                $('result').each(function (i, elem) {
                    isPush = true;
                    var path = $(elem).find('path').first().text();
                    var path_directories = path.split('/');
                    for (var i = 0; i < subdirectories.length; i++) {
                        if (subdirectories[i] == path_directories[0]) {
                            isPush = false;
                        }
                    }
                    if (isPush) {
                        subdirectories.push(path_directories[0]);
                        count++;
                    }
                    results[i] = {
                        path: path,
                        title: $(elem).find('title').first().text(),
                        size: $(elem).find('size').first().text()
                    }
                });
            }
            res.render('browse', {title: 'Browse', results: results, count: count, subdirectories: subdirectories, depth: depth, original_dir: original_dir});
        }
    } );
} );

router.get ( '*/display', function (req, res) {
    var path = req.originalUrl.replace('/','').replace('/display', '');
    var query = "XQUERY doc('"+ path + "')";
    client.execute ( query, function ( error, result ) {
        if ( error ) {
            console.error ( error );
        } else {
            $ = cheerio.load(result.result, {xmlMode: true});
            var header = $('teiHeader');
            var info = {
                id: $('TEI').attr('xml:id'),
                author_url: $('name').attr('key'),
                title: header.find('title').first().text(),
                author: header.find('author').first().text(),
                date: header.find('date').first().text(),
            };
            res.render ( 'display', {title: 'Display', letter: result.result.match(/<text>[\s\S]*?<\/text>/), info: info, url: req.originalUrl} );
        }
    } );
} );

router.get ( '*/displayXML', function (req, res) {
    var path = req.originalUrl.replace('/','').replace('/displayXML', '');
    var query = "XQUERY doc('"+ path + "')";
    client.execute ( query, function ( error, result ) {
        if ( error ) {
            console.error ( error );
        } else {
            $ = cheerio.load(result.result, {xmlMode: true});
            var header = $('teiHeader');
            var info = {
                id: $('TEI').attr('xml:id'),
                author_url: $('name').attr('key'),
                title: header.find('title').first().text(),
                author: header.find('author').first().text(),
                date: header.find('date').first().text(),
            };
            res.render ( 'displayXML', {title: 'Display', letter: result.result, info: info, url: req.originalUrl} );
        }
    } );
} );

router.post( '*/saveXML', function(req, res) {
    //var query = "REPLACE " + req.originalUrl.replace('/displayXML', '') + " " + req.query.data;
    var path = req.originalUrl.replace('/Colenso/','').replace('/saveXML', '');
    var xml_data = req.body.xml_text;
    var query = "REPLACE "+path+" "+xml_data;
    fs.writeFile("../Colenso/" + path, xml_data, function(err){
        if (err) throw err;
        console.log('It\'s saved!');
    });
    client.execute(query, function(error, result){
        if(error){
            console.error(error);
        } else {
            res.redirect("/Colenso/" + path + "/displayXML");
        }
    });
});

router.get("*/remove", function (req, res) {
    var path = req.originalUrl.replace('/Colenso','').replace('/remove', '');
    var query = "DELETE "+path;
    fs.unlink("../Colenso/" + path, function(err){
        if (err) throw err;
        console.log('It\'s removed!');
    });
    client.execute(query, function (error, result) {
        if(error){ console.error(error);}
        else{
            console.log("file was deleted");
            res.redirect('/');
        }
    })
})

router.get ( '*/download', function (req, res) {
    var path = req.originalUrl.replace('/','').replace('/download', '');
    var query = "XQUERY doc('"+ path + "')";
    client.execute ( query, function ( error, result ) {
        if ( error ) {
            console.error ( error );
        } else {
            res.set('Content-Type', 'text/xml');
            res.send(result.result);
        }
    } );
} );

router.get ( '/downloadSearchResults', function (req, res) {
    var path = req.originalUrl.replace('/','').replace('/download', '');
    var query = "XQUERY doc('"+ path + "')";
    client.execute ( query, function ( error, result ) {
        if ( error ) {
            console.error ( error );
        } else {
            res.set('Content-Type', 'text/xml');
            res.send(result.result);
        }
    } );
} );

router.get ( '/upload', function (req, res) {
    res.render('upload', { title: 'Upload', message: ""  });
} );

router.post('/upload', function(req, res){
    upload(req, res, function (err) {
        if (err) {
            // An error occurred when uploading
            res.render('upload', { title: 'Upload', message: err , isErr: true});
        } else {
            // Everything went fine
            res.render('upload', { title: 'Upload', message: "Uploaded successfully", isSucceed: true  });
        }
    })
});

module.exports = router;
