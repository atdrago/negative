'use strict';

const { ipcMain }      = require('electron');
const { negativeMenu } = require('./negative');

const { NEGATIVE_VERBOSE } = process.env;

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
				
				const menuPathString = menuPath.join(' > ');
				
				if (menuItem) {
					const { enabled, visible, click } = menuItem;
					
					if (enabled !== false && visible !== false && typeof click === 'function') {
						menuItem.click();
						
						if (NEGATIVE_VERBOSE === 'true') {
							// eslint-disable-next-line no-console
							console.log(`Menu item "${menuPathString}" was clicked.`);
						}
					} else {
						/* eslint-disable */
						if (NEGATIVE_VERBOSE === 'true') {
							console.log(`Menu item "${menuPathString}" could not be clicked.`);
							console.log(`	menuItem.enabled = ${enabled}`);
							console.log(`	menuItem.visible = ${visible}`);
							console.log(`	menuItem.click = ${typeof click}`);
						}
						/* eslint-enable */
					}
				} else {
					/* eslint-disable */
					if (NEGATIVE_VERBOSE === 'true') {
						console.log(`Menu item "${menuPathString}" could not be found.`);
					}
					/* eslint-enable */
				}
			}
		}
		
		// Negative
		ipcMain.on('test-reset', () => simulateMenuClick(['Negative', 'Reset...']));
		ipcMain.on('test-preferences', () => simulateMenuClick(['Negative', 'Preferences...']));
		ipcMain.on('test-locking', () => simulateMenuClick(['Negative', 'Lock Negative']));
		
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
		ipcMain.on('test-dark-mode', () => simulateMenuClick(['View', 'Dark Mode']));
		ipcMain.on('test-translucence', () => simulateMenuClick(['View', 'Translucence']));
		ipcMain.on('test-inversion', () => simulateMenuClick(['View', 'Inversion']));
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
