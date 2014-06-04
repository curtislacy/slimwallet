
/*************
 *   UI Code.
 *************/

var addressQRs = null;

$( function() {
	var elements = document.getElementsByClassName( "address-qr" );
	if( elements.length > 0 )
	{
		for( var i=0; i<elements.length; i++ )
		{
			if( !addressQRs )
				addressQRs = [];
			addressQRs.push( new QRCode( elements[i], {
				width: 192, height: 192
			} ));
		}
	}

	// This comes from svallet-core.js
	var svallet = new SingleAddressSvallet();
	
	attachModelListeners( svallet.svalletData );
	attachModelSetters( svallet.svalletData );

	initModelData( svallet.svalletData );

	// This HAS to happen after the rest of the UI syncs up, since address changes
	// after this point will redirect the browser.
	svallet.svalletData.addressData.on( 'change:address', function( data ) {
		window.location.href = '/addr/' + data.changed.address;
	});

	function attachModelSetters( data ) {
		$( '#address-search' ).submit(function(e) {
			e.preventDefault();
			data.addressData.set( { address: $( '#address-search input' ).val() });
		});
	};

	function attachModelListeners( data ) {

		// Update the display of the currently viewed address in the UI.
		data.addressData.on( 'change:address', function( data ) {
			$( '#address-search input' ).attr( 'placeholder', data.changed.address );
			$( '.address-display' ).text( data.changed.address );
			window.document.title = 'Svallet - ' + data.changed.address;
			if( addressQRs )
			{
				addressQRs.forEach( function( qr ) {
					qr.clear();
					qr.makeCode( data.changed.address );
				});
			}
		} );

		data.balances.on( 'change', updateTotalSum );
		data.values.on( 'change', updateTotalSum );

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

		data.networkStatus.on( 'change', function( data ) {
			for( var v in data.changed )
			{
				if( data.changed.hasOwnProperty( v ))
					updateNetworkStatus( 'inprogress', 'In Progress', v, data.changed[v] );
					updateNetworkStatus( 'successful', 'OK', v, data.changed[v] );
					updateNetworkStatus( 'failed', 'FAILED', v, data.changed[v] );
			}
		});

		data.coinIcons.on( 'change', function( data ) {
			for( var v in data.changed )
			{
				if( data.changed.hasOwnProperty( v ) ){
					$( '.' + v + '-name' ).prepend(
						$( '<img />' )
							.attr( 'src', data.changed[ v ] )
							.attr( 'id', v + '-icon' )
							.attr( 'class', 'currency-icon' )
					);
				};
			}
		});
	}

	var formatters = {
		USD: function( value ){ return '$' + value.toFixed( 2 ) },
		bitcoin: function( value ) { return ( value ).toFixed( 8 ) + ' BTC' },
		MSC: function( value ) { return value.toFixed( 8 ) + ' MSC' },
		TMSC: function( value ) { return value.toFixed( 8 ) + ' TMSC' },
		SPdivisible: function( value ) {
			return ( value / 100000000 ).toFixed( 8 );
		},
		SPindivisible: function( value ) {
			return value.toFixed( 0 );
		}
	}
	function formatCurrency( currency, value ) {
		if( formatters[ currency ])
			return formatters[ currency ]( value );
		else if( currency.match( /^MSC-SP[0-9]+$/ ))
		{
			var propertyData = svallet.svalletData.coinData.get( currency );

			if( propertyData && propertyData.divisible )
			{
				return formatters.SPdivisible( value );
			}
			else
			{
				return formatters.SPindivisible( value );
			}
		}
		else
		{
			var xcpMatch = currency.match( /^XCP-([A-Za-z0-9]+)$/ )
			if( xcpMatch )
				return value + ' ' + xcpMatch[1];
			else
				return value + ' ' + currency;
		}
	}

	String.prototype.replaceAll = function(search, replace)
	{
	    //if replace is null, return original string otherwise it will
	    //replace search string with 'undefined'.
	    if(!replace) 
	        return this;

	    return this.replace(new RegExp('[' + search + ']', 'g'), replace);
	};

	function updateNetworkStatus( uiKey, status, id, value ) {
		if( status == value )
		{
			// Add the display.
			$( '.' + uiKey + '-queries' ).append(
				$( '<div></div>' )
					.attr( 'class', 'row' )
					.attr( 'id', id )
					.append(
						$( '<div></div>' )
							.attr( 'class', 'col-xs-12' )
							.append(
								$( '<p></p>' )
									.attr( 'class', 'announcement-text' )
									.text( id )
							)
					)
			);
		}
		else
		{
			var escapedId = id.replaceAll( '.', '\\.' ).replaceAll( ':', '\\:' ).replaceAll( ' ', '\\ ' );
			// Remove the display.
			$( '.' + uiKey + '-queries #' + escapedId ).remove();
		}
	}

	// Populate the data model as needed.
	function initModelData( data ) {

		var addressMatch = window.location.href.match( /\/addr\/([a-zA-Z0-9]+)$/ );
		if( addressMatch )
			data.addressData.set( { address: addressMatch[1] } );

	};

	var balanceTableTemplate = _.template( "\
		<div class=\"col-lg-12\" id=\"<%= currency %>-balances\">\
	        <h2 class=\"hidden-xs <%= currency %>-name\"><%= currencyName %></h2>\
	        <div class=\"hidden-xs table-responsive\">\
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
	                <td class=\"<%= currency %>-balance\"><%= balance %></td>\
	              </tr>\
	            </tbody>\
	          </table>\
	        </div>\
	        <h3 class=\"visible-xs <%= currency %>-name\"><%= currencyName %></h2>\
	        <div class=\"visible-xs row\">\
	        	<div class=\"col-xs-6 text-right\">\
	        		<h4 class=\"<%= currency %>-balance\"><%= balance %></h5>\
	        	</div>\
	        	<div class=\"col-xs-6 text-left\">\
	        		<h4 class=\"<%= currency %>-value\"></h5>\
	        	</div>\
	        </div>\
	        <hr class=\"visible-xs\" />\
	    </div>\
	");
	function updateBalanceTable( currency ) {
		var existingTables = $( '#balance-tables #' + currency + '-balances' );
		if( existingTables.length == 0 )
		{
			var balance = svallet.svalletData.balances.get( currency );
			if( balance > 0 )
			{
				// Make a new table.
				var coinData = svallet.svalletData.coinData.get( currency );
				var currencyName = currency;
				if( coinData && coinData.name )
					currencyName = coinData.name;
				var url = coinData ? coinData.url : null;

				$( '#balance-tables' ).append( $( balanceTableTemplate( 
					{ 
						"currencyName": currencyName,
						"currency": currency,
						"address": svallet.svalletData.addressData.get( 'address' ),
						"balance": '<a href="' + 
							svallet.svalletData.balances.get( currency + '-source' ) + 
							'">' +
							formatCurrency( currency, balance ) +
							'</a>'
					}
				)));

			}
		}
		else
		{
			$( '#balance-tables #' + currency + '-balances .' + currency + '-balance' )
				.html( '<a href="' + 
						svallet.svalletData.balances.get( currency + '-source' ) + 
						'">' +
						formatCurrency( currency, svallet.svalletData.balances.get( currency ) ) +
						'</a>' );
		}

		// We'll need to update the values, if they exist.
		updateValues( currency );
	}

	function updateTotalSum() {
		var sum = 0;
		for( var currencyKey in svallet.svalletData.values.attributes )
		{
			if( currencyKey.indexOf( '-source' ) != currencyKey.length - 7 )
			{
				var currencyBalance = svallet.svalletData.balances.get( currencyKey );
				if( currencyBalance > 0 )
					sum += currencyBalance * svallet.svalletData.values.get( currencyKey );
			}
		}
		if( sum > 0 )
		{
			$( '.total-asset-value' ).text( formatCurrency( 'USD', sum ));
			$( '.total-assets-display' ).removeClass( 'hidden' );
		}
		else
		{
			$( '.total-assets-display' ).addClass( 'hidden' );
		}
	}

	function updateValues( currency ) {
		var balance = svallet.svalletData.balances.get( currency );
		if( balance != null )
		{
			var value = svallet.svalletData.values.get( currency );
			if( value != null )
			{
				var valueOfBalance = balance * svallet.svalletData.values.get( currency );

				var outputFields = $( '#balance-tables #' + currency + '-balances td.' + currency + '-value' );
				if( outputFields.length == 0 )
				{
					$( '#balance-tables #' + currency + '-balances thead tr' ).append( 
						$( '<th>' ).html( 'Value <i class="fa fa-sort"></i>' ));
					$( '#balance-tables #' + currency + '-balances tbody tr' ).append( 
						$( '<td>' )
							.attr( 'class', currency + '-value')
							
						);
					$( '#balance-tables #' + currency + '-balances .' + currency + '-value' )
						.html( 
							'<a href=\"' + svallet.svalletData.values.get( currency + '-source' ) + '\">' 
							+ formatCurrency( 'USD', valueOfBalance ) + '</a>');
				}
				else
				{
					$( '#balance-tables #' + currency + '-balances .' + currency + '-value' )
						.html( 
							'<a href=\"' + svallet.svalletData.values.get( currency + '-source' ) + '\">' 
							+ formatCurrency( 'USD', valueOfBalance ) + '</a>');
				}

			}
		}
	}

	function updateCoinData( currency ) {
		var data = svallet.svalletData.coinData.get( currency );
		if( data != null )
		{
			if( data.url )
			{
				$( '#balance-tables #' + currency + '-balances .' + currency + '-name' )
					.html( '<a href="' + data.url + '">' + data.name + '</a>' );
			}
			else
			{
				$( '#balance-tables #' + currency + '-balances .' + currency + '-name' )
					.text( data.name );						
			}
		}
	}
});


