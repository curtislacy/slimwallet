
/*************
 *   UI Code.
 *************/

$( function() {

	// This comes from svallet-core.js
	var svallet = new MultiAddressSvallet();

	var xpubMatch = window.location.href.match( /\/xpub\/([a-zA-Z0-9]+)$/ );
	if( xpubMatch )
		$( '#xpub-search input' ).attr( 'placeholder', xpubMatch[1] );

	$( '#xpub-search' ).submit(function(e) {
		e.preventDefault();
		window.location.href = '/xpub/' + $( '#xpub-search input' ).val();
	});

	var fromPub = Bitcoin.HDNode.fromBase58( xpubMatch[1] );
	for( var i=1; i<=10; i++ )
	{
		var derived = fromPub.derive( i );
		svallet.add( derived.getAddress().toString() );
		$( 'table.address-display' ).append(
				$( '<tr></tr>' )
					.append(
						$( '<td></td>' )
							.append(
								$( '<a></a>' )
									.attr( 'href', '/addr/' + derived.getAddress().toString() )
									.text( derived.getAddress().toString() )
							)
					)
			);
	}

	attachModelListeners( svallet );

	function attachModelListeners( svallet ) {
		svallet.on( 'change:balance', function( data ) {
			if( data.attribute.indexOf( '-source' ) != data.attribute.length - 7 )
				updateBalanceTable( data.attribute, data.address, data.newValue );
		} );

		svallet.on( 'change:value', function( data ) {
			//console.log( 'Value Event: ' + data.address );
		} );

		svallet.on( 'change:description', function( data ) {
			if( data.attribute.indexOf( '-source' ) != data.attribute.length - 7 )
			{
				updateCoinData( data.attribute, data.newValue );
			}
		} );

		svallet.on( 'change:network', function( data ) {
			updateNetworkStatus( 'inprogress', 'In Progress', data.attribute + ':' + data.address.substring( 0, 4 ), data.newValue );
			updateNetworkStatus( 'successful', 'OK', data.attribute + ':' + data.address.substring( 0, 4 ), data.newValue );
			updateNetworkStatus( 'failed', 'FAILED', data.attribute + ':' + data.address.substring( 0, 4 ), data.newValue );
		} );

		svallet.on( 'change:icon', function( data ) {
			if( $( 'img#' + data.attribute + '-icon' ).length == 0 )
				$( '.' + data.attribute + '-name' ).prepend(
					$( '<img />' )
						.attr( 'src', data.newValue )
						.attr( 'id', data.attribute + '-icon' )
						.attr( 'class', 'currency-icon' )
				);
		} );

	}

	var formatters = {
		USD: function( value ){ return numeral( value ).format( '$0,0[.]00' ) },
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
			var propertyData = svallet.getCoinData( currency );

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
			<div class=\"hidden-xs row\">\
				<div class=\"col-sm-4\">\
			        <h3 class=\"<%= currency %>-name\">\
			        	<%= currencyName %>\
			        </h2>\
			    </div>\
			    <div class=\"col-sm-5\">\
		        	<h3 class=\"<%= currency %>-balance-sum\"></h2>\
			    </div>\
			    <div class=\"col-sm-3\">\
		        	<h3 class=\"<%= currency %>-value-sum\"></h2>\
			    </div>\
			</div>\
	        <div class=\"hidden-xs table-responsive\">\
	          <table class=\"table table-hover table-striped tablesorter\">\
	            <thead>\
	              <tr>\
	                <th>Address <i class=\"fa fa-sort\"></i></th>\
	                <th>Balance <i class=\"fa fa-sort\"></i></th>\
	              </tr>\
	            </thead>\
	            <tbody>\
	              <tr id=\"<%= currency %>-<%= address %>\">\
	                <td><%= address %></td>\
	                <td class=\"<%= currency %>-balance\"><%= balance %></td>\
	              </tr>\
	            </tbody>\
	          </table>\
	        </div>\
	        <h3 class=\"visible-xs <%= currency %>-name\"><%= currencyName %></h2>\
	        <div class=\"visible-xs row\">\
	        	<div class=\"col-xs-6 text-right\">\
	        		<h4 class=\"<%= currency %>-balance-sum\"></h5>\
	        	</div>\
	        	<div class=\"col-xs-6 text-left\">\
	        		<h4 class=\"<%= currency %>-value\"></h5>\
	        	</div>\
	        </div>\
	        <hr class=\"visible-xs\" />\
	    </div>\
	");
	function updateBalanceTable( currency, address, balance ) {

		// First, check to see if we have a table for this currency type.
		var existingTables = $( '#balance-tables #' + currency + '-balances' );
		if( existingTables.length == 0 )
		{
			if( balance > 0 )
			{
				// Make a new table.
				var coinData = svallet.getCoinData( currency );
				var currencyName = currency;
				if( coinData && coinData.name )
					currencyName = coinData.name;

				$( '#balance-tables' ).append( $( balanceTableTemplate( 
					{ 
						"currencyName": currencyName,
						"currency": currency,
						"address": address,
						"balance": formatCurrency( currency, balance )
					}
				)));

			}
		}
		else
		{
			// If we have a table for this currency type, see if we have a row for this address already.
			var existingRows = $( 'tr#' + currency + '-' + address );
			if( existingRows.length == 0 )
			{
				if( balance > 0 )
				{
					$( '#balance-tables #' + currency + '-balances tbody' )
						.append( $( '<tr></tr>' )
							.attr( 'id', currency + '-' + address )
							.append( $( '<td></td>' )
								.text( address ))
							.append( $( '<td></td>' )
								.attr( 'class', currency + '-balance' )
								.text( formatCurrency( currency, balance ))
							)
						);

				}
			}
			else
			{
				$( 'tr#' + currency + '-' + address + ' ' + currency + '-balances .' + currency + '-balance' )
					.text( formatCurrency( currency, balance ) );

			}
		}

		console.log( '*** About to set total ' + currency );
		var totalBalance = svallet.getTotalBalance( currency );
		console.log( '*** Total ' + currency + ': ' + totalBalance );
		$( '.' + currency + '-balance-sum' )
			.text( formatCurrency( currency, totalBalance ));

		// We'll need to update the values, if they exist.
		//updateValues( currency );*/
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

	function updateCoinData( currency, data ) {
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


