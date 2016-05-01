window.NegativeTrafficLights = (function () {
	'use strict';
	
	const { remote }        = require('electron');
	const { BrowserWindow } = remote;
	
	class NegativeTrafficLights {
		constructor() {
			document.getElementById('close').addEventListener('click', () => {
				BrowserWindow.getFocusedWindow().close();
			});

			document.getElementById('minimize').addEventListener('click', () => {
				BrowserWindow.getFocusedWindow().minimize();
			});

			document.getElementById('maximize').addEventListener('click', () => {
				BrowserWindow.getFocusedWindow().maximize();
			});
		}
	}
	
	return NegativeTrafficLights;
})();
