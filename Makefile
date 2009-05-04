REQ_FILES=chrome.manifest install.rdf
REQ_DIRS=content defaults locale skin
XTRA_FILES=README COPYING
BUILD_DIR=build
NAME=`bzr nick`
VERNUM=`vernum`
FNAME=$(NAME)-$(VERNUM)

make:
	mkdir -p $(BUILD_DIR)/$(FNAME)
	cp -r $(REQ_FILES) $(REQ_DIRS) $(XTRA_FILES) $(BUILD_DIR)/$(FNAME)
	cd $(BUILD_DIR)/$(FNAME) && zip -r ../$(FNAME).zip *
	mv $(BUILD_DIR)/$(FNAME).zip $(BUILD_DIR)/$(FNAME).xpi

clean:
	rm -rf build
