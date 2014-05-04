var express = require('express');
var http = require( 'http' );
var https = require( 'https' );
var cheerio = require( 'cheerio' );
 
var app = express();
 
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

// Used to get around sites that don't set Access-Control-Allow-Origin.
app.get( '/findfavicon', function( req, res ) {
	var url = req.query.url;

	var match = url.match( /(https?):\/\/\S+$/ );
	if( match )
	{
		var requestor = match[1] == 'https' ? https : http;
		requestor.get( url, function( response ) {
			if( response.statusCode == 200 )
			{
				var data = '';
				response.on( 'data', function( result ) {
					data += result.toString( 'utf-8' );
				});
				response.on( 'end', function( result ) {
					try {
						var $ = cheerio.load( data );
						var found = false;
						$( 'link' ).each( function( element ) {
							if( !found && this.attribs.rel == 'shortcut icon' )
							{
								var iconUrl = this.attribs.href;
								if( iconUrl.match( /(https?):\/\/\S+$/ ) )
									res.json( { 'valid': true, 'url': iconUrl });
								else
									res.json( { 'valid': true, 'url': url + iconUrl });
							}
						});
						if( !found )
							res.json( { 'valid': false });

					} catch( e ) {
						res.json( { 'valid': false, 'error': e.toString() });
					}
				});
			}
			else
			{
				res.json( { 'valid': false, 'statusCode': response.statusCode });
			}
		} ).on( 'error', function( e ) {
			res.json( { 'valid': false, 'error': e.toString() });
		});
	}
	else
		res.json( { 'valid': false });
})


var port = Number( process.env.PORT || 3000 );
app.listen( port, function() {
	console.log('Listening on port ' + port + '...');	
});
