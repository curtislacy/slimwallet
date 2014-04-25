var AddressData = Backbone.Model.extend( {
	// address: the bitcoin address we're viewing.
});
var BalanceData = Backbone.Model.extend( {
	// Map currency ID to balance.
	// Map "currencyID-source" to source of the data.
});
var ValueData = Backbone.Model.extend( {
	// Map currencyID to value.
	// Map "currencyID-source" to source of the data.
});
var CoinData = Backbone.Model.extend( {
	/* Map currencyID to coin description data:
	{
		"name": "Mastercoin",
		"description": "SAFE Network Crowdsale (MSAFE)",
		"divisible": true
	}
	
	Map "currencyID-source" to source of the data. */
});
var slimWalletData = {
	"addressData": new AddressData(),
	"balances": new BalanceData(),
	"values": new ValueData(),
	"coinData": new CoinData()
}
var workers = {};

var formatters = {
	USD: function( value ){ return '$' + value.toFixed( 2 ) },
	bitcoin: function( value ) { return ( value * 1000 ).toFixed( 8 ) + ' mBTC' },
	MSC: function( value ) { return value.toFixed( 8 ) + ' MSC' },
	TMSC: function( value ) { return value.toFixed( 8 ) + ' TMSC' },
	SPdivisible: function( value ) {
		return value.toFixed( 8 );
	},
	SPindivisible: function( value ) {
		return value.toFixed( 0 );
	}
}
function formatCurrency( currency, value ) {
	if( formatters[ currency ])
		return formatters[ currency ]( value );
	else if( currency.match( /SP[0-9]+/ ))
	{
		var propertyData = slimWalletData.coinData.get( currency );

		if( propertyData && propertyData.divisible )
		{
			return formatters.SPdivisible( value );
		}
		else
		{
			return formatters.SPindivisible( value );
		}
	}
}

var addressQR = null;

$( function() {
	if( document.getElementById( "address-qr" ))
	{
		addressQR = new QRCode( document.getElementById( "address-qr" ), {
			width: 128,
			height: 128
		});		
	}

	attachModelSetters( slimWalletData );
	attachModelListeners( slimWalletData );

	initModelData( slimWalletData );

	// This HAS to happen after the rest of the UI syncs up, since address changes
	// after this point will redirect the browser.
	slimWalletData.addressData.on( 'change:address', function( data ) {
		window.location.href = '/addr/' + data.changed.address;
	});

});

// Attach listeners to UI components that set data in the model.
// DO NOT CHANGE ANY UI COMPONENT VALUES HERE!
function attachModelSetters( data ) {
	$( '#address-search' ).submit(function(e) {
		e.preventDefault();
		data.addressData.set( { address: $( '#address-search input' ).val() });
	});

	workers[ 'balanceQuery' ] = new BalanceQueryWorker( data );
	workers[ 'valueQuery' ] = new ValueQueryWorker( data );
	workers[ 'coinDataQuery' ] = new CoinDataQueryWorker( data );
};

// Attach listeners to the data model that populate the UI based on its data.
// DO NO READ FROM ANY UI COMPONENTS HERE!
function attachModelListeners( data ) {

	// Update the display of the currently viewed address in the UI.
	data.addressData.on( 'change:address', function( data ) {
		$( '#address-search input' ).attr( 'placeholder', data.changed.address );
		$( '#address-display' ).text( data.changed.address );
		window.document.title = 'SlimWallet - ' + data.changed.address;
		if( addressQR )
		{
			addressQR.clear();
			addressQR.makeCode( data.changed.address );			
		}
	} );

	data.balances.on( 'change', function( data ) {
		for( var v in data.changed )
			if( data.changed.hasOwnProperty( v ))
			{
				if( v.indexOf( '-source' ) != v.length - 7 )
					updateBalanceTable( v );
			}
	} );

	data.values.on( 'change', function( data ) {
		for( var v in data.changed )
			if( data.changed.hasOwnProperty( v ))
			{
				if( v.indexOf( '-source' ) != v.length - 7 )
					updateValues( v );
			}
	});

	data.coinData.on( 'change', function( data ) {
		for( var v in data.changed )
			if( data.changed.hasOwnProperty( v ))
			{
				if( v.indexOf( '-source' ) != v.length -7 )
				{
					updateCoinData( v );
					updateBalanceTable( v );
				}
			}
	});

};

// Populate the data model as needed.
function initModelData( data ) {

	var addressMatch = window.location.href.match( /\/addr\/([a-zA-Z0-9]+)$/ );
	if( addressMatch )
		data.addressData.set( { address: addressMatch[1] } );

};

var balanceTableTemplate = _.template( "\
	<div class=\"col-lg-12\" id=\"<%= currency %>-balances\">\
            <h2 id=\"<%= currency %>-name\"><%= currencyName %></h2>\
            <div class=\"table-responsive\">\
              <table class=\"table table-hover table-striped tablesorter\">\
                <thead>\
                  <tr>\
                    <th>Address <i class=\"fa fa-sort\"></i></th>\
                    <th>Balance <i class=\"fa fa-sort\"></i></th>\
                  </tr>\
                </thead>\
                <tbody>\
                  <tr>\
                    <td><%= address %></td>\
                    <td id=\"<%= currency %>-balance\"><%= balance %></td>\
                  </tr>\
                </tbody>\
              </table>\
            </div>\
    </div>\
");
function updateBalanceTable( currency ) {
	var existingTables = $( '#balance-tables #' + currency + '-balances' );
	if( existingTables.length == 0 )
	{
		var balance = slimWalletData.balances.get( currency );
		if( balance > 0 )
		{
			// Make a new table.
			var coinData = slimWalletData.coinData.get( currency );
			var currencyName = currency;
			if( coinData && coinData.name )
				currencyName = coinData.name;

			$( '#balance-tables' ).append( $( balanceTableTemplate( 
				{ 
					"currencyName": currencyName,
					"currency": currency,
					"address": slimWalletData.addressData.get( 'address' ),
					"balance": '<a href="' + 
						slimWalletData.balances.get( currency + '-source' ) + 
						'">' +
						formatCurrency( currency, balance ) +
						'</a>'
				}
			)));

		}
	}
	else
	{
		$( '#balance-tables #' + currency + '-balances td#' + currency + '-balance' )
			.html( '<a href="' + 
					slimWalletData.balances.get( currency + '-source' ) + 
					'">' +
					formatCurrency( currency, slimWalletData.balances.get( currency ) ) +
					'</a>' );
	}

	// We'll need to update the values, if they exist.
	updateValues( currency );
}
function updateValues( currency ) {
	var balance = slimWalletData.balances.get( currency );
	if( balance != null )
	{
		var value = slimWalletData.values.get( currency );
		if( value != null )
		{
			var valueOfBalance = balance * slimWalletData.values.get( currency );

			var outputFields = $( '#balance-tables #' + currency + '-balances td#' + currency + '-value' );
			if( outputFields.length == 0 )
			{
				$( '#balance-tables #' + currency + '-balances thead tr' ).append( 
					$( '<th>' ).html( 'Value <i class="fa fa-sort"></i>' ));
				$( '#balance-tables #' + currency + '-balances tbody tr' ).append( 
					$( '<td>' )
						.attr( 'id', currency + '-value')
						.append( $( '<a>' )
							.attr( 'href', slimWalletData.values.get( currency + '-source' ) )
							.text( formatCurrency( 'USD', valueOfBalance ))
						)
					);
			}
			else
			{
				$( '#balance-tables #' + currency + '-balances tbody td#' + currency + '-value a' )
					.text( formatCurrency( 'USD', valueOfBalance ));
			}

		}
	}
}

function updateCoinData( currency ) {
	var data = slimWalletData.coinData.get( currency );
	if( data != null )
	{
		$( '#balance-tables #' + currency + '-balances #' + currency + '-name' )
			.text( data.name );
	}
}

// Actually recovers balances asyncronously.
function BalanceQueryWorker( data ) {
	var self = this;
	this.addressModel = data.addressData;
	this.balances = data.balances;
	this.addressModel.on( 'change:address', function( data ) {
		self.setAddress( data.changed.address );
	} );
}
BalanceQueryWorker.prototype.setAddress = function( newAddress ) {
	if( this.loop )
		clearTimeout( this.loop );
	this.loop = setTimeout( this.getBalances.bind( this ) );
}
BalanceQueryWorker.prototype.getBalances = function() {
	var self = this;
	var originalAddress = this.addressModel.get( 'address' );

	var queriesComplete = 0;
	var queriesMade = 0;

	queriesMade++;
	$.getJSON( 'https://btc.blockr.io/api/v1/address/info/' + originalAddress )
		.done( function( response ) {
			queriesComplete++;
			if( originalAddress == self.addressModel.get( 'address' ))
			{
				if( response.code == 200 )
				{
					self.balances.set( { 
						'bitcoin': response.data.balance,
						'bitcoin-source': 'https://btc.blockr.io/address/info/' + originalAddress 
					});
				}
				if( queriesComplete == queriesMade )
					self.loop = setTimeout( self.getBalances.bind( self ), 30000 );
			}
		} )
		.error( function() {
			queriesComplete++;
			if( originalAddress == self.addressModel.get( 'address' ))
			{
				if( queriesComplete == queriesMade )
					self.loop = setTimeout( self.getBalances.bind( self ), 30000 );			
			}
		});

	queriesMade++;
	$.getJSON( 'https://masterchain.info/addr/' + originalAddress + '.json' )
		.done( function( response ) {
			queriesComplete++;
			if( originalAddress == self.addressModel.get( 'address' ))
			{
				console.log( '** Masterchain result:' );
				console.log( response );
/*				if( response.code == 200 )
				{
					self.balances.set( { 
						'bitcoin': response.data.balance,
						'bitcoin-source': 'https://btc.blockr.io/address/info/' + originalAddress 
					});
				}
				*/
				if( queriesComplete == queriesMade )
					self.loop = setTimeout( self.getBalances.bind( self ), 30000 );

			}
		} )
		.error( function() {
			queriesComplete++;
			if( originalAddress == self.addressModel.get( 'address' ))
			{
				if( queriesComplete == queriesMade )
					self.loop = setTimeout( self.getBalances.bind( self ), 30000 );
			}
		});

	queriesMade++;
	$.post( 'https://test.omniwallet.org/v1/address/addr/',
		{ addr: originalAddress },
		function( response ) {
			queriesComplete++;
			if( originalAddress == self.addressModel.get( 'address' ))
			{
				if( response.balance )
				{
					var structure = {};
					for( var v in response.balance )
					{
						var item = response.balance[v];
						// Ignore bitcoin for now, since we don't have consensus stuff built yet.
						if( item.symbol == 'BTC' )
						{
						}
						else if( item.symbol == 'MSC' || item.symbol == 'TMSC' )
						{
							structure[ item.symbol ] = item.value / 100000000;
							structure[ item.symbol + '-source' ] = 'https://test.omniwallet.org/'
						}
						else
						{
							structure[ item.symbol ] = item.value;
							structure[ item.symbol + '-source' ] = 'https://test.omniwallet.org/'
						}
					}
					self.balances.set( structure );
				}
				
				if( queriesComplete == queriesMade )
					self.loop = setTimeout( self.getBalances.bind( self ), 30000 );

			}
		} ).fail( function() {
			queriesComplete++;
				if( queriesComplete == queriesMade )
					self.loop = setTimeout( self.getBalances.bind( self ), 30000 );			
		});

	
	// blockchain.info doesn't return Access-Control-Allow-Origin, so we can't get to it.
	// We may be able to form things properly such that CORS works, see: https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS
/*	$.getJSON( 'https://blockchain.info/address/' + originalAddress + '?format=json&cors=true',
		function( response ) {
			if( originalAddress == self.addressModel.get( 'address '))
			{
				if( response.code == 200 )
				{
					console.log( 'Blockchain.info response' );
					console.log( response.data );
				}
			}
	});*/

	
}

// Recovers values of currencies.
function ValueQueryWorker( data ) {
	var self = this;
	this.balances = data.balances;
	this.values = data.values;
	this.loops = {};
	this.balances.on( 'change', function( data ) {
		for( var v in data.changed )
		{
			if( data.changed.hasOwnProperty( v ))
			{
				if( v.indexOf( '-source' ) != v.length - 7 )
					if( !self.loops[ v ])
						self.addCurrency( v );
			}
		}
	});
}
ValueQueryWorker.prototype.addCurrency = function( currency ) {
	this.loops[ currency ] = setTimeout( this.getValues.bind( {
		self: this,
		currency: currency
	} ));
}
ValueQueryWorker.prototype.getValues = function() {
	var outerThis = this;
	var self = this.self;
	var currency = this.currency;
	if( this.currency == 'bitcoin' )
	{

		// This call actually tends to time out - an ideal situation for having multiple sources!
		$.getJSON( 'http://btc.blockr.io/api/v1/exchangerate/current',
			function( response ) {
				if( response.code == 200 )
				{
					var usdToBtc = parseFloat( response.data[0].rates.BTC );
					self.values.set( {
						'bitcoin': 1.0 / usdToBtc,
						'bitcoin-source': 'http://btc.blockr.io',
					});
				}
				self.loops[ currency ] = setTimeout( self.getValues.bind( outerThis ), 30000 );
			}
		);
		$.getJSON( 'https://api.bitcoinaverage.com/exchanges/USD',
			function( response ) {
					console.log( 'BitcoinAverage response: ' );
					console.log( response );
//					if( response )
/*					var usdToBtc = parseFloat( response.data[0].rates.BTC );
					self.values.set( {
						'bitcoin': 1.0 / usdToBtc,
						'bitcoin-source': 'http://btc.blockr.io',
					});*/
				//self.loops[ currency ] = setTimeout( self.getValues.bind( outerThis ), 30000 );
			}
		);
	}
	else if( this.currency == 'MSC' )
	{
		$.getJSON( 'https://masterxchange.com/api/trades.php',
			function( response ) {
				var totalCoins = 0;
				var totalValue = 0;
				for( var i = 0; i<response.length; i++ )
				{
					if( response[i].market == 'btc/msc' )
					{
						totalCoins += parseFloat( response[i].amount );
						totalValue += parseFloat( response[i].amount * response[i].price );
					}
				}
				var averageValue = totalValue / totalCoins;
				if( self.values.get( 'bitcoin' ))
				{
					var mscToUsd = averageValue * self.values.get( 'bitcoin' );
					self.values.set( {
						'MSC': mscToUsd,
						'MSC-source': 'https://masterxchange.com/'
					});
				}
				self.loops[ currency ] = setTimeout( self.getValues.bind( outerThis ), 30000 );
			}
		);
	}
	else if( this.currency == 'SP3' )
	{
		$.getJSON( 'https://masterxchange.com/api/trades.php',
			function( response ) {
				var totalCoins = 0;
				var totalValue = 0;
				for( var i = 0; i<response.length; i++ )
				{
					if( response[i].market == 'btc/maid' )
					{
						totalCoins += parseFloat( response[i].amount );
						totalValue += parseFloat( response[i].amount * response[i].price );
					}
				}
				if( totalCoins > 0 )
				{
					var averageValue = totalValue / totalCoins;
					if( self.values.get( 'bitcoin' ))
					{
						var maidToUsd = averageValue * self.values.get( 'bitcoin' );
						self.values.set( {
							'SP3': maidToUsd,
							'SP3-source': 'https://masterxchange.com/'
						});
					}					
				}
				else
				{
					self.values.unset( 'SP3' );
				}
				self.loops[ currency ] = setTimeout( self.getValues.bind( outerThis ), 30000 );
			}
		);
	}
}


// Recovers coinDatas of currencies.
function CoinDataQueryWorker( data ) {
	var self = this;
	this.balances = data.balances;
	this.coinData = data.coinData;
	this.loops = {};
	this.balances.on( 'change', function( data ) {
		for( var v in data.changed )
		{
			if( data.changed.hasOwnProperty( v ))
			{
				if( v.indexOf( '-source' ) != v.length - 7 )
					if( !self.loops[ v ])
						self.addCurrency( v );
			}
		}
	});
}
CoinDataQueryWorker.prototype.addCurrency = function( currency ) {
	this.loops[ currency ] = setTimeout( this.getCoinData.bind( {
		self: this,
		currency: currency
	} ));
}
CoinDataQueryWorker.prototype.getCoinData = function() {
	var outerThis = this;
	var self = this.self;
	var currency = this.currency;

	if( currency == 'bitcoin' )
	{
		$.getJSON( 'http://btc.blockr.io/api/v1/coin/info',
			function( response ) {
				if( response.code == 200 )
				{
					self.coinData.set( {
						"bitcoin": {
							"name": response.data.coin.name
						}
					});
					self.loops[ currency ] = setTimeout( self.getCoinData.bind( outerThis ), 30000 );
				}
/*				if( response[0] )
				{
					var extractedData = {};
					extractedData[ currency + '-source' ] = 'https://test.omniwallet.org/';
					extractedData[ currency ] = {
						"name": response[0].propertyName + ' (' + match[1] + ')',
						"description": response[0].propertyData,
						"divisible": parseInt( response[0].property_type ) == 2
					}
					self.coinData.set( extractedData );
				}*/
				self.loops[ currency ] = setTimeout( self.getCoinData.bind( outerThis ), 30000 );
			}
		);
	}
	else
	{
		var match = currency.match( /SP([0-9]+)/ )
		if( match )
		{
			$.getJSON( 'https://test.omniwallet.org/v1/property/' + match[1] + '.json',
				function( response ) {
					if( response[0] )
					{
						var extractedData = {};
						extractedData[ currency + '-source' ] = 'https://test.omniwallet.org/';
						extractedData[ currency ] = {
							"name": response[0].propertyName + ' (#' + match[1] + ')',
							"description": response[0].propertyData,
							"divisible": parseInt( response[0].property_type ) == 2
						}
						self.coinData.set( extractedData );
					}
					self.loops[ currency ] = setTimeout( self.getCoinData.bind( outerThis ), 30000 );
				}
			);
		}		
	}

}