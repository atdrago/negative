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
				
				if (menuItem) {
					const { enabled, visible, click } = menuItem;
					
					if (enabled !== false && visible !== false && typeof click === 'function') {
						menuItem.click();
					}
				}
			}
		}
		
		// Negative
		ipcMain.on('test-quit-negative', () => simulateMenuClick(['Negative', 'Quit Negative']));
		ipcMain.on('test-preferences', () => simulateMenuClick(['Negative', 'Preferences...']));
		
		// File
		ipcMain.on('test-new-tab', () => simulateMenuClick(['File', 'New Tab']));
		ipcMain.on('test-new-window', () => simulateMenuClick(['File', 'New Window']));
		ipcMain.on('test-close-tab', () => simulateMenuClick(['File', 'Close Tab']));
		
		// Edit
		ipcMain.on('test-undo', () => simulateMenuClick(['Edit', 'Undo']));
		ipcMain.on('test-redo', () => simulateMenuClick(['Edit', 'Redo']));
		ipcMain.on('test-copy', () => simulateMenuClick(['Edit', 'Copy']));
		ipcMain.on('test-paste', () => simulateMenuClick(['Edit', 'Paste']));
		
		// View
		ipcMain.on('test-capture', () => simulateMenuClick(['View', 'Capture']));
		ipcMain.on('test-clear', () => simulateMenuClick(['View', 'Clear']));
		ipcMain.on('test-actual-size', () => simulateMenuClick(['View', 'Actual Size']));
		ipcMain.on('test-zoom-in', () => simulateMenuClick(['View', 'Zoom In']));
		ipcMain.on('test-zoom-out', () => simulateMenuClick(['View', 'Zoom Out']));
		ipcMain.on('test-toggle-devtools', () => simulateMenuClick(['View', 'Toggle DevTools']));
		
		// Window
		ipcMain.on('test-fit-window-to-image', () => simulateMenuClick(['Window', 'Fit Window to Image']));
		ipcMain.on('test-next-tab', () => simulateMenuClick(['Window', 'Next Tab']));
		ipcMain.on('test-previous-tab', () => simulateMenuClick(['Window', 'Previous Tab']));
		ipcMain.on('test-next-tab-and-resize', () => simulateMenuClick(['Window', 'Next Tab and Resize']));
		ipcMain.on('test-previous-tab-and-resize', () => simulateMenuClick(['Window', 'Previous Tab and Resize']));
		
		// Window -> Move
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
