(function () {
	'use strict';
	
	const { ipcRenderer } = require('electron');
	const undoManagers = [];
	
	let addTransitionColorsTimeout;
	let removeTransitionColorsTimeout;
	
	ipcRenderer.on('window-settings-request', (evt, windowSettings) => {
		windowSettings = Object.assign({}, windowSettings, { undoManagers: undoManagers });
		
		ipcRenderer.send('window-settings-response', windowSettings);
	});
	
	document.addEventListener('DOMContentLoaded', () => {
		window.negative = {
			frameController: new NegativeFrame(),
			tabsController: new NegativeTabs(),
			trafficLightsController: new NegativeTrafficLights(),
			
			get currentUndoManager() {
				return undoManagers[this.tabsController.tabIndex];
			},
			
			refreshMenu() {
				const {
					canUndo,
					canRedo,
					state
				} = this.currentUndoManager || {};
				
				const {
					canZoomIn,
					canZoomOut
				} = this.frameController || {};
				
				const isImageEmpty = (typeof state !== 'undefined' ? state.imageSrc === null : true);

				ipcRenderer.send('refresh-menu', {
					canUndo: canUndo,
					canRedo: canRedo,
					isImageEmpty: isImageEmpty,
					canZoomIn: !isImageEmpty && canZoomIn,
					canZoomOut: !isImageEmpty && canZoomOut
				});
			},
			
			sendUndoManagersToMain() {
				ipcRenderer.send('set-undo-managers-request', undoManagers);
			},
			
			addTabForUndoManager(undoManager) {
				const newUndoManager = new UndoManager();
				
				newUndoManager.history.stack = undoManager.history.stack;
				newUndoManager.history.position = undoManager.history.position;
				newUndoManager.state = undoManager.state;
				
				undoManagers.push(newUndoManager);
				this.tabsController.addTab(false);
				this.sendUndoManagersToMain();
			},
			
			getUndoManagerAt(index) {
				return undoManagers[index];
			},
			
			insertUndoManagerAt(index) {
				undoManagers.splice(index, 0, new UndoManager());
				this.sendUndoManagersToMain();
			},
			
			removeUndoManagerAt(index) {
				undoManagers.splice(index, 1);
				this.sendUndoManagersToMain();
			},
			
			moveUndoManager(fromIndex, toIndex) {
				undoManagers.splice(toIndex, 0, undoManagers.splice(fromIndex, 1)[0]);
				this.sendUndoManagersToMain();
			},
			
			saveForUndo(state) {
				this.currentUndoManager.save(state);
				this.refreshMenu();
				this.sendUndoManagersToMain();
			},
			
			undo() {
				this.currentUndoManager.undo();
				this.refreshMenu();
				this.sendUndoManagersToMain();
			},

			redo() {
				this.currentUndoManager.redo();
				this.refreshMenu();
				this.sendUndoManagersToMain();
			},
			
			confirmReset() {
				const shouldReset = confirm('Reset will remove all images, tabs, and windows, and open a new Negative window. Are you sure you want to continue?');
				
				ipcRenderer.send('confirm-reset-response', shouldReset);
			},
			
			toggleDarkMode() {
				const colorTransitionDuration = 500;
				
				clearTimeout(addTransitionColorsTimeout);
				clearTimeout(removeTransitionColorsTimeout);
				
				document.body.classList.add('transition-colors');
				
				addTransitionColorsTimeout = setTimeout(() => {
					if (document.body.classList.contains('light-mode')) {
						document.body.classList.remove('light-mode');
					} else {
						document.body.classList.add('light-mode');
					}
					
					removeTransitionColorsTimeout = setTimeout(() => {
						document.body.classList.remove('transition-colors');
					}, colorTransitionDuration);
				}, 0);
			}
		};
	});
	
	const KEYCODE_EQUALS_SIGN = 187;
	const KEYCODE_UNDERSCORE = 189;
	
	// https://github.com/electron/electron/issues/5256#issuecomment-213559148
	document.addEventListener('keydown', (event) => {
		const { frameController } = window.negative;
		const { keyCode, metaKey, shiftKey } = event;
		
		if (metaKey) {
			if (keyCode === KEYCODE_EQUALS_SIGN) {
				frameController.zoomIn();
			}
			if (keyCode === KEYCODE_UNDERSCORE && shiftKey) {
				frameController.zoomOut();
			}
		}
	});
})();

