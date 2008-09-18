var SynconsSettings = {

	win: null,

	tmp_username: '',
	tmp_password: '',

	init: function(win) {
		this.win = win

		if (this.win.Syncons.prefs.getCharPref("session"))
			this.setLoggedInUI()
		else
			this.setModifyUI()

		document.getElementById("last-sync").setAttribute("value", this.win.Syncons.prefs.getCharPref("last_sync"))

		if (this.win.Syncons.sync_transport) this.setSyncingUI()
	},

	setModifyUI: function() {
		document.getElementById("l-username").disabled = false
		document.getElementById("l-password").disabled = false
		document.getElementById("sync-btn").disabled = true
		document.getElementById("modify-btn").style.display = "none"
		document.getElementById("log-in-btn").style.display = "block"
		document.getElementById("throbber-log-in").style.display = "none"
		document.getElementById("stop-btn").style.display = "none"
	},

	setLoggedInUI: function() {
		document.getElementById("l-username").disabled = true
		document.getElementById("l-password").disabled = true
		document.getElementById("sync-btn").disabled = false
		document.getElementById("modify-btn").style.display = "block"
		document.getElementById("log-in-btn").style.display = "none"
		document.getElementById("throbber-log-in").style.display = "none"
		document.getElementById("stop-btn").style.display = "none"
	},

	setLoggingInUI: function() {
		document.getElementById("l-username").disabled = true
		document.getElementById("l-password").disabled = true
		document.getElementById("log-in-btn").style.display = "none"
		document.getElementById("throbber-log-in").style.display = "block"
		document.getElementById("stop-btn").style.display = "block"
	},

	setSyncingUI: function() {
		document.getElementById("throbber").style.display = "block"
		document.getElementById("sync-btn").style.display = "none"
		document.getElementById("sync-stop-btn").style.display = "block"
		document.getElementById("modify-btn").disabled = true
	},

	setSyncStoppedUI: function() {
		document.getElementById("throbber").style.display = "none"
		document.getElementById("sync-btn").style.display = "block"
		document.getElementById("sync-stop-btn").style.display = "none"
		document.getElementById("modify-btn").disabled = false
		document.getElementById("last-sync").setAttribute("value", this.win.Syncons.prefs.getCharPref("last_sync"))
	},

	setLogginSucceededUI: function() {
		this.setLoggedInUI()
		this.alertLoginStatus("Login Succeeded")
	},

	setLogginFailedUI: function() {
		this.setModifyUI()
		this.alertLoginStatus("Login Failed")
	},

	setSignUpSucceededUI: function() {
		this.clearSignUpUI()
		this.setSignedUpUI()
		this.alertSignupStatus("Signup Successed")
	},

	setSignUpFailedUI: function() {
		this.setSignedUpUI()
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
		document.getElementById("s-username").disabled = true
		document.getElementById("s-password").disabled = true
		document.getElementById("r-password").disabled = true
		document.getElementById("email").disabled = true
	},

	setSignedUpUI: function() {
		document.getElementById("throbber-sign-up").style.display = "none"
		document.getElementById("sign-up-btn").style.display = "block"
		document.getElementById("stop-sign-up-btn").style.display = "none"
		document.getElementById("s-username").disabled = false
		document.getElementById("s-password").disabled = false
		document.getElementById("r-password").disabled = false
		document.getElementById("email").disabled = false

		if (this.validateSignUpText())
			this.setSignUpableUI()
		else
			this.setUnsignUpableUI()
	},

	clearSignUpUI: function() {
		document.getElementById("s-username").value = ""
		document.getElementById("s-password").value = ""
		document.getElementById("r-password").value = ""
		document.getElementById("email").value = ""
	},

	alertLoginStatus: function (message) {
		this.alertStatus("loggin-status", message)
	},

	alertSignupStatus: function (message) {
		this.alertStatus("signup-status", message)
	},

	alertStatus: function (el_id, message) {
		document.getElementById(el_id).setAttribute("value", message)
		setTimeout(function() {
			document.getElementById(el_id).setAttribute("value", "")
		}, 1000);
	},

	validateLogInText: function() {
		if (document.getElementById("l-username").value
		 && document.getElementById("l-password").value )
			return true
		return false
	},

	validateLogInInfo: function(onSuccess, onFail) {
		if (this.tmp_username == this.win.Syncons.prefs.getCharPref("username")
		 && this.tmp_password == this.win.Syncons.prefs.getCharPref("tmp_password")
		 && this.win.Syncons.prefs.getCharPref("session")) {
			return onSuccess()
		}

		this.win.Syncons.login(onSuccess, onFail)
	},

	validateSignUpText: function() {
		var n_valid = 0;
		if (document.getElementById("s-username").value) {
			n_valid++
			document.getElementById("s-username-validate").className = 'valid'
		} else
			document.getElementById("s-username-validate").className = 'invalid'

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

		if ( document.getElementById("email").value.match(/^..*@..*\...*$/) ) {
			n_valid++
			document.getElementById("email-validate").className = 'valid'
		} else
			document.getElementById("email-validate").className = 'invalid'

		return n_valid == 4 ? true : false
	},

	validateSignUpInfo: function(onSuccess, onFail) {
		setTimeout(onSuccess, 500)
	},

	onModifyCommand: function() {
		this.tmp_username = this.win.Syncons.prefs.getCharPref("username")
		this.tmp_password = this.win.Syncons.prefs.getCharPref("tmp_password")
		this.setModifyUI()
	},

	onDialogClose: function(e) {
	//	this.win.console.info(e)
	},

	onLogInKeyPress: function(e) {
		if (e.which = 13) {
			this.onLogInCommand()
			this.win.cancelEvent(e)
			alert("here")
		}
	},

	onLogInCommand: function() {
		if (this.validateLogInText()) {
			this.setLoggingInUI()
			this.validateLogInInfo(
				function(){
					SynconsSettings.tmp_username = ""
					SynconsSettings.tmp_password = ""
					SynconsSettings.setLogginSucceededUI()
				},
				function(){SynconsSettings.setLogginFailedUI()}
			)
		}
	},

	onLogInStopCommand: function() {
		this.setModifyUI()
		this.win.Syncons.abortLogin()
	},

	onSyncCommand: function() {
		this.setSyncingUI()
		this.win.Syncons.synchronize(function(){SynconsSettings.setSyncStoppedUI()})
	},

	onSyncStopCommand: function() {
		this.setSyncStoppedUI()
		this.win.Syncons.abortSync()
	},

	onForgotCommand: function() {
		// TODO:
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
			function(){SynconsSettings.setSignUpSucceededUI()},
			function(){SynconsSettings.setSignUpFailedUI()}
		)
	},

	onSignUpStopCommand: function() {
		this.setSignedUpUI()
	}
}
