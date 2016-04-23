window.NegativeTrafficLights = (function () {
	'use strict';
	
	const { remote }        = require('electron');
	const { BrowserWindow } = remote;
	
	class NegativeTrafficLights {
		constructor() {
			document.getElementById('close').addEventListener('click', (evt) => {
				BrowserWindow.getFocusedWindow().close();
			});

			document.getElementById('minimize').addEventListener('click', (evt) => {
				BrowserWindow.getFocusedWindow().minimize();
			});

			document.getElementById('maximize').addEventListener('click', (evt) => {
				BrowserWindow.getFocusedWindow().maximize();
			});
		}
	}
	
	return NegativeTrafficLights;
})();