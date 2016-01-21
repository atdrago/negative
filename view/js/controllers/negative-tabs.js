let clipboard = require('clipboard'),
	nativeImage = require('native-image'),
	remote = require('electron').remote,
	BrowserWindow = remote.BrowserWindow;

class NegativeTabs {
	constructor() {
		this.tabIndex = 0;
		this.tabs = [this.getEmptyModel()];
		this.tabsContainer = document.getElementById('tabs');
		
		let dragOverIndex = null;

		// Tab Selecting
		this.tabsContainer.addEventListener('mousedown', function (evt) {
			let target = evt.target;

			if (target) {
				if (target.classList.contains('tab')) {
					this.deselectTabByIndex(this.tabIndex);

					this.tabIndex = Array.from(this.tabsContainer.children).indexOf(target);

					this.selectTabByIndex(this.tabIndex);
	            } else if (target.classList.contains('close')) {
					// TODO: Rethink moving this to a click event
					this.closeTab();
				}
			}
        }.bind(this), false);

		this.tabsContainer.addEventListener('dragstart', function (evt) {
			let target = evt.target;

			if (target) {
				if (target.classList.contains('tab') && this.tabs.length > 1) {
					evt.dataTransfer.setData('from-index', `${this.tabIndex}`);
					evt.dataTransfer.effectAllowed = 'move';
				} else {
					evt.preventDefault();
					return false;
				}
			}
		}.bind(this));

		this.tabsContainer.addEventListener('dragover', function (evt) {
			evt.preventDefault();

			let leftOffset = 70,
				x = evt.x - leftOffset,
				// 126 is the width of a tab
				// TODO: What if a tab grows?
				toIndex = Math.floor(x / 126),
				fromIndex = +evt.dataTransfer.getData('from-index');
				
			if (toIndex !== dragOverIndex) {
				let newTransform = (((toIndex - fromIndex) * 126)) + 'px';
				this.tabsContainer.children[fromIndex].style.left = newTransform;
				dragOverIndex = toIndex;
			}

			for (let i = 0, len = this.tabsContainer.children.length; i < len; i++) {
				let tab = this.tabsContainer.children[i];

				if (fromIndex > i) {
					if (toIndex <= i) {
						tab.classList.add('shift-right');
					} else {
						tab.classList.remove('shift-right');
					}
				} else if (fromIndex < i) {
					if (toIndex >= i) {
						tab.classList.add('shift-left');
					} else {
						tab.classList.remove('shift-left');
					}
				}
			}
		}.bind(this));

		this.tabsContainer.addEventListener('dragend', function (evt) {
			Array.from(this.tabsContainer.children).forEach(function (tab) {
				tab.classList.add('shift-none');
				tab.style.transform = '';
				tab.style.left = '';
				dragOverIndex = null;

				setTimeout(function () {
					tab.classList.remove('shift-none', 'shift-left', 'shift-right');
				}, 250);
			});
		}.bind(this));

		this.tabsContainer.addEventListener('drop', function (evt) {
			evt.preventDefault();

			let target = evt.target;

			if (target) {
				if (target.classList.contains('tab')) {
					let leftOffset = 70,
						x = evt.x - leftOffset,
						// 126 is the width of a tab
						// TODO: What if a tab grows?
						toIndex = Math.floor(x / 126),
						fromIndex = +evt.dataTransfer.getData('from-index');

					this.moveTab(fromIndex, toIndex > fromIndex ? toIndex + 1 : toIndex);
					this.tabs.splice(toIndex, 0, this.tabs.splice(fromIndex, 1, null)[0]);
					this.tabs = this.tabs.filter(function (tab) { return tab !== null; });
					this.tabIndex = toIndex;
				}
			}
		}.bind(this));


		// Traffic lights
		document.getElementById('close').addEventListener('click', function (evt) {
			BrowserWindow.getFocusedWindow().close();
		});

		document.getElementById('minimize').addEventListener('click', function (evt) {
			BrowserWindow.getFocusedWindow().minimize();
		});

		document.getElementById('maximize').addEventListener('click', function (evt) {
			BrowserWindow.getFocusedWindow().maximize();
		});
	}

	addTab() {
		this.deselectTabByIndex(this.tabIndex);
		this.tabIndex++;

		let newTabButton = this.getTabButtonElement(true);
		this.tabsContainer.insertBefore(newTabButton, this.getCurrentTab());
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
				BrowserWindow.getFocusedWindow().close();
				return;
			}
		}

		this.tabsContainer.children[closedTabIndex].remove();
		this.tabs.splice(closedTabIndex, 1);
		this.selectTabByIndex(this.tabIndex);
	}

	getCurrentTab() {
		return this.tabsContainer.children[this.tabIndex];
	}

	moveTab(fromIndex, toIndex) {
		this.tabsContainer.insertBefore(this.tabsContainer.children[fromIndex], this.tabsContainer.children[toIndex]);
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
		this.getCurrentTab().classList.add('has-content');
	}

	unsetTabHasContent() {
		this.getCurrentTab().classList.remove('has-content');
	}

	setTabLabel(label) {
		this.getCurrentTab().children[0].textContent = label;
	}

	getEmptyModel() {
		return {
			undoManager: new UndoManager()
		};
	}

	getTabButtonElement(isSelected) {
		let tabDiv = document.createElement('div'),
			labelSpan = document.createElement('span'),
			closeButton = document.createElement('button');

		// <div class="tab selected" aria-selected="true">
		// 	<span class="label"></span>
		// 	<button class="close" aria-label="close"></button>
		// </div>

		tabDiv.classList.add('tab');
		tabDiv.setAttribute('draggable', 'true');

		labelSpan.classList.add('label');

		closeButton.classList.add('close');
		closeButton.setAttribute('aria-label', 'close');
		closeButton.innerHTML = '&times;';

		if (isSelected) {
			tabDiv.classList.add('selected');
			tabDiv.setAttribute('aria-selected', 'true');
		}

		tabDiv.appendChild(labelSpan);
		tabDiv.appendChild(closeButton);

		return tabDiv;
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
			canAddTab: true,
			canCloseTab: true,
			canCloseWindow: true,
			canUndo: undoManager.canUndo(),
			canRedo: undoManager.canRedo(),
			canCapture: true,
			isImageEmpty: undoManager.state.imageSrc === null,
			canReload: true,
			canToggleDevTools: true,
			canSelectPreviousTab: this.canSelectPreviousTab(),
			canSelectNextTab: this.canSelectNextTab(),
			canMinimize: true,
            canMove: true
		});
	}

	fitWindowToImage() {
		let undoManagerState = this.tabs[this.tabIndex].undoManager.state;

		ipc.send('fit-window-to-image', undoManagerState.imageDimensions);
	}
}
