$( function() {
	$( '#address-search' ).submit(function(e) {
		event.preventDefault();
		window.location.assign( '/addr/' + $( '#address-search input' ).val() );
	});

	var addressMatch = window.location.href.match( /\/addr\/([a-zA-Z0-9]+)$/ );
	if( addressMatch )
	{
		$( '#address-search input' ).attr( 'placeholder', addressMatch[1] );
		$( '#address-display' ).text( addressMatch[1] );
	}
});