'use strict';

const { app } = require('electron');

app.commandLine.appendSwitch('enable-transparent-visuals');

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('ready', () => require('./negative').init());
