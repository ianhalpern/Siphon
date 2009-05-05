/*
 *
 *+   Copyright (c) 2009 Ian Halpern
 *@   http://siphon.ian-halpern.com
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

var JSON = {
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
							json += c + JSON.toString(object[i])
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
								json += c + '"' + x + '":' + JSON.toString(object[x])
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

var cancelEvent = function ( e ) {
	e = e ? e : window.event
	if( e.stopPropagation )
		e.stopPropagation( )
	if( e.preventDefault )
		e.preventDefault( )
	e.cancelBubble = true
	e.cancel = true
	e.returnValue = false
	return false
}

Object.merge = function ( dest, src ) {

	for ( var key in src )
		dest[ key ] = src[ key ]

	return dest
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

var formattedDate = function ( ) {

	var date    = new Date( )
	var month   = months[ date.getMonth( ) ]
	var day     = date.getDate( )
	var hours   = date.getHours( ) > 12 ? date.getHours( ) - 12 : date.getHours( )
	var minutes = "00" + date.getMinutes( )
	var daypart = date.getHours()  >= 12 ? "pm" : "am"

	minutes = minutes.substr( minutes.length - 2 )

	return month + " " + day + ", " + hours + ":" + minutes + " " + daypart
}

var Siphon

var win = Components.classes['@mozilla.org/appshell/window-mediator;1']
  .getService(Components.interfaces.nsIWindowMediator)
  .getMostRecentWindow('navigator:browser')

if ( win.Siphon && win != window )
	Siphon = win.Siphon
else {

	Siphon = {

		update_uri: "http://siphon.ian-halpern.com/update/",
		uninstalled_addons: null,
		defualt_icon_url: 'chrome://mozapps/skin/xpinstall/xpinstallItemGeneric.png',
		app_id: '',
		app_version: '',
		app_OS: '',
		app_ABI: '',
		locale: '',
		prefs: null,
		signup_transport: null,
		sync_transport: null,

		onLoad: function() {
			// initialization code
			this.initialized = true

		//	this.nativeJSON =  Components.classes["@mozilla.org/dom/json;1"]
		//	  .createInstance(Components.interfaces.nsIJSON)


			this.em = Components.classes[ "@mozilla.org/extensions/manager;1" ]
			  .getService( Components.interfaces.nsIExtensionManager )

			// Get the "extensions.myext." branch
			var prefs = Components.classes[ "@mozilla.org/preferences-service;1" ]
			  .getService( Components.interfaces.nsIPrefService )

			var ext_prefs = prefs.getBranch( "extensions." )
			//alert(ext_prefs.getCharPref("enabledItems"))
			this.prefs = prefs.getBranch( "extensions.siphon." )

			var locale_service = Components.classes[ "@mozilla.org/intl/nslocaleservice;1" ]
			  .getService( Components.interfaces.nsILocaleService )
			this.locale = locale_service.getLocaleComponentForUserAgent( )

			var app_info = Components.classes[ "@mozilla.org/xre/app-info;1" ]
			  .getService( Components.interfaces.nsIXULAppInfo )

			this.app_ABI     = app_info.XPCOMABI
			this.app_OS      = app_info.OS
			this.app_id      = app_info.ID
			this.app_version = app_info.version

			this.synchronize( )

			// clears tmp preferences
			// https://versioncheck.addons.mozilla.org/update/VersionCheck.php?reqVersion=1&id=yslow@yahoo-inc.com&version=0.9.5b2&maxAppVersion=3.0.*&status=userDisabled&appID={ec8030f7-c20a-464f-9b0e-13a3a9e97384}&appVersion=3.0.1&appOS=WINNT&appABI=x86-msvc&locale=en-US

			if ( this.prefs.getBoolPref( "first_run" ) ) {
				this.unsetFirstRun( )
				this.onSettingsCommand( )
			}

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

		onStatusBarItemCommand: function( event ) {
			switch ( event.button ) {
				case 0:
					if ( ! event.ctrlKey ) {
						this.openInstallerWindow( )
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

		openSettingsDialog: function ( ) {
			var features = "chrome,titlebar,toolbar,centerscreen,width=350, height=400"
			window.openDialog( "chrome://siphon/content/options.xul", "Preferences", features )
		},

		openInstallerWindow: function ( ) {
			var features = "chrome,titlebar,toolbar,centerscreen,width=450, height=300"
			window.openDialog( "chrome://siphon/content/installer.xul", "Installer", features )
		},

		tryAndOpenInstallerWindow: function ( ) {

			var wait_list = this.prefs.getCharPref( "wait_list" ).split( "," )
			var new_addons = false

			var ids = [ ]

			for ( var i = 0; i < this.uninstalled_addons.length; i++ ) {
				var found = false

				for ( var j = 0; j < wait_list.length; j++ )
					if ( found = ( this.uninstalled_addons[ i ].id == wait_list[ j ] ) )
						break

				if ( ! found ) new_addons = true

				ids.push( this.uninstalled_addons[ i ].id )
			}

			this.prefs.setCharPref( "wait_list", ids.join( "," ) )

			if ( new_addons ) this.openInstallerWindow( )
		},

		onForgotCommand: function ( onSuccess, onFail ) {
			this.update( { type: "forgot" }, onSuccess, onFail )
		},

		onGetAddonCommand: function( guid ) {
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

			new Request( url ).start( function( rdf_xml ) {

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

		signup: function( email, password, onSuccess, onFail) {

			this.update( { type: "signup", email: email, password: password }, onSuccess, onFail )

		},

		abortSignup: function() {
			this.signup_transport.abort( )
			this.signup_transport = null
		},

		synchronize: function( onSuccess, onFail ) {

			var installed_addons = this.em.getItemList( 2, [ ] )
			var synced_list = this.prefs.getCharPref( "synced_list" ).split( "," )

			this.update( { type: "sync", installed_list: JSON.toString( installed_addons ), synced_list: JSON.toString( synced_list ) },
				function ( json ) {

					this.prefs.setCharPref( "last_sync", formattedDate( ) )

					var synced_list = [ ]

					for ( var i = 0; i < installed_addons.length; i++ ) {
						var found = false

						for ( var j = 0; j < json.addons.del.length; j++ )
							if ( found = ( installed_addons[ i ].id == json.addons.del[ j ] ) ) break

						if ( ! found ) synced_list.push( installed_addons[ i ].id )
					}

					this.prefs.setCharPref( "synced_list", synced_list.join( "," ) )

					if ( onSuccess ) onSuccess.call( this )

					this.uninstalled_addons = json.addons.ins

					document.getElementById( "siphon-statusbar-num" ).value = this.uninstalled_addons.length || ""

					this.tryAndOpenInstallerWindow( )

					for ( var i = 0; i < json.addons.del.length; i++ )
						this.em.uninstallItem( json.addons.del[ i ] )
				},
				function ( json ) {
					onFail.call( this, json.retval )
				}
			)

		},

		abortSync: function ( ) {
			this.sync_transport.abort( )
		},

		update: function ( params, onSuccess, onFail ) {
			params = params || { }

			var $this = this

			return new Request( this.update_uri, Object.merge( {
				type:     "",
				email:    this.prefs.getCharPref( "email" ),
				password: this.prefs.getCharPref( "password" ),
				rand:     new Date( ).getTime( )
			}, params ) ).start( function( json_str ) {
				var json = eval( "(" + json_str + ")" )

				if ( json.retval > 0 )
					onSuccess.call( $this, json )
				else
					onFail.call( $this, json )

			} )

		}

	}

	window.addEventListener( "load", function( e ) { Siphon.onLoad( e ) }, false )

}

