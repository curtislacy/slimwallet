var AddressData = Backbone.Model.extend( {
	// address: the bitcoin address we're viewing.
});
var BalanceData = Backbone.Model.extend( {
	// Map currency ID to balance.
});

var slimWalletData = {
	"addressData": new AddressData(),
	"balances": new BalanceData()
}
var workers = {};

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

	workers[ 'balanceQuery' ] = new BalanceQueryWorker( data );
};

// Populate the data model as needed.
function initModelData( data ) {

	var addressMatch = window.location.href.match( /\/addr\/([a-zA-Z0-9]+)$/ );
	if( addressMatch )
		data.addressData.set( { address: addressMatch[1] } );

};

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
	var originalAddress = this.addressModel.get( 'address' );	$.getJSON( 'http://btc.blockr.io/api/v1/address/info/' + originalAddress, 
		function( response ) {
			if( originalAddress == self.addressModel.get( 'address' ))
			{
				if( response.code == 200 )
				{
					self.balances.set( { 'bitcoin': response.data.balance } );
					console.log( 'Balance is: ' + self.balances.get( 'bitcoin' ) + ' BTC' );
				}
			}
		} 
	);

	this.loop = setTimeout( this.getBalances.bind( this ), 30000 );
}