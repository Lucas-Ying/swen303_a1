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
    var inputString = req.query.searchString;
    if (inputString !== undefined) {
        inputString = inputString.replace(inputString, "'" + inputString + "'");
        console.log(inputString);
        var search_query = tei + "//TEI[. contains text " + inputString + "]";
        client.execute(search_query, function (error, result) {
            if (error) {
                console.error(error);
            } else {
                var doc_data = cheerio.load(result.result, {xmlMode: true});
                var parsed_data = doc_data('TEI');
                var xmls = [];
                parsed_data.each(function (i, elem) {
                    xmls[i] = {
                        id: doc_data(elem).attr('xml:id'),
                        title: doc_data(elem).find('title').first().text(),
                        author: doc_data(elem).find('author').first().text()
                    }
                });
                res.render('index', {title: 'Result', search_result: xmls});
            }
        });
    } else {
        res.render('index', {title: 'Search'});
    }
} );

/* GET content display page. */
router.get ( '/letters/:id', function (req, res) {
    var isDisplay;
    var id = req.params.id;
    var display_query = tei + '//TEI[@xml:id="' + id + '"]';
    client.execute ( display_query, function ( error, result ) {
        if ( error ) {
            console.error ( error );
        } else {
            isDisplay = true;
            var doc_data = cheerio.load(result.result, {xmlMode: true});
            var parsed_data = doc_data('TEI');
            var info = {
                id: parsed_data.attr('xml:id'),
                title: parsed_data.find('title').first().text(),
                author: parsed_data.find('author').first().text()
            }
            res.render ( 'index', {title: 'Display', letter: result.result, info: info, isDisplay: isDisplay } );
        }
    } );
} );


module.exports = router;
