var AddressData = Backbone.Model.extend( {
	// address: the bitcoin address we're viewing.
});
var BalanceData = Backbone.Model.extend( {
	// Map currency ID to balance.
	// Map "currencyID-source" to source of the data.
});

var slimWalletData = {
	"addressData": new AddressData(),
	"balances": new BalanceData()
}
var workers = {};

var currencyFormatters = {
	bitcoin: function( value ) { return ( value * 1000 ).toFixed( 8 ) + ' mBTC' }
}

$( function() {

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

};

// Attach listeners to the data model that populate the UI based on its data.
// DO NO READ FROM ANY UI COMPONENTS HERE!
function attachModelListeners( data ) {

	// Update the display of the currently viewed address in the UI.
	data.addressData.on( 'change:address', function( data ) {
		$( '#address-search input' ).attr( 'placeholder', data.changed.address );
		$( '#address-display' ).text( data.changed.address );
		window.document.title = 'SlimWallet - ' + data.changed.address;
	} );

	data.balances.on( 'change', function( data ) {
		for( var v in data.changed )
			if( data.changed.hasOwnProperty( v ))
			{
				if( v.indexOf( '-source' ) != v.length - 7 )
					updateBalanceTable( v );
			}
	} );

	workers[ 'balanceQuery' ] = new BalanceQueryWorker( data );
};

// Populate the data model as needed.
function initModelData( data ) {

	var addressMatch = window.location.href.match( /\/addr\/([a-zA-Z0-9]+)$/ );
	if( addressMatch )
		data.addressData.set( { address: addressMatch[1] } );

};

var balanceTableTemplate = _.template( "\
	<div class=\"col-lg-12\" id=\"<%= currency %>-balances\">\
            <h2><%= currency %></h2>\
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
	console.log( 'Update table for: ' + currency + ':' );
	var existingTables = $( '#balance-tables #' + currency + '-balances' );
	if( existingTables.length == 0 )
	{
		// Make a new table.
		$( '#balance-tables' ).append( $( balanceTableTemplate( 
			{ 
				"currency": currency,
				"address": slimWalletData.addressData.get( 'address' ),
				"balance": '<a href="' + 
					slimWalletData.balances.get( currency + '-source' ) + 
					'">' +
					currencyFormatters[ currency ]( 
						slimWalletData.balances.get( currency ) ) +
					'</a>'
			}
		)));
	}
	else
	{
		$( '#balance-tables #' + currency + '-balances td#' + currency + '-balance' )
			.html( '<a href="' + 
					slimWalletData.balances.get( currency + '-source' ) + 
					'">' +
					currencyFormatters[ currency ]( 
						slimWalletData.balances.get( currency ) ) +
					'</a>' );
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
	clearTimeout( this.loop );
	this.loop = setTimeout( this.getBalances.bind( this ) );
}
BalanceQueryWorker.prototype.getBalances = function() {
	var self = this;
	var originalAddress = this.addressModel.get( 'address' );
	$.getJSON( 'https://btc.blockr.io/api/v1/address/info/' + originalAddress, 
		function( response ) {
			if( originalAddress == self.addressModel.get( 'address' ))
			{
				if( response.code == 200 )
				{
					self.balances.set( { 
						'bitcoin': response.data.balance,
						'bitcoin-source': 'https://btc.blockr.io/address/info/' + originalAddress 
					});
				}
				self.loop = setTimeout( self.getBalances.bind( self ), 30000 );
			}
		} 
	);
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