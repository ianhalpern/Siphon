REQ_FILES=chrome.manifest install.rdf
REQ_DIRS=content defaults locale skin
XTRA_FILES=README COPYING
BUILD_DIR=build
NAME=`bzr nick`
VERNUM=`vernum`
FNAME="$(NAME)-$(VERNUM)"

VERNUM_QA=`vernum 1`
FNAME_QA="$(NAME)-$(VERNUM_QA)-qa"

make:
	mkdir -p $(BUILD_DIR)/$(FNAME)
	bzr export $(BUILD_DIR)/$(FNAME)-export
	cd $(BUILD_DIR)/$(FNAME)-export && build_rdf.py $(VERNUM)
	cd $(BUILD_DIR)/$(FNAME)-export && cp -r $(REQ_FILES) $(REQ_DIRS) $(XTRA_FILES) ../$(FNAME)
	cd $(BUILD_DIR)/$(FNAME) && zip -r ../$(FNAME).zip *
	mv $(BUILD_DIR)/$(FNAME).zip $(BUILD_DIR)/$(FNAME).xpi

qa:
	mkdir -p $(BUILD_DIR)/$(FNAME_QA)
	build_rdf.py $(VERNUM_QA)-qa
	cp -r $(REQ_FILES) $(REQ_DIRS) $(XTRA_FILES) $(BUILD_DIR)/$(FNAME_QA)
	cd $(BUILD_DIR)/$(FNAME_QA) && zip -r ../$(FNAME_QA).zip *
	mv $(BUILD_DIR)/$(FNAME_QA).zip $(BUILD_DIR)/$(FNAME_QA).xpi

rdf:
	build_rdf.py $(VERNUM)

clean:
	rm -rf $(BUILD_DIR)
