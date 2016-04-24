(function () {
	'use strict';
	
	const { ipcRenderer } = require('electron');
	
	document.addEventListener('DOMContentLoaded', () => {
		const undoManagers = [];
		
		window.negative = {
			
			frameController: new NegativeFrame(),
			tabsController: new NegativeTabs(),
			trafficLightsController: new NegativeTrafficLights(),
			
			refreshMenu: function () {
				const {
					canUndo,
					canRedo,
					state
				} = this.tabsController.undoManager;
				
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
			
			getUndoManagerAt: function (index) {
				return undoManagers[index];
			},
			
			insertUndoManagerAt: function (index) {
				undoManagers.splice(index, 0, new UndoManager());
			},
			
			removeUndoManagerAt: function (index) {
				undoManagers.splice(index, 1);
			},
			
			swapUndoManagersAt: function (indexA, indexB) {
				undoManagers.splice(spliceToIndex, 0, undoManagers.splice(fromIndex, 1, null)[0]);
				undoManagers = undoManagers.filter((tab) => tab !== null);
			},
			
			saveForUndo: function (index, state) {
				undoManagers[index].save(state);
				this.refreshMenu();
			},
			
			undo(index) {
				undoManagers[index].undo();
				this.refreshMenu();
			},

			redo(index) {
				undoManagers[index].redo();
				this.refreshMenu();
			}
		};
	});
})();

