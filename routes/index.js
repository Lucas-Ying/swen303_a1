var express = require ( 'express' );
var router = express.Router ();

var basex = require ( 'basex' );
var client = new basex.Session ( "127.0.0.1", 1984, "admin", "admin" );

var cheerio = require('cheerio');

/* connect to the Colenso database */
client.execute ( "OPEN Colenso" );

var tei = "XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0'; ";

/* GET home page. */
router.get ( '/', function ( req, res) {
    client.execute ( tei + "(//name[@type='place'])[1]", function ( error, result ) {
        if ( error ) {
            console.error ( error );
        } else {
            res.render ( 'index', {title: 'Colenso', place: result.result, isHome: true } );
        }
    } );
} );

/* GET search result list page. */
router.get ( '/search', function (req, res) {
    var search = req.query.searchString;
    if (search !== undefined) {
        search = "'" + search + "'";
        console.log(search);
        var query = tei +
            "for $n in (//TEI[. contains text" + search + "])\n" +
            "return concat('<result><path>', db:path($n), '</path>\n <title>', $n//title, '</title>\n <size>', string-length($n), '</size></result>\n')";
        client.execute(query, function (error, result) {
            if (error) {
                console.error(error);
            } else {
                //var results = result.result.split('\n');
                var results = [];
                $ = cheerio.load(result.result, {xmlMode: true});
                $('result').each(function(i, elem){
                    results[i] = {
                        path: $(elem).find('path').first().text(),
                        title: $(elem).find('title').first().text(),
                        size: $(elem).find('size').first().text(),
                    }
                });
                res.render('search', {title: 'Search', results: results});
            }
        });
    } else {
        res.render('search', {title: 'Search'});
    }
} );

/* GET browse page. */
router.get ( '/browse', function ( req, res) {
    var query = tei +
        "for $n in (//TEI)\n" +
        "return concat('<result><path>', db:path($n), '</path>\n <title>', $n//title, '</title>\n <size>', string-length($n), '</size></result>\n')";
    client.execute(query, function (error, result) {
        if ( error ) {
            console.error ( error );
        } else {
            var results = [];
            $ = cheerio.load(result.result, {xmlMode: true});
            $('result').each(function(i, elem){
                results[i] = {
                    path: $(elem).find('path').first().text(),
                    title: $(elem).find('title').first().text(),
                    size: $(elem).find('size').first().text(),
                }
            });
            res.render('browse', {title: 'Browse', results: results});
        }
    } );
} );

/* GET content display page. */
router.get ( '/file/*', function (req, res) {
    var path = req.originalUrl.replace('/file/','');
    var query = "XQUERY doc('Colenso/"+ path + "')";
    client.execute ( query, function ( error, result ) {
        if ( error ) {
            console.error ( error );
        } else {
            var doc_data = cheerio.load(result.result, {xmlMode: true});
            var parsed_data = doc_data('TEI');
            var info = {
                id: parsed_data.attr('xml:id'),
                title: parsed_data.find('title').first().text(),
                author: parsed_data.find('author').first().text()
            };
            res.render ( 'display', {title: 'Display', letter: result.result, info: info} );
        }
    } );
} );

module.exports = router;
