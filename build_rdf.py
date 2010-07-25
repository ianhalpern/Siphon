#!/usr/bin/python
import sys

ID      = "siphon@siphon.ian-halpern.com"
NAME    = "Siphon - Sync Add-ons"
VERSION = sys.argv[1] if len( sys.argv ) >= 2 else "UNKNOWN"
DESC    = "Keep your favorite Extensions synced with all your computers."
AUTHOR  = "Ian Halpern"
WEBSITE = "http://siphon-fx.com"

rdf = """<?xml version="1.0"?>
<RDF xmlns="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
     xmlns:em="http://www.mozilla.org/2004/em-rdf#">

	<Description about="urn:mozilla:install-manifest">

		<em:id>%s</em:id>
		<em:name>%s</em:name>
		<em:version>%s</em:version>
		<em:description>%s</em:description>
		<em:creator>%s</em:creator>
		<!-- optional items
		<em:contributor>A person who helped you</em:contributor>
		<em:contributor>Another one</em:contributor> -->
		<em:homepageURL>%s</em:homepageURL>
		<!--
		<em:aboutURL>chrome://sampleext/content/about.xul</em:aboutURL>
		<em:updateURL>http://sampleextension.mozdev.org/update.rdf</em:updateURL-->
		<em:iconURL>chrome://siphon/content/icons/icon-32x32.png</em:iconURL>
		<em:optionsURL>chrome://siphon/content/options.xul</em:optionsURL>


		<!-- Firefox -->
		<em:targetApplication>
		  <Description>
			<em:id>{ec8030f7-c20a-464f-9b0e-13a3a9e97384}</em:id>
			<em:minVersion>3.0</em:minVersion>
			<em:maxVersion>3.5.*</em:maxVersion>
		  </Description>
		</em:targetApplication>

	</Description>

</RDF>""" % ( ID, NAME, VERSION, DESC, AUTHOR, WEBSITE )

open( "install.rdf", "w" ).write( rdf )
