window.NegativeTabs = (function () {
	'use strict';
	
	const {
		clipboard,
		ipcRenderer,
		nativeImage,
		remote
	} = require('electron');

	const { BrowserWindow } = remote;

	const TAB_BAR_MARGIN_LEFT = 70;
	const TAB_BAR_PADDING_LEFT = 16;
	const TAB_MARGIN_LEFT = 6;
	const TAB_MARGIN_RIGHT = 20;
	const TAB_MARGIN_HORIZ = TAB_MARGIN_LEFT + TAB_MARGIN_RIGHT;
	
	class NegativeTabs {
		get siblingTabIndex() {
			return this.getSiblingTabIndex(this.tabIndex);
		}
		
		get selectedTab() {
			return this.tabsContainer.children[this.tabIndex];
		}
		
		constructor() {
			this.count         = 0;
			this.dragOverIndex = null;
			this.tabIndex      = -1;
			
			this.tabBar        = document.getElementById('tabbar');
			this.tabsContainer = document.getElementById('tabs');
				
			// Tab Selecting
			this.tabsContainer.addEventListener('mousedown', this._mouseDown.bind(this), false);

			// Tab Dragging
			this.tabsContainer.addEventListener('dragstart', this._dragStart.bind(this), false);
			this.tabsContainer.addEventListener('dragover', this._dragOver.bind(this), false);
			this.tabsContainer.addEventListener('dragend', this._dragResetStyles.bind(this), false);
			this.tabsContainer.addEventListener('drop', this._drop.bind(this), false);
		}
		
		getSiblingTabIndex(index) {
			return Math.abs(index - 1);
		}
		
		_mouseDown(evt) {
			const { target } = evt;

			if (target) {
				if (target.classList.contains('tab')) {
					this.deselectTabByIndex(this.tabIndex);

					this.tabIndex = Array.from(this.tabsContainer.children).indexOf(target);

					this.selectTabByIndex(this.tabIndex);
				} else if (target.classList.contains('close')) {
					// @TODO: Rethink moving this to a click event
					this.closeTab();
				}
			}
		}
		
		_dragStart(evt) {
			const { target } = evt;

			if (target) {
				if (target.classList.contains('tab') && this.count > 1) {
					evt.dataTransfer.setData('from-index', `${this.tabIndex}`);
					evt.dataTransfer.effectAllowed = 'move';
				} else {
					evt.preventDefault();
					return false;
				}
			}
		}
		
		_dragOver(evt) {
			evt.preventDefault();

			const x                  = evt.x - TAB_BAR_MARGIN_LEFT;
			const fromIndex          = +evt.dataTransfer.getData('from-index');
			const deselectedTabWidth = this.getTabWidth(this.siblingTabIndex);
			const toIndex            = Math.floor(x / deselectedTabWidth);
			const selectedTabWidth   = this.getTabWidth(fromIndex);
			
			if (toIndex !== this.dragOverIndex) {
				const newTransform = (((toIndex - fromIndex) * deselectedTabWidth));
				
				this.tabsContainer.children[fromIndex].style.left = `${newTransform}px`;
				this.dragOverIndex = toIndex;
			}
			
			Array.from(this.tabsContainer.children).forEach((tab, i) => {
				if (fromIndex > i) {
					if (toIndex <= i) {
						tab.style.transform = `translateX(${selectedTabWidth}px)`;
					} else {
						tab.style.transform = '';
					}
				} else if (fromIndex < i) {
					if (toIndex >= i) {
						tab.style.transform = `translateX(-${selectedTabWidth}px)`;
					} else {
						tab.style.transform = '';
					}
				}
			});
		}
		
		_dragResetStyles() {
			const animationDelay = 250;
			
			this.tabsContainer.classList.add('shift-none');
			setTimeout(() => {
				this.tabsContainer.classList.remove('shift-none');
			}, animationDelay);
			
			Array.from(this.tabsContainer.children).forEach((tab) => {
				tab.style.transform = '';
				tab.style.left = '';
				this.dragOverIndex = null;
			
				setTimeout(() => {
					tab.classList.remove('shift-left', 'shift-right');
				}, animationDelay);
			});
		}
		
		_drop(evt) {
			evt.preventDefault();

			const { target } = evt;

			if (target && target.classList.contains('tab')) {
				const x             = evt.x - TAB_BAR_MARGIN_LEFT;
				const fromIndex     = +evt.dataTransfer.getData('from-index');
				const tabWidth      = this.getTabWidth(this.getSiblingTabIndex(fromIndex));
				const toIndex       = Math.floor(x / tabWidth);
				const spliceToIndex = toIndex > fromIndex ? toIndex + 1 : toIndex;
					
				this.moveTab(fromIndex, spliceToIndex);
				window.negative.moveUndoManager(fromIndex, spliceToIndex);
				this.tabIndex = toIndex;
				
				this._dragResetStyles();
			}
		}
		
		getTabWidth(tabIndex) {
			if (tabIndex >= 0 && tabIndex < this.tabsContainer.children.length) {
				return this.tabsContainer.children[tabIndex].getBoundingClientRect().width + TAB_MARGIN_HORIZ;
			}
		}
		
		getTabOffsetLeft(tabIndex) {
			if (tabIndex >= 0 && tabIndex < this.tabsContainer.children.length) {
				const leftOffset = TAB_BAR_MARGIN_LEFT + TAB_BAR_PADDING_LEFT + TAB_MARGIN_LEFT;
				
				return this.tabsContainer.children[tabIndex].getBoundingClientRect().left - leftOffset;
			}
		}
		
		updateTabBarScrollPosition() {
			const siblingTabWidth = this.getTabWidth(this.siblingTabIndex);
			const tabBarWidth     = this.tabsContainer.getBoundingClientRect().width;
			const tabWidth        = this.getTabWidth(this.tabIndex);
			
			const tabOffsetLeft   = this.getTabOffsetLeft(this.tabIndex);
			const tabOffsetRight  = tabOffsetLeft + tabWidth;
			const isLeftOfView    = tabOffsetLeft < 0;
			const isRightOfView   = tabOffsetRight > tabBarWidth;
			
			const tabChildOffsetLeft = this.tabIndex * siblingTabWidth;
			// const tabChildOffsetRight = tabChildOffsetLeft + tabWidth;
			
			if (isLeftOfView) {
				this.tabBar.scrollLeft = tabChildOffsetLeft;
			} else if (isRightOfView) {
				this.tabBar.scrollLeft = (tabOffsetLeft - tabBarWidth) + this.tabBar.scrollLeft + tabWidth;
			}
		}

		addTab(needsUndoManager) {
			this.deselectTabByIndex(this.tabIndex);
			this.tabIndex++;
			this.count++;
			
			const newTabButton = this.getTabButtonElement(true);

			this.tabsContainer.insertBefore(newTabButton, this.selectedTab);
			newTabButton.focus();
			
			if (needsUndoManager) {
				window.negative.insertUndoManagerAt(this.tabIndex);
				window.negative.frameController.removeImage();
			} else {
				this.selectTabByIndex(this.tabIndex);
			}
			
			this.updateTabBarScrollPosition();
			
			window.negative.refreshMenu();
		}

		closeTab() {
			const closedTabIndex = this.tabIndex;

			if (this.count === 1) {
				BrowserWindow.getFocusedWindow().close();
				return;
			} else {
				const newTabIndex = this.tabIndex - 1;
				this.tabIndex = newTabIndex > 0 ? newTabIndex : 0;
			}
			
			window.negative.removeUndoManagerAt(closedTabIndex);
			
			this.tabsContainer.children[closedTabIndex].remove();
			this.selectTabByIndex(this.tabIndex);
			this.count--;
		}

		moveTab(fromIndex, toIndex) {
			this.tabsContainer.insertBefore(this.tabsContainer.children[fromIndex], this.tabsContainer.children[toIndex]);
		}

		selectTabByIndex(index) {
			const newTabButton        = this.tabsContainer.children[index];
			const tabUndoManagerState = window.negative.getUndoManagerAt(index).state;
			const {
				imageDimensions,
				imageSrc
			} = tabUndoManagerState;
			
			// @TODO - This is redundant. See selectNextTab(), selectPreviousTab()
			this.tabIndex = index;

			newTabButton.classList.add('selected');
			newTabButton.setAttribute('aria-selected', 'true');
			newTabButton.focus();
			
			if (imageSrc && imageDimensions) {
				window.negative.frameController.setImageAndSize(imageSrc, imageDimensions[0], imageDimensions[1]);
			} else {
				window.negative.frameController.removeImage();
			}

			window.negative.refreshMenu();
		}

		deselectTabByIndex(index) {
			const oldTab = this.tabsContainer.children[index];
			
			if (oldTab) {
				oldTab.classList.remove('selected');
				oldTab.setAttribute('aria-selected', 'false');
			}
		}
		
		deselectTab() {
			this.deselectTabByIndex(this.tabIndex);
		}

		selectNextTab() {
			this.deselectTabByIndex(this.tabIndex);

			if (this.tabIndex + 1 < this.count) {
				this.tabIndex++;
			} else {
				this.tabIndex = 0;
			}

			this.selectTabByIndex(this.tabIndex);
			this.updateTabBarScrollPosition();
		}

		selectPreviousTab() {
			this.deselectTabByIndex(this.tabIndex);
			
			if (this.tabIndex > 0) {
				this.tabIndex--;
			} else {
				this.tabIndex = this.count - 1;
			}

			this.selectTabByIndex(this.tabIndex);
			this.updateTabBarScrollPosition();
		}

		setTabHasContent() {
			this.selectedTab.classList.add('has-content');
		}

		unsetTabHasContent() {
			this.selectedTab.classList.remove('has-content');
		}

		setTabLabel(label) {
			this.selectedTab.children[0].textContent = label;
		}
		
		/**
		 * Returns a DOM Node representing the tab, with the structure:
		 * <div class="tab selected" aria-selected="true">
		 *     <span class="label"></span>
		 *     <button class="close" aria-label="close"></button>
		 * </div>
		 * @param  {Boolean} isSelected Adds `selected` class and `aria-selected=true`
		 * @return {Node}
		 */
		getTabButtonElement(isSelected) {
			const tabDiv      = document.createElement('div');
			const labelSpan   = document.createElement('span');
			const closeButton = document.createElement('button');

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

		copy() {
			const {
				imageDimensions,
				imageSrc
			} = window.negative.currentUndoManager.state;

			if (imageSrc !== null && imageDimensions !== null) {
				clipboard.write({
					image: nativeImage.createFromDataURL(imageSrc),
					text: JSON.stringify(imageDimensions)
				});

				window.negative.refreshMenu();
			}
		}

		paste() {
			const image = clipboard.readImage();
			
			let imageDimensions;

			try {
				// Try to parse text as image dimensions, but this could anything,
				// such as the image's file name, so prevent the error.
				imageDimensions = JSON.parse(clipboard.readText() || null);
			} catch (err) {
				process.stderr.write(err);
			}

			if (image !== null) {
				if (!imageDimensions) {
					const { width, height } = image.getSize();
					imageDimensions = [ width, height ];
				}

				const imageSrc = image.toDataURL();

				window.negative.frameController.setImageAndSize(imageSrc, imageDimensions[0], imageDimensions[1]);
				window.negative.saveForUndo({
					imageDimensions: imageDimensions,
					imageSrc: imageSrc
				});
				window.negative.refreshMenu();
			}
		}

		fitWindowToImage() {
			const { imageDimensions } = window.negative.currentUndoManager.state;

			ipcRenderer.send('fit-window-to-image', imageDimensions);
		}
	}
	
	return NegativeTabs;
})();

