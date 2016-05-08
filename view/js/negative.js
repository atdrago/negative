(function () {
	'use strict';
	
	const { ipcRenderer } = require('electron');
	const undoManagers = [];
	
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
				} = this.currentUndoManager;
				
				const {
					canZoomIn,
					canZoomOut
				} = this.frameController;
				
				const isImageEmpty = (state.imageSrc === null);

				ipcRenderer.send('refresh-menu', {
					canUndo: canUndo,
					canRedo: canRedo,
					isImageEmpty: isImageEmpty,
					canZoomIn: !isImageEmpty && canZoomIn,
					canZoomOut: !isImageEmpty && canZoomOut
				});
			},
			
			addTabForUndoManager(undoManager) {
				const newUndoManager = new UndoManager();
				
				newUndoManager.history.stack = undoManager.history.stack;
				newUndoManager.history.position = undoManager.history.position;
				newUndoManager.state = undoManager.state;
				
				undoManagers.push(newUndoManager);
				this.tabsController.addTab(false);
			},
			
			getUndoManagerAt(index) {
				return undoManagers[index];
			},
			
			insertUndoManagerAt(index) {
				undoManagers.splice(index, 0, new UndoManager());
			},
			
			removeUndoManagerAt(index) {
				undoManagers.splice(index, 1);
			},
			
			moveUndoManager(fromIndex, toIndex) {
				undoManagers.splice(toIndex, 0, undoManagers.splice(fromIndex, 1)[0]);
			},
			
			saveForUndo(state) {
				this.currentUndoManager.save(state);
				this.refreshMenu();
			},
			
			undo() {
				this.currentUndoManager.undo();
				this.refreshMenu();
			},

			redo() {
				this.currentUndoManager.redo();
				this.refreshMenu();
			}
		};
	});
})();

