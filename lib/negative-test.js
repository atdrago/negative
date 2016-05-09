'use strict';

const { ipcMain }      = require('electron');
const { negativeMenu } = require('./negative');

module.exports = {
	init() {
		/**
		 * Simulate a click on the menu
		 * @param  {array} menuPath The path of menu items to take. ['File', 'Quit']
		 */
		function simulateMenuClick(menuPath) {
			if (Array.isArray(menuPath)) {
				let menuItem;
				
				for (const menuName of menuPath) {
					if (!menuItem) {
						menuItem = negativeMenu.template.find((item) => item.label === menuName);
					} else {
						menuItem = menuItem.submenu.find((item) => item.label === menuName);
					}
				}
				
				if (menuItem.enabled !== false && menuItem.visible !== false) {
					menuItem.click();
				}
			}
		}
		
		// Negative
		ipcMain.on('test-quit-negative', () => simulateMenuClick(['Negative', 'Quit Negative']));
		
		// File
		ipcMain.on('test-new-tab', () => simulateMenuClick(['File', 'New Tab']));
		ipcMain.on('test-close-tab', () => simulateMenuClick(['File', 'Close Tab']));
		
		// Edit
		ipcMain.on('test-undo', () => simulateMenuClick(['Edit', 'Undo']));
		ipcMain.on('test-redo', () => simulateMenuClick(['Edit', 'Redo']));
		ipcMain.on('test-copy', () => simulateMenuClick(['Edit', 'Copy']));
		ipcMain.on('test-paste', () => simulateMenuClick(['Edit', 'Paste']));
		
		// View
		ipcMain.on('test-capture', () => simulateMenuClick(['View', 'Capture']));
		ipcMain.on('test-clear', () => simulateMenuClick(['View', 'Clear']));
		
		// Window
		ipcMain.on('test-move-left-1', () => simulateMenuClick(['Window', 'Move', 'Left by 1px']));
		ipcMain.on('test-move-right-1', () => simulateMenuClick(['Window', 'Move', 'Right by 1px']));
		ipcMain.on('test-move-up-1', () => simulateMenuClick(['Window', 'Move', 'Up by 1px']));
		ipcMain.on('test-move-down-1', () => simulateMenuClick(['Window', 'Move', 'Down by 1px']));
		ipcMain.on('test-move-left-10', () => simulateMenuClick(['Window', 'Move', 'Left by 10px']));
		ipcMain.on('test-move-right-10', () => simulateMenuClick(['Window', 'Move', 'Right by 10px']));
		ipcMain.on('test-move-up-10', () => simulateMenuClick(['Window', 'Move', 'Up by 10px']));
		ipcMain.on('test-move-down-10', () => simulateMenuClick(['Window', 'Move', 'Down by 10px']));
	}
};
