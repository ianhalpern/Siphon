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

var SiphonSettings = {

	win: null,

	init: function( win ) {
		this.win = win

		document.getElementById( "last-sync" ).setAttribute( "value", this.win.Siphon.prefs.getCharPref( "last_sync" ) )

		if ( this.win.Siphon.sync_transport ) this.setSyncingUI( )

		document.getElementById( "loggin-status" ).style.display = "none"
	},

	setSyncingUI: function() {
		document.getElementById("throbber").style.display = "block"
		document.getElementById("sync-btn").style.display = "none"
		document.getElementById("sync-stop-btn").style.display = "block"
	},

	setSyncStoppedUI: function() {
		document.getElementById("throbber").style.display = "none"
		document.getElementById("sync-btn").style.display = "block"
		document.getElementById("sync-stop-btn").style.display = "none"
		document.getElementById("last-sync").setAttribute("value", this.win.Siphon.prefs.getCharPref("last_sync"))
	},

	setLogginSucceededUI: function() {
		this.setLoggedInUI()
		this.alertSyncStatus("Login Succeeded")
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
	},

	setUnsignUpableUI: function() {
		document.getElementById("sign-up-btn").disabled = true
	},

	setSigningUpUI: function() {
		document.getElementById("throbber-sign-up").style.display = "block"
		document.getElementById("sign-up-btn").style.display = "none"
		document.getElementById("stop-sign-up-btn").style.display = "block"
		document.getElementById("s-email").disabled = true
		document.getElementById("s-password").disabled = true
		document.getElementById("r-password").disabled = true
	},

	setSignedUpUI: function() {
		document.getElementById("throbber-sign-up").style.display = "none"
		document.getElementById("sign-up-btn").style.display = "block"
		document.getElementById("stop-sign-up-btn").style.display = "none"
		document.getElementById("s-email").disabled = false
		document.getElementById("s-password").disabled = false
		document.getElementById("r-password").disabled = false

		if (this.validateSignUpText())
			this.setSignUpableUI()
		else
			this.setUnsignUpableUI()
	},

	clearSignUpUI: function() {
		document.getElementById("s-email").value = ""
		document.getElementById("s-password").value = ""
		document.getElementById("r-password").value = ""
	},

	alertSyncStatus: function (message) {
		this.alertStatus("loggin-status", message)
	},

	alertSignupStatus: function (message) {
		this.alertStatus("signup-status", message)
	},

	alertStatus: function (el_id, message) {
		document.getElementById( "loggin-status" ).style.display = "block"
		document.getElementById(el_id).setAttribute("value", message)
		setTimeout(function() {
			document.getElementById( "loggin-status" ).style.display = "none"
			document.getElementById(el_id).setAttribute("value", "")
		}, 1000);
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
		this.win.Siphon.signup(
			document.getElementById("s-email").value, document.getElementById("s-password").value,
			onSuccess, onFail
		)
	},

	onDialogClose: function(e) {
	// TODO:
	},

	onSyncCommand: function() {
		this.win.Siphon.prefs.setCharPref( "email", document.getElementById("l-email").value )
		this.win.Siphon.prefs.setCharPref( "password", document.getElementById("l-password").value )
		this.setSyncingUI()
		try {
		this.win.Siphon.synchronize(
			function(retval){SiphonSettings.onSyncSucceeded(retval)},
			function(retval){SiphonSettings.onSyncFailed(retval)}
		)
		} catch ( e ) { alert ( e ) }
	},

	onSyncStopCommand: function() {
		this.setSyncStoppedUI()
		this.win.Siphon.abortSync()
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
		this.win.Siphon.onForgotCommand( function ( ) {
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
		this.win.Siphon.abortSignup()
	},

	onSignUpSucceeded: function ( ) {
		try {
		this.win.Siphon.resetPrefs( )
		this.win.Siphon.unsetFirstRun( )
		this.win.Siphon.prefs.setCharPref( "email", document.getElementById("s-email").value )
		this.win.Siphon.prefs.setCharPref( "password", document.getElementById("s-password").value )

		this.setSignUpSucceededUI( )

		var $this = this

		setTimeout( function ( ) {
			try {
				document.documentElement.showPane( document.getElementById( "paneMain" ) )
				$this.onSyncCommand( )
			} catch ( e ) { alert ( e ) }
		}, 500 )
		} catch ( e ) { alert( e ) }
	}
}
