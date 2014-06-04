var express = require('express');
var svallet_core = require( 'svallet-core' );
 
var app = express();
var faviconCache = {};

app.configure(function () {
    app.use(express.logger('dev'));     /* 'default', 'short', 'tiny', 'dev' */
    app.use(express.bodyParser());
    app.use(express.static(__dirname+'/public'));
    app.use(express.static( __dirname + '/node_modules/svallet-core/public' ));
});

app.get( '/addr/:address', function( req, res ) {
	res.sendfile( __dirname + '/public/address.html' );
});

app.get( '/', function( req, res ) {
	res.sendfile( __dirname + '/public/landing.html' );
});

svallet_core.attach( app );

var port = Number( process.env.PORT || 4000 );
app.listen( port, function() {
	console.log('Listening on port ' + port + '...');	
});
