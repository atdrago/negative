'use strict';

const { ipcMain } = require('electron');

module.exports = {
	init: (negative) => {
		ipcMain.on('test-move-left-1', () => negative.move('left', 1));
		ipcMain.on('test-move-right-1', () => negative.move('right', 1));
		ipcMain.on('test-move-up-1', () => negative.move('up', 1));
		ipcMain.on('test-move-down-1', () => negative.move('down', 1));
		ipcMain.on('test-move-left-10', () => negative.move('left', 10));
		ipcMain.on('test-move-right-10', () => negative.move('right', 10));
		ipcMain.on('test-move-up-10', () => negative.move('up', 10));
		ipcMain.on('test-move-down-10', () => negative.move('down', 10));
	}
};
