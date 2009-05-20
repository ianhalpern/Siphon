/*
 *
 *+   Copyright (c) 2009 Ian Halpern
 *@   http://siphon-fx.com
 *
 *    This file is part of Siphon.
 *
 *    Siphon is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU General Public License as published by
 *    the Free Software Foundation, either version 3 of the License, or
 *    (at your option) any later version.
 *
 *    Siphon is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU General Public License for more details.
 *
 *    You should have received a copy of the GNU General Public License
 *    along with Siphon.  If not, see <http://www.gnu.org/licenses/>.
 */

var EXPORTED_SYMBOLS = [ "Siphon" ]

var options_window = false

var Siphon = {

	instances: 0,

	//update_uri: "http://siphon-fx.com/update/",
	update_uri: "http://ian-halpern.com/sites/__available__/siphon-fx.com/0.0.7-qa/update/",
	months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
	uninstalled_addons: null,
	ignored_addons: null,
	transport: null,

	em: Components.classes[ "@mozilla.org/extensions/manager;1" ]
	  .getService( Components.interfaces.nsIExtensionManager ),

	prefs: Components.classes[ "@mozilla.org/preferences-service;1" ]
	  .getService( Components.interfaces.nsIPrefService ).getBranch( "extensions.siphon." ),

	locale: Components.classes[ "@mozilla.org/intl/nslocaleservice;1" ]
	  .getService( Components.interfaces.nsILocaleService ).getLocaleComponentForUserAgent( ),

	app_ABI: Components.classes[ "@mozilla.org/xre/app-info;1" ]
	  .getService( Components.interfaces.nsIXULAppInfo ).XPCOMABI,

	app_OS: Components.classes[ "@mozilla.org/xre/app-info;1" ]
	  .getService( Components.interfaces.nsIXULAppInfo ).OS,

	app_id: Components.classes[ "@mozilla.org/xre/app-info;1" ]
	  .getService( Components.interfaces.nsIXULAppInfo ).ID,

	app_version: Components.classes[ "@mozilla.org/xre/app-info;1" ]
	  .getService( Components.interfaces.nsIXULAppInfo ).version,

	win: function ( ) {
		return Components.classes[ '@mozilla.org/appshell/window-mediator;1' ]
		  .getService( Components.interfaces.nsIWindowMediator )
		  .getMostRecentWindow( 'navigator:browser' )
	},

	wins: function ( ) {
		var wins = [ ]
		var enumerator = Components.classes[ '@mozilla.org/appshell/window-mediator;1' ]
		  .getService( Components.interfaces.nsIWindowMediator )
		  .getEnumerator( 'navigator:browser' )
		while ( enumerator.hasMoreElements( ) ) {
			wins.push( enumerator.getNext( ) )
		}
		return wins
	},

	nUninstalledAddons: function ( ) {
		return ( this.uninstalled_addons.length - this.ignored_addons.length > 0 && this.uninstalled_addons.length - this.ignored_addons.length ) || 0
	},

	// Events
	init: function() {
		this.instances++

		this.uninstalled_addons = [ ]
		this.ignored_addons = [ ]
		if ( this.prefs.getCharPref( "ignore_list" ) )
			this.ignored_addons = this.prefs.getCharPref( "ignore_list" ).split( "," )
		this.synchronize( )

		if ( this.prefs.getBoolPref( "first_run" ) ) {
			this.unsetFirstRun( )
			this.openSettingsDialog( )
		}

	},

	onStatusBarItemCommand: function( event ) {
		switch ( event.button ) {
			case 0:
				if ( ! event.ctrlKey ) {
					this.openSettingsDialog( )
					return
				}
			case 1: // middle button
				return
		}
	},

	onStatusBarMenuItemCommand: function ( action ) {
		switch( action ) {
			case "sync":
				this.synchronize( )
				break
			case "settings":
				this.openSettingsDialog( )
				break
		}
	},

	onMenuItemCommand: function ( ) {
	},

	onSettingsCommand: function ( ) {
		this.openSettingsDialog( )
	},

	onForgotCommand: function ( onSuccess, onFail ) {
		this.update( { type: "forgot" }, onSuccess, onFail )
	},

	onGetAddonCommand: function( guid ) {
		this.installAddon( guid )
	},

	// Actions

	installAddon: function( guid ) {
		var addon, $this = this

		for ( var i=0; i<this.uninstalled_addons.length; i++ )
			if ( this.uninstalled_addons[ i ].id == guid )
				addon = this.uninstalled_addons[ i ]

		if ( ! addon ) return

		var url = 'https://versioncheck.addons.mozilla.org/update/VersionCheck.php?'
			+ "reqVersion="     + addon.minAppVersion
			+ "&id="            + addon.id
			+ "&version="       + addon.version
			+ "&maxAppVersion=" + addon.maxAppVersion
			+ "&status=userEnabled"
			+ "&appID="         + this.app_id
			+ "&appVersion="    + this.app_version
			+ "&appOS="         + this.app_OS
			+ "&appABI="        + this.app_ABI
			+ "&locale="        + this.locale

		new this.Request( url ).start( function( rdf_xml ) {

			var start = rdf_xml.indexOf( '<em:updateLink>' )
			if ( start != -1 ) start += '<em:updateLink>'.length
			var end   = rdf_xml.indexOf( '</em:updateLink>' )
			var xpi_url = rdf_xml.substr( start, end-start )

			if ( start == -1 || end == -1 ) return // Error, mal-formatted RDF xml

			var win = Components.classes[ '@mozilla.org/appshell/window-mediator;1' ]
			  .getService( Components.interfaces.nsIWindowMediator )
			  .getMostRecentWindow( 'navigator:browser' )

			win.openUILinkIn( xpi_url, 'current' )
		} )

	},

	ignoreAddon: function ( guid ) {
		if ( this.prefs.getCharPref( "ignore_list" ).indexOf( guid ) == -1 ) {
			this.ignored_addons.push( guid )
			this.prefs.setCharPref( "ignore_list", this.ignored_addons.join( "," ) )
			this.updateStatusbars( )
		}
	},

	unignoreAddon: function ( guid ) {
		for ( var i = 0; i < this.ignored_addons.length; i++ )
			if ( this.ignored_addons[ i ] == guid ) {
				this.ignored_addons.splice( i, 1 )
				this.prefs.setCharPref( "ignore_list", this.ignored_addons.join( "," ) )
				this.updateStatusbars( )
				break
			}
	},

	isAddonIgnored: function ( guid ) {
		return this.prefs.getCharPref( "ignore_list" ).indexOf( guid ) != -1
	},

	unsetFirstRun: function ( ) {
		this.prefs.setBoolPref( "first_run", false )
	},

	resetPrefs: function ( ) {
		var list = this.prefs.getChildList( "", [ ] )
		for ( var i = 0; i < list.length; i++ ) {
			try { this.prefs.clearUserPref( list[ i ] ) } catch( e ) {}
		}
	},

	updateInstalledList: function ( list ) {
		this.uninstalled_addons = list
		this.prefs.setCharPref( "wait_list", this.uninstalled_addons.join( "," ) )

		for ( var i = 0; i < this.ignored_addons.length; i++ ) {
			var found = false
			for ( var j = 0; j < this.uninstalled_addons.length; j++ ) {
				if ( this.uninstalled_addons[ j ].id == this.ignored_addons[ i ] ) {
					found = true
					break
				}
			}
			if ( ! found ) this.ignored_addons.splice( i, 1 )
		}

		this.prefs.setCharPref( "ignore_list", this.ignored_addons.join( "," ) )

		return this.uninstalled_addons.length
	},

	signup: function( email, password, onSuccess, onFail) {

		this.update( { type: "signup", email: email, password: password }, onSuccess, onFail )

	},

	synchronize: function( onSuccess, onFail ) {

		var installed_addons = this.em.getItemList( 2, [ ] )
		var synced_list = this.prefs.getCharPref( "synced_list" ).split( "," )

		this.update( { type: "sync", installed_list: this.JSON.toString( installed_addons ), synced_list: this.JSON.toString( synced_list ) },
			function ( json ) {

				this.prefs.setCharPref( "last_sync", this.formattedDate( ) )

				var synced_list = [ ]

				for ( var i = 0; i < installed_addons.length; i++ ) {
					var found = false

					for ( var j = 0; j < json.addons.del.length; j++ )
						if ( found = ( installed_addons[ i ].id == json.addons.del[ j ] ) ) break

					if ( ! found ) synced_list.push( installed_addons[ i ].id )
				}

				this.prefs.setCharPref( "synced_list", synced_list.join( "," ) )

				if ( onSuccess ) onSuccess.call( this )

				this.updateInstalledList( json.addons.ins )

				for ( var i = 0; i < json.addons.del.length; i++ )
					this.em.uninstallItem( json.addons.del[ i ] )

				this.afterSync( )
			},
			function ( json ) {
				onFail.call( this, json.retval )
			}
		)

	},

	update: function ( params, onSuccess, onFail ) {
		params = params || { }

		var $this = this

		return this.transport = new this.Request( this.update_uri + "?rand=" + new Date( ).getTime( ), this.objMerge( {
			type:     "",
			email:    this.prefs.getCharPref( "email" ),
			password: this.prefs.getCharPref( "password" )
		}, params ) ).start( function( json_str ) {

			$this.transport = null

			try {
				var json = eval( "(" + json_str + ")" )
			} catch ( e ) {
				alert ( "Server Error!"/* json_str */ )
			}

			// alert( json.message )

			if ( json && json.retval > 0 )
				onSuccess.call( $this, json )
			else
				onFail.call( $this, json || { } )

		} )

	},

	abortUpdate: function() {
		this.transport.abort( )
		this.transport = null
	},

	openSettingsDialog: function ( pane_id ) {
		if ( ! options_window ) {
			var features = "chrome,titlebar,toolbar,centerscreen,resizable"
			options_window = this.win( ).openDialog( "chrome://siphon/content/options.xul", "Siphon Preferences", features )
			if ( pane_id )
				options_window.addEventListener( "load", function( e ) {
					options_window.document.documentElement.showPane( options_window.document.getElementById( pane_id ) )
				}, false )
		}
	},

	settingsDialogClosed: function ( ) {
		options_window = false
	},

	tryAndOpenInstallerWindow: function ( ) {
		if ( options_window ) {
			options_window.SiphonInstaller.redraw( )
			options_window.SiphonSettings.updateStatus( )
		}
		if ( this.nUninstalledAddons( ) ) this.openSettingsDialog( "pane-installer" )
	},

	afterSync: function ( ) {
		this.updateStatusbars( )
		this.tryAndOpenInstallerWindow( )
	},

	updateStatusbars: function ( ) {
		var wins = this.wins( )

		for ( var i = 0; i < wins.length; i++ ) {
			wins[i].document.getElementById( "siphon-statusbar-num" ).value = this.nUninstalledAddons( ) || ""
			if ( this.nUninstalledAddons( ) )
				wins[i].document.getElementById( "siphon-statusbar-alert" ).style.display = "block"
			else
				wins[i].document.getElementById( "siphon-statusbar-alert" ).style.display = "none"
		}
	},

	objMerge: function ( dest, src ) {
		for ( var key in src )
			dest[ key ] = src[ key ]
		return dest
	},

	formattedDate: function ( ) {

		var _date    = new Date( )
		var month   = this.months[ _date.getMonth( ) ]
		var day     = _date.getDate( )
		var hours   = _date.getHours( ) > 12 ? _date.getHours( ) - 12 : _date.getHours( )
		var minutes = "00" + _date.getMinutes( )
		var daypart = _date.getHours()  >= 12 ? "pm" : "am"

		minutes = minutes.substr( minutes.length - 2 )

		return month + " " + day + ", " + hours + ":" + minutes + " " + daypart
	}

}

Siphon.JSON = {
	toString: function(object, ignore) {
		var json = '', c = ''
		if (typeof object == "object") {

			if (object.constructor == Array) {
				json += "["
				for (var i=0; i<object.length; i++) {

					switch (typeof object[i]) {
						case "string":
							json += c + '"' + object[i] + '"'
							break
						case "object":
							json += c + Siphon.JSON.toString(object[i])
							break
						case "number":
							json += c + object[i]
							break
					}
					if (json.length > 1) c = ','
				}
			json += "]"

			} else {
				json = "{"
				for (var x in object) {
					if (x != "toString" && x != "objectSource") {
						switch (typeof object[x]) {
							case "string":
								json += c + '"' + x + '":' + '"' + object[x] + '"'
								break
							case "object":
								json += c + '"' + x + '":' + Siphon.JSON.toString(object[x])
								break
							case "number":
								json += c + '"' + x + '":' + object[x]
								break
						}
						if (json.length > 1) c = ','
					}
				}
				json += "}"
			}
		}
		return json
	}
}

Siphon.Request = function ( url, data ) {
	this._url = url
	this._callback = null
	this._channel = null
	this._data = this.encode( data || { } )
}

Siphon.Request.prototype = {

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

Siphon.init( )
