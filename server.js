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

// Used to get around sites that don't set Access-Control-Allow-Origin.
app.get( '/findfavicon', function( req, res ) {
	var url = req.query.url;

	var match = url.match( /(https?):\/\/\S+$/ );
	if( match )
	{
		var cachedValue = faviconCache[ url ];

		if( cachedValue && (( new Date().getTime() - cachedValue.timestamp  ) < 600000 ))
		{
			res.json( { 'valid': true, 'url': cachedValue.url });
		}
		else
		{
			request.get( url, function( error, message, response ) {
				if( error )
				{
					res.json( { 'valid': false, 'error': error.toString() });
				}
				else
				{
					try {
						var $ = cheerio.load( response );
						var found = false;
						$( 'link' ).each( function( element ) {
							if( !found && this.attribs.rel == 'shortcut icon' )
							{
								found = true;
								var iconUrl = this.attribs.href;
								if( !iconUrl.match( /(https?):\/\/\S+$/ ) )
								{
									if( iconUrl.substring( 0,1 ) == '/' )
										iconUrl = url + iconUrl;
									else
										iconUrl = url + '/' + iconUrl;
								}
								faviconCache[ url ] = {
									'url': iconUrl,
									'timestamp': new Date().getTime()
								};
								res.json( { 'valid': true, 'url': iconUrl });
							}
						});
						if( !found )
							res.json( { 'valid': false });

					} catch( e ) {
						res.json( { 'valid': false, 'error': e.toString() });
					}
				}
			});
		}
	}
	else
		res.json( { 'valid': false });
})


var port = Number( process.env.PORT || 3000 );
app.listen( port, function() {
	console.log('Listening on port ' + port + '...');	
});
