(function () {
	'use strict';
	
	const { ipcRenderer } = require('electron');
	
	document.addEventListener('DOMContentLoaded', () => {
		const undoManagers = [];
		
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

