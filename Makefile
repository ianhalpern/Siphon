REQ_FILES=chrome.manifest install.rdf
REQ_DIRS=content defaults locale skin modules
XTRA_FILES=README COPYING
BUILD_DIR=build
NAME=`bzr nick`
VERSION=`./version.sh`
FNAME="$(NAME)-$(VERSION)"

make:
	mkdir -p $(BUILD_DIR)/$(FNAME)
	bzr export $(BUILD_DIR)/$(FNAME)-export
	cd $(BUILD_DIR)/$(FNAME)-export && build_rdf.py $(VERSION)
	cd $(BUILD_DIR)/$(FNAME)-export && cp -r $(REQ_FILES) $(REQ_DIRS) $(XTRA_FILES) ../$(FNAME)
	cd $(BUILD_DIR)/$(FNAME) && zip -r ../$(FNAME).zip *
	mv $(BUILD_DIR)/$(FNAME).zip $(BUILD_DIR)/$(FNAME).xpi
	echo "REMEMBER: Update links to http://siphon-fx.com."
	echo "REMEMBER: Update version number in defaults/preferences/defaults.js."

rdf:
	build_rdf.py $(VERSION)

clean:
	rm -rf $(BUILD_DIR)
