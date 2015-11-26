let clipboard = require('clipboard'),
	nativeImage = require('native-image'),
	ipc = require('electron').ipcRenderer;

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
			imageDimensions = JSON.parse(clipboard.readText() || null);

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
