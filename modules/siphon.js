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

Components.utils.import('resource://siphon/modules/console.js')
console.verbose = false
console.prefix = 'Siphon: '
Components.utils.import('resource://siphon/modules/crypt/PGencode.js')
Components.utils.import("resource://gre/modules/AddonManager.jsm");
//Components.utils.import('resource://siphon/modules/crypt/rsa.js')
//Components.utils.import('resource://siphon/modules/crypt/aes-enc.js')
//Components.utils.import('resource://siphon/modules/crypt/base64.js')
//Components.utils.import('resource://siphon/modules/crypt/mouse.js')

var options_window = false

//var JSON = Components.classes["@mozilla.org/dom/json;1"].createInstance(Components.interfaces.nsIJSON)

var Siphon = {

	STAT_INSTALLED: 1,
	STAT_INSTALLED_NO_SYNC: 2,
	STAT_NOT_INSTALLED_IGNORED: 3,
	STAT_NOT_INSTALLED: 4,

	months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
	transport: null,

	addons: null,
	addon_status: null,
	recommended: null,
	//em: Components.classes[ "@mozilla.org/extensions/manager;1" ]
	//  .getService( Components.interfaces.nsIExtensionManager ),

	prefs: Components.classes[ "@mozilla.org/preferences-service;1" ]
	  .getService( Components.interfaces.nsIPrefService ).getBranch( "extensions.siphon." ),

	locale: Components.classes[ "@mozilla.org/intl/nslocaleservice;1" ]
	  .getService( Components.interfaces.nsILocaleService ).getLocaleComponentForUserAgent(),

	app_ABI: Components.classes[ "@mozilla.org/xre/app-info;1" ]
	  .getService( Components.interfaces.nsIXULRuntime ).XPCOMABI,

	app_OS: Components.classes[ "@mozilla.org/xre/app-info;1" ]
	  .getService( Components.interfaces.nsIXULRuntime ).OS,

	app_id: Components.classes[ "@mozilla.org/xre/app-info;1" ]
	  .getService( Components.interfaces.nsIXULAppInfo ).ID,

	app_version: Components.classes[ "@mozilla.org/xre/app-info;1" ]
	  .getService( Components.interfaces.nsIXULAppInfo ).version,

	login_manager: Components.classes["@mozilla.org/login-manager;1"]
	  .getService(Components.interfaces.nsILoginManager),

	login_info: new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                              Components.interfaces.nsILoginInfo,
                                              "init"),

	win: function() {
		return Components.classes[ '@mozilla.org/appshell/window-mediator;1' ]
		  .getService( Components.interfaces.nsIWindowMediator )
		  .getMostRecentWindow( 'navigator:browser' )
	},

	wins: function() {
		var wins = []
		var enumerator = Components.classes[ '@mozilla.org/appshell/window-mediator;1' ]
		  .getService( Components.interfaces.nsIWindowMediator )
		  .getEnumerator( 'navigator:browser' )
		while ( enumerator.hasMoreElements() ) {
			wins.push( enumerator.getNext() )
		}
		return wins
	},

	optionsWindow: function() {
		return options_window
	},

	nUninstalledAddons: function() {
		var n = 0
		for ( var guid in this.addon_status )
			if ( this.addon_status[ guid ] == this.STAT_NOT_INSTALLED ) n++
		return n
	},

	// Events
	init: function() {
		console.write( 'init' )

		this._email = this.prefs.getCharPref( 'email' )
		this._api_url = this.prefs.getCharPref( 'api_url' )

		this.addon_status = {}
		this.deleted_addons = {}
		this.addons = {}
		this.new_addons = []

		this.findLoginInfo()

		this.synchronize()
		this.startPeriodicSynchronizer()

	},

	cryptEnabled: function() {
		return this.prefs.getBoolPref( 'encryption_enabled' )
	},

	checkForAccountChanges: function() {
		if ( this._email != this.prefs.getCharPref( 'email' )
		|| this._api_url != this.prefs.getCharPref( 'api_url' ) ) {
			if ( this.prefs.getCharPref( 'addon_status' ) ) {
				this.prefs.clearUserPref( 'addon_status' )
				this.addon_status = {}
			}

			console.write( 'account checked' )
			this._email = this.prefs.getCharPref( 'email' )
			this._api_url = this.prefs.getCharPref( 'api_url' )
		}
	},

	hostname: function() {
		var api_url = this.prefs.getCharPref( "api_url" )
		var i = api_url.indexOf( '//' )
		var j = api_url.substr( i+2 ).indexOf( '/' )
		return api_url.substr( 0, i + 2 + j )
	},

	findLoginInfo: function() {
		// Find users for the given parameters
		var logins = this.login_manager.findLogins( {}, this.hostname(), this.prefs.getCharPref( "api_url" ), null )

		// Find user from returned array of nsILoginInfo objects
		if ( logins.length )
			this._login_info = logins[0]
		else
			this._login_info = new this.login_info( this.hostname(), this.prefs.getCharPref( "api_url" ), null,
				this.prefs.getCharPref( 'email' ), "", "", "" )
		return
	},

	setLoginInfo: function( password ) {
		if ( password ) {
			this.findLoginInfo()

			var new_login_info = new this.login_info( this.hostname(), this.prefs.getCharPref( "api_url" ), null,
			  this.prefs.getCharPref( 'email' ), password, "", "" )

			if ( new_login_info.hostname == this._login_info.hostname
			&& new_login_info.formSubmitURL == this._login_info.formSubmitURL && this._login_info.password ) {
				console.write( 'modify' )
				this.login_manager.modifyLogin( this._login_info, new_login_info )
			}
			else
				this.login_manager.addLogin( new_login_info )

			this._login_info = new_login_info

			this.checkForAccountChanges()
		}
	},

	resetServerPrefs: function() {
		var prefs = [ 'api_url', 'encryption_enabled', 'encryption_keyid', 'encryption_pubkey' ]

		for ( var i = 0; i < prefs.length; i++ ) {
			if ( this.prefs.prefHasUserValue( prefs[i] ) )
				this.prefs.clearUserPref( prefs[i] )
		}
	},

	apiURL: function() {
		return this.prefs.getCharPref( 'api_url' )
	},

	startPeriodicSynchronizer: function() {
		var $this = this

		var event = { notify: function() {
			console.write( 'periodic synchronize' )
			$this.synchronize()
		} }

		this.timer = Components.classes[ "@mozilla.org/timer;1" ]
		  .createInstance( Components.interfaces.nsITimer )

		this.timer.initWithCallback(
			event,
			this.prefs.getIntPref( 'sync_interval_minutes' ) * 60 * 1000,
			Components.interfaces.nsITimer.TYPE_REPEATING_SLACK
		)

	},

	onStatusBarItemCommand: function( event ) {
		switch ( event.button ) {
			case 0:
				if ( ! event.ctrlKey ) {
					this.openSettingsDialog()
					return
				}
			case 1: // middle button
				return
		}
	},

	onStatusBarMenuItemCommand: function( action ) {
		switch( action ) {
			case "sync":
				this.synchronize()
				break
			case "settings":
				this.openSettingsDialog()
				break
		}
	},

	onMenuItemCommand: function() {
	},

	onSettingsCommand: function() {
		this.openSettingsDialog()
	},

	onForgotCommand: function( onSuccess, onFail ) {
		this.call({ data: { type: "forgot" }, onSuccess: onSuccess, onFail: onFail })
	},

	onDeleteCommand: function( onSuccess, onFail ) {
		$this = this
		this.call({ data: { type: "delete" }, onSuccess: function() {
			$this.prefs.clearUserPref( 'email' )
			$this._email = false
			$this.login_manager.removeLogin( this._login_info )
			$this.findLoginInfo()
			$this.checkForAccountChanges()
			onSuccess()
		}, onFail: onFail })
	},

	onGetAddonCommand: function( guid ) {
		this.installAddon( guid )
	},

	// Actions
	default_update_rdf: 'https://versioncheck.addons.mozilla.org/update/VersionCheck.php?'
			+ "reqVersion=1"
			+ "&id=%ITEM_ID%"
			+ "&version=%ITEM_VERSION%"
		//	+ "&maxAppVersion=%ITEM_MAXAPPVERSION%"
			+ "&status=userEnabled"
			+ "&appID=%APP_ID%"
			+ "&appVersion=%APP_VERSION%"
			+ "&appOS=%APP_OS%"
			+ "&appABI=%APP_ABI%"
			+ "&locale=%APP_LOCALE%",

	installAddon: function( guid ) {
		var addon, $this = this

		addon = this.addons[ guid ]
		console.write( addon + ": " + guid )
		if ( !addon ) {
			if ( this.recommended.id = guid )
				addon = this.recommended
			else return
		}

		var url = ( addon.updateRDF || this.default_update_rdf )
			.replace( '%ITEM_ID%', addon.id )
			.replace( '%ITEM_VERSION%', addon.version )
		//	.replace( '%ITEM_MAXAPPVERSION%', addon.maxAppVersion )
			.replace( '%APP_ID%', this.app_id )
			.replace( '%APP_VERSION%', this.app_version )
			.replace( '%APP_OS%', this.app_OS )
			.replace( '%APP_ABI%', this.app_ABI )
			.replace( '%APP_LOCALE%', this.locale )

		console.write( url )
		new this.Request( url ).start( function( rdf_xml ) {

			var start = rdf_xml.indexOf( '<em:updateLink>' )
			if ( start != -1 ) start += '<em:updateLink>'.length
			var end   = rdf_xml.indexOf( '</em:updateLink>' )
			var xpi_url = rdf_xml.substr( start, end-start )

			if ( start == -1 || end == -1 ) {
				if ( options_window )
					options_window.SiphonInstaller.onInstallFailed( guid )
				return// Error, mal-formatted RDF xml
			}

			//var win = Components.classes[ '@mozilla.org/appshell/window-mediator;1' ]
			//  .getService( Components.interfaces.nsIWindowMediator )
			//  .getMostRecentWindow( 'navigator:browser' )

			//win.openUILinkIn( xpi_url, 'current' )

			AddonManager.getInstallForURL( xpi_url, function(aInstall) {
				aInstall.install()

				if ( options_window )
					options_window.SiphonInstaller.onInstallWindowOpened( guid )
			}, "application/x-xpinstall")
			//$this.addon_status[ guid ] = $this.STAT_INSTALLED
			//$this.prefs.setCharPref( 'addon_status', JSON.stringify( $this.addon_status ) )
			//$this.synchronize()
			//$this.updateStatusbars()
		} )

	},

	ignoreAddon: function( guid ) {
		this.addon_status[ guid ] = this.STAT_NOT_INSTALLED_IGNORED
		this.prefs.setCharPref( 'addon_status', JSON.stringify( this.addon_status ) )
		this.updateStatusbars()
	},

	unignoreAddon: function( guid ) {
		this.addon_status[ guid ] = this.STAT_NOT_INSTALLED
		this.prefs.setCharPref( 'addon_status', JSON.stringify( this.addon_status ) )
		this.updateStatusbars()
	},

	syncAddon: function( guid ) {
		this.addon_status[ guid ] = this.STAT_INSTALLED
		this.prefs.setCharPref( 'addon_status', JSON.stringify( this.addon_status ) )
		this._synchronize_set()
		this.updateStatusbars()
	},

	unsyncAddon: function( guid ) {
		this.addon_status[ guid ] = this.STAT_INSTALLED_NO_SYNC
		this.prefs.setCharPref( 'addon_status', JSON.stringify( this.addon_status ) )
		this.updateStatusbars()
	},

	deleteAddon: function( guid ) {
		$this = this
		if ( this.addon_status[ guid ] == this.STAT_INSTALLED ) {
			this.uninstallAddon( guid )
		}
		this._synchronize_set()
	},

	uninstallAddon: function( guid ) {
		Siphon.deleted_addons[guid] = true
		delete this.addon_status[ guid ]
		this.prefs.setCharPref( 'addon_status', JSON.stringify( this.addon_status ) )
		AddonManager.getAddonByID( guid, function ( addon ) {
			addon.uninstall()
		})
	},

	unsetFirstRun: function() {
		this.prefs.setBoolPref( "first_run", false )
	},

	resetPrefs: function() {
		var list = this.prefs.getChildList( "", [] )
		for ( var i = 0; i < list.length; i++ ) {
			try { this.prefs.clearUserPref( list[ i ] ) } catch( e ) {}
		}
	},

	signup: function( email, password, onSuccess, onFail ) {

		this.call({
			data: { type: "signup", email: email, password: password },
			onSuccess: onSuccess,
			onFail: onFail
		})

	},

	synchronize: function( onSuccess, onFail ) {

		this.checkForAccountChanges()
		console.write('call')
		this.new_addons = []
		this.call({
			data: { type: 'get' },

			onSuccess: function( json ) {

				if ( this.prefs.getCharPref( 'addon_status' ) )
					this.addon_status = JSON.parse( this.prefs.getCharPref( 'addon_status' ) )

				if ( json.recommended )
					this.recommended = json.recommended

				console.write( this.recommended )
				console.write( 'call success' )
				AddonManager.getAllAddons( function( $this ) {
					return function( installed_addons ) {
						$this._synchronize( onSuccess, onFail, json, installed_addons )
					}
				}( this ) )
			},

			onFail: function( json ) {
				if ( onFail ) onFail.call( this, json.retval )
			}
		})
	},

	_synchronize: function( onSuccess, onFail, json, installed_addons ) {
		console.write( 'synchronizing' )
		var keys = ''
		for ( var key in installed_addons[0] )
			keys +=  key + ', '
		console.write( keys )
		var addon_mode = {}
		for ( var i = 0; i < installed_addons.length; i++ ) {
			console.write( installed_addons[i].name + ' type:' + installed_addons[i].type )
			if ( installed_addons[i].type == 'extension' && !this.deleted_addons[ installed_addons[ i ].id] ) {
				addon_mode[ installed_addons[ i ].id ] = 1
				this.addons[ installed_addons[ i ].id ] = installed_addons[ i ]
			}
		}

		for ( var guid in this.addon_status ) {
			if ( !addon_mode[ guid ] ) addon_mode[ guid ] = 0

			if ( this.addon_status[ guid ] == this.STAT_NOT_INSTALLED_IGNORED || this.addon_status[ guid ] == this.STAT_NOT_INSTALLED ) {
				if ( !addon_mode[ guid ] && json.addons[guid] ) addon_mode[ guid ] += 1
				else if ( addon_mode[ guid ] ) addon_mode[ guid ] -= 2
			}
			addon_mode[ guid ] += 2

			if ( this.addon_status[ guid ] == this.STAT_INSTALLED_NO_SYNC )
				addon_mode[ guid ] += 4
		}

		var n = 0
		for ( var guid in json.addons ) {
			if ( this.addon_status[ guid ] != this.STAT_INSTALLED_NO_SYNC ) {
				if ( !this.addons[ guid ] ) this.addons[ guid ] = json.addons[ guid ]
				if ( !addon_mode[ guid ] ) addon_mode[ guid ] = 0
				addon_mode[ guid ] += 4
			}
			n++
		}
		console.write("sync get: " + n )

		/*     | 1  2  3  |
		 *     |--------------
		 *  0  | 0  0  0  |  0
		 *  1  | 1  0  0  |  1
		 *  2  | 0  1  0  |  0
		 *  3  | 1  1  0  |  0
		 *  4  | 0  0  1  |  1
		 *  5  | 1  0  1  |  1
		 *  6  | 0  1  1  |  0
		 *  7  | 1  1  1  |  1
		 *
		 */
		for ( var guid in addon_mode ) {
			console.write( guid + ' ' + addon_mode[ guid ] )
			switch( addon_mode[ guid ] ) {
				case 1:
				case 5:
					this.addon_status[ guid ] = this.STAT_INSTALLED
					console.write( guid + ' installed' )
					break
				case 3:
					this.uninstallAddon( guid )
					console.write( guid + ' uninstall' )
					//this.em.uninstallItem( guid )
					//this.deleted_addons[guid] = true
				case 2:
				case 6:
					delete this.addon_status[ guid ]
					console.write( guid + ' deleted' )
					break
				case 4:
					if ( !this.addon_status[ guid ] ) this.new_addons.push( guid )
					this.addon_status[ guid ] = this.STAT_NOT_INSTALLED
					console.write( guid + ' want install' )
					break
				case 7:
					console.write( guid + ' already synced' )
					break
			}
		}

		this.prefs.setCharPref( 'addon_status', JSON.stringify( this.addon_status ) )
		this._synchronize_set( onSuccess, onFail )
	},

	_synchronize_set: function( onSuccess, onFail ) {

		var data = { type: 'set', addons: {} }

		for ( var guid in this.addon_status ) {
			if ( this.addon_status[ guid ] != this.STAT_INSTALLED_NO_SYNC )
				data.addons[ guid ] = {
					id: this.addons[guid].id,
					name: this.addons[guid].id,
					version: this.addons[guid].version,
					updateRDF: this.addons[guid].updateRDF
				}
		}

		this.call({
			data: data,

			onSuccess: function( json ) {
				this.prefs.setCharPref( 'last_sync', this.formattedDate() )
				if ( onSuccess ) onSuccess.call( this, json.retval )
				this.afterSync()
			},

			onFail: function( json ) {
				if ( onFail ) onFail.call( this, json.retval )
			}
		})
	},

	call: function( options ) {
	//params, data, onSuccess, onFail
		var $this = this

		var data = this.objMerge({ type: '' }, options.data || {} )

		data.email    = data.email || this.prefs.getCharPref( 'email' )
		data.password = data.password || this._login_info.password

		if ( this.cryptEnabled() ) {
			try {
				data.crypt_email = doEncrypt( this.prefs.getCharPref('encryption_keyid'), 0,
											  this.prefs.getCharPref('encryption_pubkey'), data.email )

				data.crypt_password = doEncrypt( this.prefs.getCharPref('encryption_keyid'), 0,
												 this.prefs.getCharPref('encryption_pubkey'), data.password )
				delete data.email
				delete data.password
			} catch ( e ) {
				console.write( 'Error: ecnryption failed: ' + e )
				return
			}
		}

		qstring = this.objMerge( { version:  this.prefs.getCharPref( 'version' ), rand: new Date().getTime() }, options.params || {} )

		return this.transport = new this.Request( this.apiURL(), qstring, data ).start( function( json_str ) {

			$this.transport = null

			try {
				//$this.console.write( json_str )
				var json = JSON.parse( json_str );

				if ( json && json.alert_message && options_window )
					options_window.alert( json.alert_message )

				if ( json && json.status_message && options_window ) {
					options_window.SiphonSettings.alertStatus( json.status_message )
				}
			} catch ( e ) {
				console.write( "Error: "+data.type+": " + e + ': ' + json_str )
			}

			if ( json && json.retval == 0 ) {
				options.onSuccess.call( $this, json )
			} else {
				options.onFail.call( $this, json || {} )
			}

			if ( $this.prefs.getBoolPref( 'first_run' ) ) {
				$this.unsetFirstRun()
				$this.openSettingsDialog( 'pane-settings' )
			}

		} )

	},

	abortUpdate: function() {
		this.transport.abort()
		this.transport = null
	},

	openSettingsDialog: function( pane_id ) {
		if ( ! options_window ) {
			var features = "chrome,titlebar,toolbar,centerscreen,resizable"
			options_window = this.win().open( "chrome://siphon/content/options.xul", "Siphon Preferences", features )
			if ( pane_id )
				options_window.addEventListener( "load", function( e ) {
					options_window.document.documentElement.showPane( options_window.document.getElementById( pane_id ) )
				}, false )
		}

		options_window.focus() //bringToFront
	},

	settingsDialogClosed: function() {
		options_window = false
	},

	tryAndOpenInstallerWindow: function() {
		if ( options_window ) {
			options_window.SiphonInstaller.redraw()
			options_window.SiphonSettings.redraw()
		}
		if ( this.nUninstalledAddons() && this.new_addons.length ) {
			this.openSettingsDialog( "pane-installer" )
		}
	},

	afterSync: function() {
		this.updateStatusbars()
		this.tryAndOpenInstallerWindow()
	},

	updateStatusbars: function() {
		var wins = this.wins()

		var n = this.nUninstalledAddons()

		for ( var i = 0; i < wins.length; i++ ) {
			if ( !n && this.prefs.getBoolPref('hide_status_bar') )
				wins[i].document.getElementById( "siphon-statusbar" ).style.display = 'none'
			else
				wins[i].document.getElementById( "siphon-statusbar" ).style.display = ''

			wins[i].document.getElementById( "siphon-statusbar-num" ).value = n || ""
			if ( this.nUninstalledAddons() )
				wins[i].document.getElementById( "siphon-statusbar-alert" ).style.display = "block"
			else
				wins[i].document.getElementById( "siphon-statusbar-alert" ).style.display = "none"
		}
	},

	objMerge: function( dest, src ) {
		for ( var key in src )
			dest[ key ] = src[ key ]
		return dest
	},

	formattedDate: function() {

		var _date    = new Date()
		var month   = this.months[ _date.getMonth() ]
		var day     = _date.getDate()
		var hours   = _date.getHours() > 12 ? _date.getHours() - 12 : _date.getHours()
		var minutes = "00" + _date.getMinutes()
		var daypart = _date.getHours()  >= 12 ? "pm" : "am"

		minutes = minutes.substr( minutes.length - 2 )

		return month + " " + day + ", " + hours + ":" + minutes + " " + daypart
	}

}

Siphon.Request = function( url, params, data ) {
	this._url = url
	this._callback = null
	this._channel = null
	this._params = params || {}
	this._data = data || {}
}

Siphon.Request.prototype = {

	start: function( callback ) {

		this._callback = callback
		var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
		request.open('POST', this._url + this.encode( this._params ), true);
		request.setRequestHeader('Content-Type','text/json; charset=utf-8');
		request.send( JSON.stringify( this._data ) );

		request.onreadystatechange = function() {
			if ( request.readyState == 4 ) {
				callback( request.responseText )
			}
		}
		return
	},

	encode: function( obj ) {
		var str = ""
		for ( var key in obj ) {
			if ( str ) str += "&"
			else str = '?'
			str += key + "=" + escape( obj[ key ] )
		}
		return str
	}
}

Siphon.init()
