var SlimWalletData = Backbone.Model.extend( {
	// address: the bitcoin address we're viewing.
});

var slimWalletData = new SlimWalletData();

$( function() {

	attachModelSetters( slimWalletData );
	attachModelListeners( slimWalletData );

	initModelData( slimWalletData );

	// This HAS to happen after the rest of the UI syncs up, since address changes
	// after this point will redirect the browser.
	slimWalletData.on( 'change:address', function( data ) {
		window.location.href = '/addr/' + data.changed.address;
	});

});

// Attach listeners to UI components that set data in the model.
// DO NOT CHANGE ANY UI COMPONENT VALUES HERE!
function attachModelSetters( dataModel ) {
	$( '#address-search' ).submit(function(e) {
		e.preventDefault();
		dataModel.set( { address: $( '#address-search input' ).val() });
	});

};

// Attach listeners to the data model that populate the UI based on its data.
// DO NO READ FROM ANY UI COMPONENTS HERE!
function attachModelListeners( dataModel ) {

	// Update the display of the currently viewed address in the UI.
	dataModel.on( 'change:address', function( data ) {
		$( '#address-search input' ).attr( 'placeholder', data.changed.address );
		$( '#address-display' ).text( data.changed.address );
		window.document.title = 'SlimWallet - ' + data.changed.address;
	} );

};

// Populate the data model as needed.
function initModelData( dataModel ) {

	var addressMatch = window.location.href.match( /\/addr\/([a-zA-Z0-9]+)$/ );
	if( addressMatch )
		dataModel.set( { address: addressMatch[1] } );

};