(function () {
	'use strict';
	
	const { ipcRenderer } = require('electron');
	
	document.addEventListener('DOMContentLoaded', () => {
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
				
				const isImageEmpty = (state.imageSrc === null);

				ipcRenderer.send('refresh-menu', {
					canUndo: canUndo,
					canRedo: canRedo,
					isImageEmpty: isImageEmpty,
					canZoomIn: !isImageEmpty && this.frameController.canZoomIn(),
					canZoomOut: !isImageEmpty && this.frameController.canZoomOut()
				});
			}
		};
	});
})();

