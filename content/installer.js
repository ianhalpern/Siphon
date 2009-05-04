var SiphonInstaller = {

	init: function ( win ) {

		this.win = win
		$this = this

		for ( var i = 0; i < this.win.Siphon.uninstalled_addons.length; i++ ) {
			/*try {
				alert( this.win.Siphon.em.getItemForID( this.win.Siphon.uninstalled_addons[ i ] ) )
			} catch ( e ) {
				alert( e )
			}*/
			document.getElementById('siphon_addon_listbox').appendChild(
				this.createAddonListitem(
					win.Siphon.uninstalled_addons[ i ].name,
					win.Siphon.uninstalled_addons[ i ].version,
					win.Siphon.uninstalled_addons[ i ].id
				)
			)
		}

	/*	document.getElementById( "close" ).addEventListener( "command", function ( ) {
			var uninstalled_addon_ids = [ ]

			for ( var i = 0; i < win.Siphon.uninstalled_addons.length; i++ )
				uninstalled_addon_ids.push( win.Siphon.uninstalled_addons[ i ].id )

			$this.prefs.setCharPref( "wait_list", uninstalled_addon_ids.join( "," ) )
		} )*/
	},

	createAddonListitem: function ( name, version, guid ) {

		var $this = this

		var list_item = document.createElement( 'richlistitem' )
		list_item.setAttribute( "align", "center" )
		list_item.setAttribute( "id", guid )

		var icon = document.createElement( "image" )
		icon.setAttribute( "src", "chrome://mozapps/skin/xpinstall/xpinstallItemGeneric.png" )
		list_item.appendChild( icon )

		var addon_name = document.createElement( 'label' )
		addon_name.setAttribute( "class", "addon_name" )
		addon_name.setAttribute( "value", name )
		list_item.appendChild( addon_name )

		var addon_version = document.createElement( 'label' )
		addon_version.setAttribute( "value", version )
		list_item.appendChild( addon_version )

		var spacer = document.createElement( 'spacer' )
		spacer.setAttribute( "flex", "1" )
		list_item.appendChild( spacer )

		var install_btn = document.createElement( 'button' )
		install_btn.setAttribute( "label", "install" )
		//install_btn.setAttribute("disabled", "true")
		install_btn.addEventListener( "command", function ( e ) {
			install_btn.setAttribute( "disabled", "true" )
			//install_btn.setAttribute( "label", "restart" )
			$this.win.Siphon.onGetAddonCommand( guid )
			//window.close( )
		}, false )

		list_item.appendChild( install_btn )

		return list_item
		
	}

}
