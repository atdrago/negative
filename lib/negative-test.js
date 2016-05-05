'use strict';

const { ipcMain } = require('electron');

const { negativeMenu } = require('./negative');

module.exports = {
	init() {
		ipcMain.on('test-move-left-1', () => this.simulateMenuClick(['Window', 'Move', 'Left by 1px']));
		ipcMain.on('test-move-right-1', () => this.simulateMenuClick(['Window', 'Move', 'Right by 1px']));
		ipcMain.on('test-move-up-1', () => this.simulateMenuClick(['Window', 'Move', 'Up by 1px']));
		ipcMain.on('test-move-down-1', () => this.simulateMenuClick(['Window', 'Move', 'Down by 1px']));
		ipcMain.on('test-move-left-10', () => this.simulateMenuClick(['Window', 'Move', 'Left by 10px']));
		ipcMain.on('test-move-right-10', () => this.simulateMenuClick(['Window', 'Move', 'Right by 10px']));
		ipcMain.on('test-move-up-10', () => this.simulateMenuClick(['Window', 'Move', 'Up by 10px']));
		ipcMain.on('test-move-down-10', () => this.simulateMenuClick(['Window', 'Move', 'Down by 10px']));
	},
	
	/**
	 * Simulate a click on the menu
	 * @param  {array} menuPath The path of menu items to take. ['File', 'Quit']
	 */
	simulateMenuClick(menuPath) {
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
};
