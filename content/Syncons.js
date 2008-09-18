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

var Ajax = {
	Request: function( url, callback, options) {
		options = options || {}

		var http_request = new XMLHttpRequest()
		http_request.onreadystatechange = function(){
			if (http_request.readyState == 4) {
				if (http_request.status == 200) {
					callback( http_request.responseText )
				} else {
				//	alert('There was a problem with the request.');
				}
			}
		}
		http_request.open( 'GET', url+"?"+(options.params||''), true)
	//	alert(url+"?"+(options.params||''))
	//	if (options.method == "POST") {
		//	options.params = options.params || ''
		//	http_request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		//	http_request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
		//	http_request.setRequestHeader("Content-length", options.params.length);
		//	http_request.setRequestHeader("Connection", "close");
		//	http_request.send(options.params)
	//	} else {
			http_request.send(null)
	//	}
		return http_request
	}
}

var cancelEvent = function (e) {
	e = e ? e : window.event;
	if(e.stopPropagation)
		e.stopPropagation();
	if(e.preventDefault)
		e.preventDefault();
	e.cancelBubble = true;
	e.cancel = true;
	e.returnValue = false;
	return false;
}


const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

var formattedDate = function() {
	var date    = new Date()
	var month   = months[date.getMonth()]
	var day     = date.getDate()
	var hours   = date.getHours() > 12 ? date.getHours() - 12 :  date.getHours()
	var minutes = date.getMinutes()
	var daypart = date.getHours() >= 12 ? "pm" : "am"

	return month+" "+day+", "+hours+":"+minutes+" "+daypart
}

var Syncons = {

	installed_addons: null,
	uninstalled_addons: null,
	defualt_icon_url: 'chrome://mozapps/skin/xpinstall/xpinstallItemGeneric.png',
	app_id: '',
	app_version: '',
	app_OS: '',
	app_ABI: '',
	locale: '',
	main_window: null,
	addon_being_installed: null,
	prefs: null,
	username: null,
	login_transport: null,
	sync_transport: null,

	onLoad: function() {
		// initialization code
		this.initialized = true;

	//	this.nativeJSON =  Components.classes["@mozilla.org/dom/json;1"]
	//	  .createInstance(Components.interfaces.nsIJSON)

	//	var str = ""
	//	for (var x in this.installed_addons[3]) {
	//		str += x+"; "
	//	}
	//	alert(str)
	//	alert(this.installed_addons.length)

		// Get the "extensions.myext." branch
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		  .getService(Components.interfaces.nsIPrefService)

		var ext_prefs = prefs.getBranch("extensions.")
		//alert(ext_prefs.getCharPref("enabledItems"))
		this.prefs = prefs.getBranch("extensions.syncons.")

		this.username = this.prefs.getCharPref("username")
		this.session  = this.prefs.getCharPref("session")
		this.no_sync  = this.prefs.getCharPref("no_sync").split(',')

		var locale_service = Components.classes["@mozilla.org/intl/nslocaleservice;1"]
		  .getService(Components.interfaces.nsILocaleService);
		this.locale =  locale_service.getLocaleComponentForUserAgent();

		var app_info = Components.classes["@mozilla.org/xre/app-info;1"]
		  .getService(Components.interfaces.nsIXULAppInfo)

		this.app_ABI     = app_info.XPCOMABI
		this.app_OS      = app_info.OS
		this.app_id      = app_info.ID
		this.app_version = app_info.version

		this.synchronize()

		// clears tmp preferences
		this.clearTempPrefs()
		// https://versioncheck.addons.mozilla.org/update/VersionCheck.php?reqVersion=1&id=yslow@yahoo-inc.com&version=0.9.5b2&maxAppVersion=3.0.*&status=userDisabled&appID={ec8030f7-c20a-464f-9b0e-13a3a9e97384}&appVersion=3.0.1&appOS=WINNT&appABI=x86-msvc&locale=en-US

		if (this.prefs.getBoolPref("first_run")) {
			this.prefs.setBoolPref("first_run", false)
			this.onSettingsCommand()
		}

	},

	onStatusBarItemCommand: function(event) {
		switch (event.button) {
			case 0:
				if (!event.ctrlKey) {
					this.openMainWindow()
					return;
				}
			case 1: // middle button
				return;
		}
	},

	onStatusBarMenuItemCommand: function(action) {
	
	},

	onMenuItemCommand: function() {
		this.openMainWindow()
	},

	onSettingsCommand: function() {
		this.openSettingsDialog()
	},

	openSettingsDialog: function() {
		var features = "chrome,titlebar,toolbar,centerscreen,modal,width=350, height=400";
		window.openDialog("chrome://syncons/content/settings.xul", "Preferences", features);
	},

	onGetAddonCommand: function(guid) {
		var addon

		for (var i=0; i<this.uninstalled_addons.length; i++) {
			if (this.uninstalled_addons[i].id == guid) addon = this.uninstalled_addons[i]
		}

		this.addon_being_installed = addon

		var url = 'https://versioncheck.addons.mozilla.org/update/VersionCheck.php?'
			+"reqVersion="+addon.minAppVersion
			+"&id="+addon.id
			+"&version="+addon.version
			+"&maxAppVersion="+addon.maxAppVersion
			+"&status=userEnabled"
			+"&appID="+this.app_id
			+"&appVersion="+this.app_version
			+"&appOS="+this.app_OS
			+"&appABgnome remove dotten button I="+this.app_ABI
			+"&locale="+this.locale

		Ajax.Request( url, function(rdf_xml) {

			var start = rdf_xml.indexOf('<em:updateLink>')
			if (start != -1) start += '<em:updateLink>'.length
			var end   = rdf_xml.indexOf('</em:updateLink>')
			var xpi_url = rdf_xml.substr(start, end-start)

			if (start == -1 || end == -1) return // Error, mal-formatted RDF xml

			var win = Components.classes['@mozilla.org/appshell/window-mediator;1']
			  .getService(Components.interfaces.nsIWindowMediator)
			  .getMostRecentWindow('navigator:browser');

			win.openUILinkIn(xpi_url, 'current');
		})

	},

	onRemoveAddonCommand: function(guid) {
		alert(guid)
	},

	openMainWindow: function() {
		window.open("chrome://syncons/content/main-window.xul", "", "chrome,titlebar,toolbar,centerscreen,modal,width=647, height=400")
	},

	onMainWindowLoad: function(e, win) {
		this.main_window = win
		if (!this.sync_transport) this.mainWindowReady()
		else this.mainWindowWaiting()
	},

	mainWindowReady: function() {

		this.main_window.document.getElementById('throbber').style.display = "none"
		for (var i=0; i<this.uninstalled_addons.length; i++) {
			if (!this.main_window.document.getElementById(this.uninstalled_addons[i].id)) {
				this.main_window.document.getElementById('syncons_addon_listbox').appendChild(
				  this.createAddonListItem (
					this.uninstalled_addons[i].name,
					this.uninstalled_addons[i].version,
					this.uninstalled_addons[i].iconURL,
					false,
					this.uninstalled_addons[i].id
				  )
				)
			}
		}

		for (var i=0; i<this.installed_addons.length; i++) {
			if (!this.main_window.document.getElementById(this.installed_addons[i].id)) {
				this.main_window.document.getElementById('syncons_addon_listbox').appendChild(
				  this.createAddonListItem (
					this.installed_addons[i].name,
					this.installed_addons[i].version,
					this.installed_addons[i].iconURL,
					true,
					this.installed_addons[i].id
				  )
				)
			}
		}
	},

	mainWindowWaiting: function() {
		this.main_window.document.getElementById('throbber').style.display = "block"
	},

	onMainWindowUnload: function() {
		this.main_window = null
	},

	createAddonListItem: function(name, version, icon_url, is_installed, guid) {

		var list_item = document.createElement('richlistitem')
		list_item.setAttribute("align", "center")
		list_item.setAttribute("id", guid)

		var icon = document.createElement("image")
		icon.setAttribute("src", icon_url || "chrome://mozapps/skin/xpinstall/xpinstallItemGeneric.png")
		list_item.appendChild(icon)

		var addon_name = document.createElement('label')
		addon_name.setAttribute("class", "addon_name")
		addon_name.setAttribute("value", name)
		list_item.appendChild(addon_name)

		var addon_version = document.createElement('label')
		addon_version.setAttribute("value", version)
		list_item.appendChild(addon_version)

		var spacer = document.createElement('spacer')
		spacer.setAttribute("flex", "1")
		list_item.appendChild(spacer)

		var install_btn = document.createElement('button')
		install_btn.setAttribute("label", is_installed?"remove":"add")
		if (is_installed) ;//install_btn.setAttribute("disabled", "true")
		else install_btn.addEventListener("command", function(e) {
			install_btn.setAttribute("disabled", "true")
			install_btn.setAttribute("label", "adding")
			Syncons.onGetAddonCommand(guid)
		}, false)
		list_item.appendChild(install_btn)

		var no_sync_chkbox = document.createElement('checkbox')
		no_sync_chkbox.setAttribute("label", "Do not Sync")
		no_sync_chkbox.addEventListener("command", function(e) {Syncons.onRemoveAddonCommand(guid)}, false)
		list_item.appendChild(no_sync_chkbox)

		if (!is_installed)
			no_sync_chkbox.setAttribute("disabled", "true")
	/*	<richlistitem align="center" style="padding: 10px;">
			<image src="chrome://firebug/content/firebug.png" />
			<label value="Firebug" style="font-weight: bold;" />
			<label value="1.65" />
			<spacer flex="1"/>
			<button label="installed" disabled="true"/>
			<button label="remove" oncommand="Syncons.onGetAddonCommand()"/>
		</richlistitem>
	*/
		return list_item
	},

	onXpinstallConfirmLoad: function(e, win) {
		if (this.main_window) {
			var addon_being_installed = this.addon_being_installed
			var el = this.main_window.document.getElementById(addon_being_installed.id)

			var dialog = win.document.getElementById('xpinstallConfirm')
			dialog.addEventListener("dialogaccept", function(e) {
				el.childNodes[4].setAttribute("label", "remove")
				el.childNodes[4].setAttribute("disabled", "false")
				el.childNodes[5].setAttribute("disabled", "false")

				Syncons.installed_addons.unshift(addon_being_installed)
				for (var i=0; i<Syncons.uninstalled_addons.length; i++) {
					if (Syncons.uninstalled_addons[i] == addon_being_installed) {
						Syncons.main_window.document.getElementById('syncons_addon_listbox').insertBefore(el,
						Syncons.main_window.document.getElementById('syncons_addon_listbox').childNodes[
							Syncons.uninstalled_addons.length
						])
						Syncons.uninstalled_addons.splice(i,1)
						break
					}
				}
			}, false);

			dialog.addEventListener("dialogcancel", function(e) {
				el.childNodes[4].setAttribute("label", "add")
				el.childNodes[4].setAttribute("disabled", "false")
			}, false)
		} else {
			var dialog = win.document.getElementById('xpinstallConfirm')
			dialog.addEventListener("dialogaccept", function(e) {
			//	Syncons.syncAddonListWithServer()
			}, false)

			dialog.addEventListener("dialogcancel", function(e) {
				// Do Nothing
			}, false)
		}
	},

	createTempPrefs: function() {
		this.prefs.setCharPref("tmp_password", "")

		if (this.prefs.getCharPref("session") && this.prefs.getCharPref("username"))
			this.prefs.setCharPref("tmp_password", "••••••••••••••")
		this.prefs.setCharPref("tmp_s_username", "")
		this.prefs.setCharPref("tmp_s_password", "")
		this.prefs.setCharPref("tmp_s_re_password", "")
		this.prefs.setCharPref("tmp_s_email", "")
	},

	clearTempPrefs: function() {
		if (this.prefs.getPrefType  ("tmp_password"))
			this.prefs.clearUserPref("tmp_password")
		if (this.prefs.getPrefType  ("tmp_s_username"))
			this.prefs.clearUserPref("tmp_s_username")
		if (this.prefs.getPrefType  ("tmp_s_password"))
			this.prefs.clearUserPref("tmp_s_password")
		if (this.prefs.getPrefType  ("tmp_s_re_password"))
			this.prefs.clearUserPref("tmp_s_re_password")
		if (this.prefs.getPrefType  ("tmp_s_email"))
			this.prefs.clearUserPref("tmp_s_email")
//		this.prefs.deleteBranch()
	},

	login: function(onSuccess, onFail) {
		this.login_transport = Ajax.Request("http://syncons.com/login", function(json_str) {
			Syncons.login_transport = null

			var login = eval('('+json_str+')')
			if (login.session) {
				Syncons.prefs.setCharPref("session", login.session)
				onSuccess()
			} else {
				onFail()
			}
		},{
			params: "username="  + this.prefs.getCharPref("username") +
					"&password=" + this.prefs.getCharPref("tmp_password") +
					"&rand="     + new Date().getTime()
		});
	},

	abortLogin: function() {
		this.login_transport.abort()
		this.login_transport = null
	},

	synchronize: function(onFinish) {
	//	alert(JSON.toString(this.installed_addons))
	//	alert("addons="+escape(JSON.toString(this.installed_addons))+"&rand="+new Date().getTime()+
	//			    "&S=83c86910038194b86cb4416d185365298e201dd3")
	//
		this.em = Components.classes["@mozilla.org/extensions/manager;1"]
		  .getService(Components.interfaces.nsIExtensionManager)
		this.installed_addons = this.em.getItemList(2, [])
		this.uninstalled_addons = []

		if (this.main_window) this.mainWindowWaiting()

		this.sync_transport = Ajax.Request("http://syncons.com/sync", function(json_str) {
			Syncons.sync_transport = null
			Syncons.prefs.setCharPref("last_sync", formattedDate())

			if (typeof onFinish == "function") onFinish()

			try {
				Syncons.uninstalled_addons = eval(json_str)
			} catch (e) {}

			if (Syncons.main_window)
				Syncons.mainWindowReady()
		}, {
			params: "addons="+escape(JSON.toString(this.installed_addons))+"&rand="+new Date().getTime()+
				    "&S="+this.prefs.getCharPref("session")
		})
	},

	abortSync: function() {

		if (this.main_window)
			this.mainWindowReady()

		this.sync_transport.abort()
	}

}

window.addEventListener("load", function(e) { Syncons.onLoad(e); }, false);
