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

var SiphonSettings = {

	init: function( ) {
		this.draw( )
	},

	draw: function ( ) {
		document.getElementById( "last-sync" ).setAttribute( "value", Siphon.prefs.getCharPref( "last_sync" ) || "Not synced yet." )
		this.updateStatus( )
	},

	redraw: function ( ) {
		this.draw( )
	},

	setSyncingUI: function() {
		this.disableMainButtons( )
		document.getElementById("throbber").style.visibility = "visible"
		document.getElementById("sync-stop-btn").style.visibility = "visible"
	},

	setSyncStoppedUI: function() {
		document.getElementById("throbber").style.visibility = "hidden"
		document.getElementById("sync-stop-btn").style.visibility = "hidden"
		document.getElementById("last-sync").setAttribute("value", Siphon.prefs.getCharPref("last_sync"))
		this.enableMainButtons( )
	},

	setLogginFailedUI: function() {
		this.alertSyncStatus("Login Failed")
	},

	setSignUpSucceededUI: function() {
		this.clearSignUpUI()
		this.setSignedUpUI()
		this.alertSignupStatus("Signup Successed")
	},

	setSignUpFailedUI: function() {
		this.setSignedUpUI()
		this.alertSignupStatus("Signup Failed")
	},

	setSignUpableUI: function() {
		document.getElementById("sign-up-btn").disabled = false
		document.getElementById("close-sign-up-btn").disabled = false
	},

	setUnsignUpableUI: function() {
		document.getElementById("sign-up-btn").disabled = true
	},

	setSigningUpUI: function() {
		document.getElementById("throbber-sign-up").style.display = "block"
		document.getElementById("stop-sign-up-btn").style.display = "block"
		document.getElementById("sign-up-btn").style.display = "none"
		document.getElementById("close-sign-up-btn").disabled =
		document.getElementById("s-email").disabled =
		document.getElementById("s-password").disabled =
		document.getElementById("r-password").disabled = true
	},

	setSignedUpUI: function() {
		document.getElementById("throbber-sign-up").style.display = "none"
		document.getElementById("stop-sign-up-btn").style.display = "none"
		document.getElementById("sign-up-btn").style.display = "block"
		document.getElementById("close-sign-up-btn").disabled =
		document.getElementById("s-email").disabled =
		document.getElementById("s-password").disabled =
		document.getElementById("r-password").disabled = false

		if (this.validateSignUpText())
			this.setSignUpableUI()
		else
			this.setUnsignUpableUI()
	},

	disableMainButtons: function ( ) {
		document.getElementById("sync-btn").disabled =
		document.getElementById("show-sign-up-btn").disabled =
		document.getElementById("forgot-btn").disabled = true
	},

	enableMainButtons: function ( ) {
		document.getElementById("sync-btn").disabled =
		document.getElementById("show-sign-up-btn").disabled =
		document.getElementById("forgot-btn").disabled = false
	},

	clearSignUpUI: function() {
		document.getElementById("s-email").value = ""
		document.getElementById("s-password").value = ""
		document.getElementById("r-password").value = ""
	},

	alertSyncStatus: function (message) {
		this.alertStatus("alert-status", message)
	},

	alertSignupStatus: function (message) {
		this.alertStatus("alert-status", message)
	},

	alertStatus: function (el_id, message) {
		document.getElementById(el_id).setAttribute("value", message)
		setTimeout(function() {
			document.getElementById(el_id).setAttribute("value", "")
		}, 1500);
	},

	validateLogInText: function() {
		if (document.getElementById("l-email").value.match(/^..*@..*\...*$/)
		 && document.getElementById("l-password").value )
			return true
		return false
	},

	validateSignUpText: function() {
		var n_valid = 0;

		if (document.getElementById("s-password").value) {
			n_valid++
			document.getElementById("s-password-validate").className = 'valid'
		} else
			document.getElementById("s-password-validate").className = 'invalid'

		if (document.getElementById("r-password").value
		 && document.getElementById("s-password").value
		 == document.getElementById("r-password").value) {
			n_valid++
			document.getElementById("r-password-validate").className = 'valid'
		} else
			document.getElementById("r-password-validate").className = 'invalid'

		if ( document.getElementById("s-email").value.match(/^..*@..*\...*$/) ) {
			n_valid++
			document.getElementById("s-email-validate").className = 'valid'
		} else
			document.getElementById("s-email-validate").className = 'invalid'

		return n_valid == 3 ? true : false
	},

	validateSignUpInfo: function(onSuccess, onFail) {
	//	setTimeout(onSuccess, 500)
		Siphon.signup(
			document.getElementById("s-email").value, document.getElementById("s-password").value,
			onSuccess, onFail
		)
	},

	updateStatus: function ( ) {
		if ( Siphon.invalid_account ) {
			document.getElementById( "status-uninstalled-icon" ).className = "icon-alert"
			document.getElementById( "status-uninstalled-label" ).value = "Account invalid. Please login or sign up."
		} else if ( Siphon.nUninstalledAddons( ) ) {
			document.getElementById( "status-uninstalled-icon" ).className = "icon-alert"
			document.getElementById( "status-uninstalled-label" ).value =
			  Siphon.nUninstalledAddons( ) +
			  " addon" + ( Siphon.nUninstalledAddons( ) != 1 ? "s" : "" ) +
			  " need" + ( Siphon.nUninstalledAddons( ) != 1 ? "" : "s" ) +
			  " to be installed."
		} else {
			document.getElementById( "status-uninstalled-icon" ).className = "icon-success"
			document.getElementById( "status-uninstalled-label" ).value = "No addons need to be installed!"
		}

		document.getElementById( "status-installed-label" ).value =
		  Siphon.em.getItemList( 2, [ ] ).length +
		  " addon" + ( Siphon.em.getItemList( 2, [ ] ).length != 1 ? "s" : "" ) +
		  " installed, " +
		  Siphon.ignored_addons.length + 
		  " addon" + ( Siphon.ignored_addons.length != 1 ? "s" : "" ) +
		  " ignored."
	},

	openSignup: function ( ) {
		document.getElementById( "login-vbox" ).style.display = "none"
		document.getElementById( "signup-vbox" ).style.display = "block"
	},

	closeSignup: function ( ) {
		document.getElementById( "login-vbox" ).style.display = "block"
		document.getElementById( "signup-vbox" ).style.display = "none"
	},

	onSyncCommand: function() {
		Siphon.prefs.setCharPref( "email", document.getElementById("l-email").value )
		Siphon.prefs.setCharPref( "password", document.getElementById("l-password").value )
		this.setSyncingUI()
		try {
		Siphon.synchronize(
			function(retval){SiphonSettings.onSyncSucceeded(retval)},
			function(retval){SiphonSettings.onSyncFailed(retval)}
		)
		} catch ( e ) { alert ( e ) }
	},

	onSyncStopCommand: function() {
		this.setSyncStoppedUI()
		Siphon.abortSync()
	},

	onSyncSucceeded: function ( retval ) {
		this.setSyncStoppedUI()
		this.alertSyncStatus( "Synchronize Succeeded" )
	},

	onSyncFailed: function ( retval ) {
		this.setSyncStoppedUI()
		if ( retval == 0 )
			this.alertSyncStatus( "Login Failed" )
		else
			this.alertSyncStatus( "Synchronize Failed" )
	},

	onForgotCommand: function( ) {
		var $this = this
		Siphon.onForgotCommand( function ( ) {
			$this.alertSyncStatus( "You have been sent an email." )
		} )
	},

	onSignUpChange: function() {
		if (this.validateSignUpText())
			this.setSignUpableUI()
		else
			this.setUnsignUpableUI()
	},

	onSignUpCommand: function() {
		this.setSigningUpUI()
		this.validateSignUpInfo(
			function(){
				SiphonSettings.onSignUpSucceeded( );
				SiphonSettings.setSignUpSucceededUI(); },
			function(){SiphonSettings.setSignUpFailedUI()}
		)
	},

	onSignUpStopCommand: function() {
		this.setSignedUpUI()
		Siphon.abortSignup()
	},

	onSignUpSucceeded: function ( ) {
		try {
		Siphon.resetPrefs( )
		Siphon.unsetFirstRun( )
		Siphon.prefs.setCharPref( "email", document.getElementById("s-email").value )
		Siphon.prefs.setCharPref( "password", document.getElementById("s-password").value )

		this.setSignUpSucceededUI( )

		var $this = this

		setTimeout( function ( ) {
			try {
				$this.closeSignup( )
				$this.onSyncCommand( )
			} catch ( e ) { alert ( e ) }
		}, 1000 )
		} catch ( e ) { alert( e ) }
	}
}

var SiphonInstaller = {

	init: function ( ) {
		this.draw( )
	},

	draw: function ( ) {
		for ( var i = 0; i < Siphon.uninstalled_addons.length; i++ ) {
			document.getElementById('siphon_addon_listbox').appendChild(
				this.createAddonListitem(
					Siphon.uninstalled_addons[ i ].name,
					Siphon.uninstalled_addons[ i ].version,
					Siphon.uninstalled_addons[ i ].id
				)
			)
		}
	},

	clear: function ( ) {
		while ( document.getElementById( 'siphon_addon_listbox' ).hasChildNodes( ) )
			document.getElementById( 'siphon_addon_listbox' ).removeChild( document.getElementById( 'siphon_addon_listbox' ).childNodes[ 0 ] )
	},

	redraw: function ( ) {
		this.clear( )
		this.draw( )
	},

	createAddonListitem: function ( name, version, guid ) {

		var list_item = document.createElement( 'richlistitem' )
		list_item.setAttribute( "align", "center" )
		list_item.setAttribute( "id", guid )

		var icon = document.createElement( "image" )
		icon.setAttribute( "src", "chrome://mozapps/skin/xpinstall/xpinstallItemGeneric.png" )
		list_item.appendChild( icon )

		var name_box = document.createElement( "box" )
		name_box.setAttribute( "style", "overflow:hidden; width: 120px; whitespace: nowrap" )
		list_item.appendChild( name_box )

		var addon_name = document.createElement( 'label' )
		addon_name.setAttribute( "class", "addon_name" )
		addon_name.setAttribute( "value", name )
		name_box.appendChild( addon_name )

		var version_box = document.createElement( "box" )
		version_box.setAttribute( "style", "overflow:hidden; width: 40px; whitespace: nowrap" )
		list_item.appendChild( version_box )

		var addon_version = document.createElement( 'label' )
		addon_version.setAttribute( "value", version )
		version_box.appendChild( addon_version )

		var spacer = document.createElement( 'spacer' )
		spacer.setAttribute( "flex", "1" )
		list_item.appendChild( spacer )

		var onChecked = function ( ) {
			if ( checkbox.getAttribute( "checked" ) ) {
				install_btn.setAttribute( "disabled", "true" )
				Siphon.ignoreAddon( guid )
			} else {
				Siphon.unignoreAddon( guid )
				install_btn.setAttribute( "disabled", "false" )
			}
			SiphonSettings.updateStatus( )
		}

		var checkbox = document.createElement( 'checkbox' )
		checkbox.setAttribute( "label", "Ignore" )

		checkbox.addEventListener( "command", onChecked, false )

		list_item.appendChild( checkbox )

		var install_btn = document.createElement( 'button' )
		install_btn.setAttribute( "label", "install" )
		//install_btn.setAttribute("disabled", "true")
		install_btn.addEventListener( "command", function ( e ) {
			install_btn.setAttribute( "disabled", "true" )
			checkbox.setAttribute( "disabled", "true" )
			//install_btn.setAttribute( "label", "restart" )
			Siphon.onGetAddonCommand( guid )
			//window.close( )
		}, false )

		list_item.appendChild( install_btn )

		if ( Siphon.isAddonIgnored( guid ) ) {
			checkbox.setAttribute( "checked", true )
			onChecked( )
		}

		return list_item
	}

}
