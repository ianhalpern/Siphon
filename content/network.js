var Request = function ( url, data ) {
	this._url = url
	this._callback = null
	this._channel = null
	this._data = this.encode( data || { } )
}

Request.prototype = {

	start: function ( callback ) {

		this._callback = callback

		// the IO service
		var ioService = Components.classes[ "@mozilla.org/network/io-service;1" ]
		  .getService( Components.interfaces.nsIIOService )

		this._channel = ioService.newChannelFromURI( ioService.newURI( this._url , null, null ) )

		// get an listener

		var inputStream = Components.classes[ "@mozilla.org/io/string-input-stream;1" ]
		  .createInstance( Components.interfaces.nsIStringInputStream )

		inputStream.setData( this._data, this._data.length )

		var uploadChannel = this._channel.QueryInterface( Components.interfaces.nsIUploadChannel )
		uploadChannel.setUploadStream( inputStream, "application/x-www-form-urlencoded", -1 )


		if ( this._channel instanceof Components.interfaces.nsIHttpChannel )
			this._channel.requestMethod = 'POST'

		// Create a stream loader for retrieving the response.
		var streamLoader = Components.classes[ "@mozilla.org/network/stream-loader;1" ]
		  .createInstance( Components.interfaces.nsIStreamLoader )

		try {
			// Before Firefox 3...
			streamLoader.init( this._channel, this, null )
		} catch ( e ) {
			// Firefox 3 style...
			streamLoader.init( this )
			this._channel.asyncOpen( streamLoader, null )
		}

		return

	},

	onStreamComplete: function( loader, ctxt, status, resultLength, result ) {

		if ( Components.isSuccessCode( status ) ) {
			try {
				status = this._channel.responseStatus || 200
			} catch ( e ) {
				this._callback( this._channel.responseStatus + ": Disable automatic proxy settings detection." )
				return
			}

			var converter = Components.classes[ "@mozilla.org/intl/scriptableunicodeconverter" ]
			  .createInstance(Components.interfaces.nsIScriptableUnicodeConverter)
			converter.charset = "utf-8"

			var msg = ""
			if (status == 200 || status == 201 || status == 204) {

				msg = converter.convertFromByteArray(result, resultLength)
				this._callback( msg )

			}

		}

	},

	encode: function ( obj ) {
		var str = ""
		for ( var key in obj ) {
			if ( str ) str += "&"
			str += key + "=" + escape( obj[ key ] )
		}
		return str
	}
}

