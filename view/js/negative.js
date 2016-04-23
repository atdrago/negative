(function () {
	'use strict';
	
	const { ipcRenderer } = require('electron');
	
	document.addEventListener('DOMContentLoaded', () => {
		window.negative = {
			frameController: new NegativeFrame(),
			tabsController: new NegativeTabs(),
			trafficLightsController: new NegativeTrafficLights(),
			
			refreshMenu: function () {
				const undoManager  = this.tabsController.getUndoManager();
				const isImageEmpty = undoManager.state.imageSrc === null;

				ipcRenderer.send('refresh-menu', {
					canUndo: undoManager.canUndo(),
					canRedo: undoManager.canRedo(),
					isImageEmpty: isImageEmpty,
					canZoomIn: !isImageEmpty && this.frameController.canZoomIn(),
					canZoomOut: !isImageEmpty && this.frameController.canZoomOut()
				});
			}
		};
	});
})();

