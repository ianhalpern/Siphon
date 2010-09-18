
var EXPORTED_SYMBOLS = [ "console" ]

var console = {
	verbose: false,
	prefix: '',
	_console: Components.classes["@mozilla.org/consoleservice;1"]
								 .getService(Components.interfaces.nsIConsoleService),

	write: function( message ) {
		if ( this.verbose )
			this._console.logStringMessage( this.prefix + message )
	}
}
