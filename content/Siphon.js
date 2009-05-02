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
	var minutes = "00" + date.getMinutes()
	var daypart = date.getHours() >= 12 ? "pm" : "am"

	minutes = minutes.substr( minutes.length - 2 )

	return month+" "+day+", "+hours+":"+minutes+" "+daypart
}

var Siphon = {

	installed_addons: null,
	uninstalled_addons: null,
	defualt_icon_url: 'chrome://mozapps/skin/xpinstall/xpinstallItemGeneric.png',
	app_id: '',
	app_version: '',
	app_OS: '',
	app_ABI: '',
	locale: '',
	addon_being_installed: null,
	prefs: null,
	signup_transport: null,
	sync_transport: null,

	onLoad: function() {
		// initialization code
		this.initialized = true;

	//	this.nativeJSON =  Components.classes["@mozilla.org/dom/json;1"]
	//	  .createInstance(Components.interfaces.nsIJSON)


		this.em = Components.classes["@mozilla.org/extensions/manager;1"]
		  .getService(Components.interfaces.nsIExtensionManager)

		// Get the "extensions.myext." branch
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		  .getService(Components.interfaces.nsIPrefService)

		var ext_prefs = prefs.getBranch("extensions.")
		//alert(ext_prefs.getCharPref("enabledItems"))
		this.prefs = prefs.getBranch("extensions.siphon.")

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
		// https://versioncheck.addons.mozilla.org/update/VersionCheck.php?reqVersion=1&id=yslow@yahoo-inc.com&version=0.9.5b2&maxAppVersion=3.0.*&status=userDisabled&appID={ec8030f7-c20a-464f-9b0e-13a3a9e97384}&appVersion=3.0.1&appOS=WINNT&appABI=x86-msvc&locale=en-US

		if (this.prefs.getBoolPref("first_run")) {
			this.prefs.setBoolPref("first_run", false)
			this.onSettingsCommand( )
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
	},

	onSettingsCommand: function() {
		this.openSettingsDialog()
	},

	openSettingsDialog: function() {
		var features = "chrome,titlebar,toolbar,centerscreen,modal,width=350, height=400";
		window.openDialog("chrome://siphon/content/options.xul", "Preferences", features);
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
			+"&appABI="+this.app_ABI
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

			//win.openUILinkIn("https://addons.mozilla.org/en-US/firefox/downloads/latest/5791/addon-5791-latest.xpi", 'current');
			win.openUILinkIn( xpi_url, 'current');
		})

	},

	/*onRemoveAddonCommand: function(guid) {
		alert(guid)
	},

	openMainWindow: function() {
	//	window.open("chrome://siphon/content/main-window.xul", "", "chrome,titlebar,toolbar,centerscreen,modal,width=647, height=400")
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
				this.main_window.document.getElementById('siphon_addon_listbox').appendChild(
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
				this.main_window.document.getElementById('siphon_addon_listbox').appendChild(
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
			Siphon.onGetAddonCommand(guid)
		}, false)
		list_item.appendChild(install_btn)

		var no_sync_chkbox = document.createElement('checkbox')
		no_sync_chkbox.setAttribute("label", "Do not Sync")
		no_sync_chkbox.addEventListener("command", function(e) {Siphon.onRemoveAddonCommand(guid)}, false)
		list_item.appendChild(no_sync_chkbox)

		if (!is_installed)
			no_sync_chkbox.setAttribute("disabled", "true")
	//	<richlistitem align="center" style="padding: 10px;">
	//		<image src="chrome://firebug/content/firebug.png" />
	//		<label value="Firebug" style="font-weight: bold;" />
	//		<label value="1.65" />
	//		<spacer flex="1"/>
	//		<button label="installed" disabled="true"/>
	//		<button label="remove" oncommand="Siphon.onGetAddonCommand()"/>
	//	</richlistitem>

		return list_item
	},*/

	/*onXpinstallConfirmLoad: function(e, win) {
		if (this.main_window) {
			var addon_being_installed = this.addon_being_installed
			var el = this.main_window.document.getElementById(addon_being_installed.id)

			var dialog = win.document.getElementById('xpinstallConfirm')
			dialog.addEventListener("dialogaccept", function(e) {
				el.childNodes[4].setAttribute("label", "remove")
				el.childNodes[4].setAttribute("disabled", "false")
				el.childNodes[5].setAttribute("disabled", "false")

				Siphon.installed_addons.unshift(addon_being_installed)
				for (var i=0; i<Siphon.uninstalled_addons.length; i++) {
					if (Siphon.uninstalled_addons[i] == addon_being_installed) {
						Siphon.main_window.document.getElementById('siphon_addon_listbox').insertBefore(el,
						Siphon.main_window.document.getElementById('siphon_addon_listbox').childNodes[
							Siphon.uninstalled_addons.length
						])
						Siphon.uninstalled_addons.splice(i,1)
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
			//	Siphon.syncAddonListWithServer()
			}, false)

			dialog.addEventListener("dialogcancel", function(e) {
				// Do Nothing
			}, false)
		}
	},*/

	signup: function( email, password, onSuccess, onFail) {
		this.signup_transport = Ajax.Request("http://siphon.ian-halpern.com/update", function(json_str) {
			Siphon.signup_transport = null

			var json = eval('('+json_str+')')

			if ( json.retval > 0 ) {
				onSuccess()
			} else {
				onFail()
			}
		},{
			params: "type=signup" +
					"&email="     + escape( email ) +
					"&password="  + escape( password ) +
					"&rand="      + new Date().getTime( )
		});
	},

	abortSignup: function() {
		this.signup_transport.abort( )
		this.signup_transport = null
	},

	synchronize: function( onSuccess, onFail ) {

		var installed_addons = this.em.getItemList(2, [])
		var synced_list = this.prefs.getCharPref( "synced_list" ).split( "," )

		this.sync_transport = Ajax.Request("http://siphon.ian-halpern.com/update", function(json_str) {
			Siphon.sync_transport = null


			var json = eval('('+json_str+')')
			if ( json.retval > 0 ) {

				Siphon.prefs.setCharPref( "last_sync", formattedDate( ) )

				var synced_list = [ ]

				for ( var i = 0; i < installed_addons.length; i++ ) {
					var found = false
					for ( var j = 0; j < json.addons.del.length; j++ ) {
						if ( found = ( installed_addons[ i ].id == json.addons.del[ j ] ) ) break
					}
					if ( ! found ) synced_list.push( installed_addons[ i ].id )
				}

				Siphon.prefs.setCharPref( "synced_list", synced_list.join( "," ) )

				if ( onSuccess ) onSuccess( )

				Siphon.uninstalled_addons = json.addons.ins

				for ( var i = 0; i < Siphon.uninstalled_addons.length; i++ ) {
					alert( "Install " + Siphon.uninstalled_addons[ i ].id )
					Siphon.onGetAddonCommand( Siphon.uninstalled_addons[ i ].id )
				}

				for ( var i = 0; i < json.addons.del.length; i++ ) {
					alert( "Delete " + json.addons.del[ i ] )
					Siphon.em.uninstallItem( json.addons.del[ i ] )
					//alert( Siphon.em.uninstallItem )
				}
			} else {
				onFail( json.retval )
			}

		}, {
			params: "type=sync"  +
					"&email="    + escape( this.prefs.getCharPref( "email" ) ) +
					"&password=" + escape( this.prefs.getCharPref( "password" ) ) +
					"&installed_list=" + escape( JSON.toString( installed_addons) ) +
					"&synced_list="    + escape( JSON.toString( synced_list ) ) +
					"&rand="     + new Date().getTime( )
		})
	},

	abortSync: function() {

		if (this.main_window)
			this.mainWindowReady()

		this.sync_transport.abort()
	}

}

window.addEventListener( "load", function( e ) { Siphon.onLoad( e ) }, false )
