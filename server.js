var express = require('express');
var request = require( 'request' );
var cheerio = require( 'cheerio' );
 
var app = express();
var faviconCache = {};

app.configure(function () {
    app.use(express.logger('dev'));     /* 'default', 'short', 'tiny', 'dev' */
    app.use(express.bodyParser());
    app.use(express.static(__dirname+'/public'));
});

app.get( '/addr/:address', function( req, res ) {
	res.sendfile( __dirname + '/public/address.html' );
});

app.get( '/', function( req, res ) {
	res.sendfile( __dirname + '/public/landing.html' );
});

require( './lib/svallet-express.js' ).attach( app );

var port = Number( process.env.PORT || 4000 );
app.listen( port, function() {
	console.log('Listening on port ' + port + '...');	
});
