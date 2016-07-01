'use strict';

const electronWindow = require('electron-window');

const {
	DEFAULT_WINDOW_HEIGHT,
	DEFAULT_WINDOW_WIDTH,
	TAB_HEIGHT
} = require('../../config/constants');

module.exports = {
	negativeWindow(_window) {
		const bounds = _window ? _window.bounds : {};

		const newWindow = electronWindow.createWindow({
			acceptFirstMouse: true,
			alwaysOnTop: true,
			enableLargerThanScreen: true,
			fullscreen: false,
			hasShadow: false,
			height: bounds.height || DEFAULT_WINDOW_HEIGHT,
			frame: false,
			title: 'Negative',
			transparent: true,
			webPreferences: {
				webgl: false,
				webaudio: false
			},
			width: bounds.width || DEFAULT_WINDOW_WIDTH,
			x: bounds.x,
			y: bounds.y
		});

		newWindow.setSheetOffset(TAB_HEIGHT);

		return newWindow;
	},
	
	settingsWindow() {
		return electronWindow.createWindow({
			acceptFirstMouse: true,
			alwaysOnTop: true,
			fullscreen: false,
			height: 243,
			resizable: false,
			title: 'Negative - Preferences',
			webPreferences: {
				webgl: false,
				webaudio: false
			},
			width: 515
		});
	}
};
