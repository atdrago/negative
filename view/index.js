(function (window, document, JSON) { 

'use strict';

let SimpleUndo = require('simple-undo');

class UndoManager {
    constructor() {
        this.state = {
            imageDimensions: null,
            imageSrc: null
        };

        this.history = new SimpleUndo({
            maxLength: 10,
            provider: function(done) {
                return done(JSON.stringify(this.state));
            }.bind(this)
        });
        this.history.initialize(JSON.stringify(this.state));

        this.unserializer = function(serialized) {
            this.state = JSON.parse(serialized);

            let imageDimensions = this.state.imageDimensions,
                imageSrc = this.state.imageSrc;

            if (imageSrc != null) {
                window.negative.frameController.setImageAndSize(imageSrc, imageDimensions[0], imageDimensions[1]);
            } else {
                window.negative.frameController.removeImage();
            }
        }.bind(this);
    }

    save(state) {
        this.state = state;
        this.history.save();
    }

    undo() { this.history.undo(this.unserializer); }
    redo() { this.history.redo(this.unserializer); }
    canUndo() { return this.history.canUndo(); }
    canRedo() { return this.history.canRedo(); }

    serialize() {
        return {
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        };
    }
}

let ipc = require('electron').ipcRenderer

class NegativeFrame {
    constructor() {
        this.imageContainer = document.getElementById('imageContainer');
        this.currentImage = document.getElementById('negativeImage');

        this.currentImage.addEventListener('load', function () {
			document.body.classList.add('negative-on');
		}, false);

        ipc.send('get-settings-request');
        ipc.on('get-settings-response', function (evt, settings) {
            if (settings['shouldShowTips'] === false) {
                document.body.classList.add('no-tips');
            }
        }.bind(this));
    }

    setShouldShowTips(shouldShowTips) {
        if (shouldShowTips) {
            document.body.classList.remove('no-tips');
        } else {
            document.body.classList.add('no-tips');
        }
    }

    setImageAndSize(src, width, height) {
        if (src) {
            document.body.classList.add('negative-on');
            this.currentImage.setAttribute('src', src);

            let newWidth = width + 'px',
                newHeight = height + 'px';

            this.currentImage.style.width = newWidth;
            this.currentImage.style.height = newHeight;
            this.imageContainer.style.width = newWidth;
            this.imageContainer.style.height = newHeight;

            window.negative.tabsController.setTabHasContent();
        }
    }

    removeImage() {
        document.body.classList.remove('negative-on');
        this.currentImage.setAttribute('src', '');

        window.negative.tabsController.unsetTabHasContent();
    }

    unsetFocused() {
        document.body.classList.remove('focus');
        document.body.classList.add('blur');
    }

    setFocused() {
        document.body.classList.remove('blur');
        document.body.classList.add('focus');
    }
}

let clipboard = require('clipboard'),
	nativeImage = require('native-image');

const TAB_WIDTH	= 27;

class NegativeTabs {
	constructor() {
		this.tabIndex = 0;
		this.tabs = [this.getEmptyModel()];

		this.tabsContainer = document.getElementById('tabs');

		// tab events
		this.tabsContainer.addEventListener('click', function (evt) {
            if (evt.target && evt.target.nodeName === 'BUTTON') {
				this.deselectTabByIndex(this.tabIndex);

				this.tabIndex = Array.from(this.tabsContainer.children).indexOf(evt.target);

				this.selectTabByIndex(this.tabIndex);
            }
        }.bind(this), false);
	}

	addTab() {
		this.deselectTabByIndex(this.tabIndex);
		this.tabIndex++;

		let newTabButton = this.getTabButtonElement(true);
		this.tabsContainer.style.width = ((this.tabs.length + 1) * TAB_WIDTH) + 'px';
		this.tabsContainer.insertBefore(newTabButton, this.tabsContainer.children[this.tabIndex]);
		newTabButton.focus();

		this.tabs.splice(this.tabIndex, 0, this.getEmptyModel());
		window.negative.frameController.removeImage();

		this.refreshMenu();
	}

	closeTab() {
		let closedTabIndex = this.tabIndex;

		if (!this.canSelectNextTab()) {
			if (this.canSelectPreviousTab()) {
				this.tabIndex--;
			} else {
				ipc.send('close-window');
				return;
			}
		}

		this.tabsContainer.style.width = ((this.tabs.length - 1) * TAB_WIDTH) + 'px';
		this.tabsContainer.children[closedTabIndex].remove();
		this.tabs.splice(closedTabIndex, 1);
		this.selectTabByIndex(this.tabIndex);
	}

	canSelectNextTab() {
		return this.tabIndex + 1 < this.tabs.length;
	}

	canSelectPreviousTab() {
		return this.tabIndex > 0;
	}

	selectTabByIndex(index) {
		let newTab = this.tabs[index].undoManager.state,
			newTabButton = this.tabsContainer.children[index],
			imageSrc = newTab.imageSrc,
			imageDimensions = newTab.imageDimensions;

		newTabButton.classList.add('selected');
		newTabButton.setAttribute('aria-selected', 'true');
		newTabButton.focus();

		if (imageSrc && imageDimensions) {
			window.negative.frameController.setImageAndSize(imageSrc, imageDimensions[0], imageDimensions[1]);
		} else {
			window.negative.frameController.removeImage();
		}

		this.refreshMenu();
	}

	deselectTabByIndex(index) {
		let oldTab = this.tabsContainer.children[index];
		oldTab.classList.remove('selected');
		oldTab.setAttribute('aria-selected', 'false');
	}

	selectNextTab() {
		let canSelectNextTab = this.canSelectNextTab();

		if (canSelectNextTab) {
			this.deselectTabByIndex(this.tabIndex);
			this.tabIndex++;
			this.selectTabByIndex(this.tabIndex);
		}

		return canSelectNextTab;
	}

	selectPreviousTab() {
		let canSelectPreviousTab = this.canSelectPreviousTab();

		if (canSelectPreviousTab) {
			this.deselectTabByIndex(this.tabIndex);
			this.tabIndex--;
			this.selectTabByIndex(this.tabIndex);
		}

		return canSelectPreviousTab;
	}

	setTabHasContent() {
		this.tabsContainer.children[this.tabIndex].classList.add('has-content');
	}

	unsetTabHasContent() {
		this.tabsContainer.children[this.tabIndex].classList.remove('has-content');
	}

	getEmptyModel() {
		return {
			undoManager: new UndoManager()
		};
	}

	getTabButtonElement(isSelected) {
		let newTabButton = document.createElement('button');

		newTabButton.classList.add('tab');
		newTabButton.setAttribute('aria-label', 'tab');

		if (isSelected) {
			newTabButton.classList.add('selected');
			newTabButton.setAttribute('aria-selected', 'true');
		}

		return newTabButton;
	}

	saveForUndo(state) {
		let undoManager = this.tabs[this.tabIndex].undoManager;

		undoManager.save(state);

		this.refreshMenu();
	}

	undo() {
		let undoManager = this.tabs[this.tabIndex].undoManager;

		undoManager.undo();

		this.refreshMenu();
	}

	redo() {
		let undoManager = this.tabs[this.tabIndex].undoManager;

		undoManager.redo();

		this.refreshMenu();
	}

	copy() {
        let undoManagerState = this.tabs[this.tabIndex].undoManager.state,
			imageSrc = undoManagerState.imageSrc,
			imageDimensions = undoManagerState.imageDimensions;

        if (imageSrc !== null && imageDimensions !== null) {
			clipboard.write({
				image: nativeImage.createFromDataURL(imageSrc),
				text: JSON.stringify(imageDimensions)
			});

            this.refreshMenu();
        }
    }

	paste() {
        let image = clipboard.readImage(),
			imageDimensions;

		try {
			// Try to parse text as image dimensions, but this could anything,
			// such as the image's file name, so prevent the error.
			imageDimensions = JSON.parse(clipboard.readText() || null);
		} catch (err) {}

        if (image !== null) {
			if (!imageDimensions) {
				imageDimensions = (function (dims) { return [dims.width, dims.height]; })(image.getSize());
			}

			let imageSrc = image.toDataURL();

			window.negative.frameController.setImageAndSize(imageSrc, imageDimensions[0], imageDimensions[1]);
            this.saveForUndo({
				imageSrc: imageSrc,
                imageDimensions: imageDimensions
            });
			this.refreshMenu();
        }
    }

	refreshMenu() {
		let undoManager = this.tabs[this.tabIndex].undoManager;

		ipc.send('refresh-menu', {
			canUndo: undoManager.canUndo(),
			canRedo: undoManager.canRedo(),
			isImageEmpty: undoManager.state.imageSrc === null,
			canSelectPreviousTab: this.canSelectPreviousTab(),
			canSelectNextTab: this.canSelectNextTab()
		});
	}

	fitWindowToImage() {
		let undoManagerState = this.tabs[this.tabIndex].undoManager.state;

		ipc.send('fit-window-to-image', undoManagerState.imageDimensions);
	}
}

document.addEventListener('DOMContentLoaded', function () {

	window.negative = {
		frameController: new NegativeFrame(),
		tabsController: new NegativeTabs()
	};

	let noop = function (evt) { evt.preventDefault(); return false; };

	document.body.addEventListener('dragend', 	noop, false);
	document.body.addEventListener('dragleave', noop, false);
	document.body.addEventListener('dragover', 	noop, false);
	document.body.addEventListener('dragstart', noop, false);
	document.body.addEventListener('drop', 		noop, false);

});

})(window, document, JSON);