'use strict';

const {
	app,
	autoUpdater,
	BrowserWindow,
	globalShortcut,
	ipcMain
} = require('electron');

const electronWindow = require('electron-window');
const path           = require('path');
const objc           = require('nodobjc');

const {
	NEGATIVE_IGNORE_SETTINGS,
	NEGATIVE_SKIP_RESET_DIALOG,
	NODE_ENV
} = process.env;

const DEFAULT_WINDOW_HEIGHT = 600;
const DEFAULT_WINDOW_WIDTH  = 800;
const FRAME_WIDTH           = 10;
const TAB_HEIGHT            = 37;
const HEIGHT_COMPENSATION   = FRAME_WIDTH + TAB_HEIGHT;
const WIDTH_COMPENSATION    = FRAME_WIDTH + FRAME_WIDTH;

let isAppHidden            = false;
let isDarkMode             = true;
let isAppLocked            = false;
let mainWindowId           = null;
let settingsWindowId       = null;
let settingsWindowOnOpenJs = '';

objc.framework('Cocoa');

module.exports = {
	get isDarkMode() {
		return isDarkMode;
	},
	
	get isAppHidden() {
		return isAppHidden;
	},
	
	get isAppLocked() {
		return isAppLocked;
	},
	
	init() {
		this.negativeMenu = require('./negative-menu');
		this.negativeSettings = require('./negative-settings');
		
		this.negativeMenu.init(this);
		this.negativeSettings.init(() => {
			const negativeWindows = this.negativeSettings.get('windowSettings');
			
			if (NEGATIVE_IGNORE_SETTINGS === 'true') {
				isDarkMode = true;
			} else {
				isDarkMode = this.negativeSettings.get('isDarkMode') !== false;
			}

			if (!negativeWindows || negativeWindows.length === 0 || NEGATIVE_IGNORE_SETTINGS === 'true') {
				this.initNegativeWindow();
			} else {
				negativeWindows.forEach((_window) => this.initNegativeWindow(_window));
			}
		});

		this.initGlobalShortcuts();
		this.initIpcEvents();
		
		if (NODE_ENV === 'development') {
			require('./negative-test').init();
		}
		
		app.on('before-quit', () => {
			// Save settings before quitting.
			const negativeWindows = [];
			const windowsKeys     = Object.keys(electronWindow.windows).filter((key) => key !== settingsWindowId);
			const windowCount     = windowsKeys.length;

			if (windowCount > 0) {
				for (const key of windowsKeys) {
					const _window = electronWindow.windows[key];
					const windowSettings = {
						bounds: _window.getBounds(),
						// Always set the last focused window as the window to be focused
						// on next launch. All others should not be focused.
						isFocused: (key === mainWindowId),
						tabIndex: _window.tabIndex,
						undoManagers: _window.undoManagers,
						zoomLevel: _window.zoomLevel
					};
					
					negativeWindows.push(windowSettings);
				}
			}
			
			this.negativeSettings.set('windowSettings', negativeWindows);
			this.negativeSettings.save();
		});
		
		process.on('uncaughtException', (err) => {
			/* eslint-disable no-console */
			console.log(`Caught exception: ${err}`);
			console.error(err);
			/* eslint-enable no-console */
		});
	},

	initIpcEvents() {
		ipcMain.on('fit-window-to-image', (evt, dimensions) => {
			const focusedWindow = BrowserWindow.getFocusedWindow();

			if (focusedWindow && dimensions) {
				focusedWindow.setSize(dimensions[0] + WIDTH_COMPENSATION, dimensions[1] + HEIGHT_COMPENSATION, true);
			}
		});

		ipcMain.on('set-settings-request', (evt, settings) => {
			for (const key in settings) {
				if (settings.hasOwnProperty(key)) {
					this.negativeSettings.set(key, settings[key]);
				}
			}

			this.negativeSettings.save();

			const windows = electronWindow.windows;

			for (const key in windows) {
				if (windows.hasOwnProperty(key) && settingsWindowId !== key) {
					const shouldShowTips = this.negativeSettings.get('shouldShowTips');
					const _window        = windows[key];
					
					_window.webContents.executeJavaScript(`negative.frameController.setShouldShowTips(${shouldShowTips})`);
				}
			}
		});

		ipcMain.on('get-settings-request', (evt) => {
			evt.sender.send('get-settings-response', this.negativeSettings.settings);
		});
		
		ipcMain.on('set-undo-managers-request', (evt, undoManagers) => {
			const _window = electronWindow.windows[evt.sender.id];

			if (_window) {
				_window.undoManagers = undoManagers;
			}
		});
		
		ipcMain.on('set-zoom-level-request', (evt, zoomLevel) => {
			const _window = electronWindow.windows[evt.sender.id];

			if (_window) {
				_window.zoomLevel = zoomLevel;
			}
		});
		
		ipcMain.on('set-selected-tab-request', (evt, tabIndex) => {
			const _window = electronWindow.windows[evt.sender.id];

			if (_window) {
				_window.tabIndex = tabIndex;
			}
		});
		
		ipcMain.on('check-for-updates-request', () => {
			autoUpdater.checkForUpdates();
		});
		
		ipcMain.on('restart-and-install-request', () => {
			autoUpdater.quitAndInstall();
		});
	},
	
	initGlobalShortcuts() {
		globalShortcut.register('Command+Control+H', () => this.toggleHiding());
		globalShortcut.register('Command+Control+L', () => this.toggleLocking());
	},
	
	initAutoUpdater() {
		const appVersion       = require('../package.json').version;
		const shouldAutoUpdate = this.negativeSettings.get('shouldAutoUpdate');
		const nextAutoUpdate   = this.negativeSettings.get('nextAutoUpdate');
		
		autoUpdater.setFeedURL(`http://squirrel.negativeapp.com/update/darwin?zip=1&version=${appVersion}`);
		
		if (shouldAutoUpdate) {
			const now       = Date.now();
			const oneDay    = 86400000;
			const sevenDays = 604800000;
			
			if (typeof nextAutoUpdate === 'undefined') {
				// If we've never updated before, set nextAutoUpdate to tomorrow
				// This gives the user enough time to opt out if they just downloaded
				this.negativeSettings.set('nextAutoUpdate', now + oneDay);
			} else if (now >= nextAutoUpdate) {
				autoUpdater.checkForUpdates();
				// Check again in 7 days
				this.negativeSettings.set('nextAutoUpdate', now + sevenDays);
			}
		}
		
		autoUpdater.on('error', (err) => {
			this.executeJavaScriptInSettingsWindow(`
				if (window.settingsController) {
					window.settingsController.handleUpdateError('${err}');
				}
			`);
		});
		
		autoUpdater.on('checking-for-update', () => {
			settingsWindowOnOpenJs = `
				if (window.settingsController) {
					window.settingsController.handleCheckingForUpdate();
				}
			`;
			
			this.executeJavaScriptInSettingsWindow(settingsWindowOnOpenJs);
		});
		
		autoUpdater.on('update-available', () => {
			settingsWindowOnOpenJs = `
				if (window.settingsController) {
					window.settingsController.handleUpdateAvailable();
				}
			`;
			
			this.executeJavaScriptInSettingsWindow(settingsWindowOnOpenJs);
		});
		
		autoUpdater.on('update-not-available', () => {
			this.executeJavaScriptInSettingsWindow(`
				if (window.settingsController) {
					window.settingsController.handleUpdateNotAvailable();
				}
			`);
		});
		
		autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName, releaseDate, updateUrl) => {
			const version = updateUrl.match(/v\d+\.\d+\.\d+/)[0];
			const releaseNotesUrl = `https://github.com/atdrago/negative/releases/tag/${version}`;
			
			this.initSettingsWindow(() => {
				settingsWindowOnOpenJs = `
					if (window.settingsController) {
						window.settingsController.handleUpdateDownloaded('Negative ${version} is available.', '${releaseNotesUrl}');
					}
				`;
				
				this.executeJavaScriptInSettingsWindow(settingsWindowOnOpenJs);
			});
		});
	},
	
	getNewNegativeWindow(_window) {
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

	initNegativeWindow(_window) {
		const newWindow = this.getNewNegativeWindow(_window);
		const isFocused = _window && _window.isFocused !== false;
	
		newWindow.on('unresponsive', () => {
			// eslint-disable-next-line no-console
			console.log(`Window with id "${newWindow.id}" became unresponsive. It was ${window.id !== mainWindowId ? 'not ': ''}the active window.`);
		});
	
		newWindow.webContents.on('crashed', () => {
			// eslint-disable-next-line no-console
			console.log(`WebContents crashed in window with id "${newWindow.id}". It was ${window.id !== mainWindowId ? 'not ': ''}the active window.`);
		});
	
		newWindow.webContents.on('dom-ready', () => {
			const delayBeforeWindowFocus = 100;
			
			setTimeout(() => {
				if (_window) {
					if (isFocused) {
						this.setWindowFocused(newWindow);
						newWindow.focus();
					} else {
						this.setWindowBlurred(newWindow);
						newWindow.blur();
					}
				} else {
					this.changeFocusToWindow(newWindow);
				}
			}, delayBeforeWindowFocus);
			
			if (NODE_ENV !== 'development') {
				this.initAutoUpdater();
			}
		});
		
		newWindow.showUrl(path.resolve(__dirname, '../view/index.html'), { isDarkMode: isDarkMode }, () => {
			this.negativeMenu.refreshForNewWindow();
			
			newWindow.on('focus', (evt) => this.changeFocusToWindow(evt.sender));
			newWindow.on('blur', () => this.changeFocusToWindow(null));

			newWindow.on('closed', () => {
				if (Object.keys(electronWindow.windows).length === 0) {
					this.negativeMenu.refreshForNoWindow();
				}
			});
		});
		
		const {
			tabIndex,
			undoManagers,
			zoomLevel
		} = _window || {};
		
		let setupJs = '';
		
		if (!undoManagers) {
			// New empty window
			setupJs += 'negative.tabsController.addTab(true);';
		} else {
			undoManagers.forEach((undoManager) => {
				setupJs += `negative.addTabForUndoManager(${JSON.stringify(undoManager)});`;
			});
			
			setupJs += 'negative.tabsController.deselectTab();';
		}
		
		setupJs += `negative.tabsController.selectTabByIndex(${tabIndex || 0});`;
		
		if (typeof zoomLevel !== 'undefined') {
			setupJs += `negative.frameController.zoomTo(${zoomLevel});`;
		}
		
		newWindow.webContents.executeJavaScript(setupJs);
	},

	initSettingsWindow(callback) {
		if (!settingsWindowId) {
			const settingsWindow = electronWindow.createWindow({
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

			settingsWindow.showUrl(path.resolve(__dirname, '../view/settings.html'), this.negativeSettings.settings, () => {
				settingsWindowId = `${settingsWindow.id}`;

				settingsWindow.on('closed', () => {
					settingsWindowId = null;

					if (Object.keys(electronWindow.windows).length === 0) {
						this.negativeMenu.refreshForNoWindow();
					}
				});

				settingsWindow.on('focus', () => this.negativeMenu.refreshForSettingsWindow());

				this.negativeMenu.refreshForSettingsWindow();
				this.executeJavaScriptInSettingsWindow(settingsWindowOnOpenJs);
				
				if (typeof callback === 'function') {
					return callback();
				}
			});
		} else {
			electronWindow.windows[settingsWindowId].focus();
			
			if (typeof callback === 'function') {
				return callback();
			}
		}
	},

	changeFocusToWindow(newWindow) {
		const currentWindow = electronWindow.windows[mainWindowId];
		
		if (currentWindow) {
			let currentWindowScript = 'negative.frameController.unsetFocused();';
			
			if (newWindow) {
				currentWindowScript += 'negative.frameController.unsetPrimary();';
			}
			
			currentWindow.webContents.executeJavaScript(currentWindowScript);
		}

		if (newWindow) {
			newWindow.webContents.executeJavaScript(`
				negative.frameController.setFocused();
				negative.frameController.setPrimary();
				negative.refreshMenu();
			`);

			mainWindowId = `${newWindow.id}`;
		}
	},
	
	setWindowFocused(_window) {
		if (_window) {
			_window.webContents.executeJavaScript(`
				negative.frameController.setFocused();
				negative.frameController.setPrimary();
				negative.refreshMenu();
			`);

			mainWindowId = `${_window.id}`;
		}
	},

	setWindowBlurred(_window) {
		if (_window) {
			_window.webContents.executeJavaScript(`
				negative.frameController.unsetFocused();
				negative.frameController.unsetPrimary();
			`);
		}
	},

	captureRegionBehindWindow() {
		const focusedWindow = BrowserWindow.getFocusedWindow();

		if (focusedWindow) {
			const bounds         = focusedWindow.getBounds();
			const newImageX      = bounds.x + FRAME_WIDTH;
			const newImageY      = bounds.y + TAB_HEIGHT;
			const newImageWidth  = bounds.width - WIDTH_COMPENSATION;
			const newImageHeight = bounds.height - HEIGHT_COMPENSATION;

			/* eslint-disable new-cap */
			const pool     = objc.NSAutoreleasePool('alloc')('init');
			const rect     = objc.NSMakeRect(newImageX, newImageY, newImageWidth, newImageHeight);
			const windowId = objc.NSApplication('sharedApplication')('keyWindow')('windowNumber');
			const cgImage  = objc.CGWindowListCreateImage(rect, objc.kCGWindowListOptionOnScreenBelowWindow, windowId, objc.kCGWindowImageDefault);
			const newRep   = objc.NSBitmapImageRep('alloc')('initWithCGImage', cgImage);
			/* eslint-enable new-cap */

			newRep('setSize', rect.size);

			const pngData = newRep('representationUsingType', objc.NSPNGFileType, 'properties', null);
			const base64  = pngData('base64EncodedStringWithOptions', 0);
			const uri     = `data:image/png;base64,${base64}`;

			focusedWindow.webContents.executeJavaScript(`
				negative.frameController.setImageAndSize('${uri}', ${newImageWidth}, ${newImageHeight});
				negative.saveForUndo({
					imageDimensions: [${newImageWidth}, ${newImageHeight}],
					imageSrc: '${uri}'
				});
			`);

			pool('drain');
		}
	},

	move(direction, amount) {
		const focusedWindow = BrowserWindow.getFocusedWindow();

		if (focusedWindow) {
			const currentPosition = focusedWindow.getPosition();

			switch (direction) {
				case 'up':
					currentPosition[1] -= amount;
					break;
				case 'right':
					currentPosition[0] += amount;
					break;
				case 'down':
					currentPosition[1] += amount;
					break;
				case 'left':
					currentPosition[0] -= amount;
					break;
				default:
					return;
			}

			focusedWindow.setPosition(currentPosition[0], currentPosition[1]);
		}
	},
	
	executeJavaScriptInFocusedWindow(js) {
		const focusedWindow = BrowserWindow.getFocusedWindow();
		
		if (focusedWindow) {
			focusedWindow.webContents.executeJavaScript(js);
		}
	},
	
	executeJavaScriptInAllWindows(js) {
		const windows = electronWindow.windows;
		
		for (const key in windows) {
			if (windows.hasOwnProperty(key) && key !== settingsWindowId) {
				windows[key].webContents.executeJavaScript(js);
			}
		}
	},
	
	executeJavaScriptInSettingsWindow(js) {
		const settingsWindow = electronWindow.windows[settingsWindowId];
		
		if (settingsWindow) {
			settingsWindow.webContents.executeJavaScript(js);
		}
	},
	
	removeImage() {
		this.executeJavaScriptInFocusedWindow(`
			negative.frameController.removeImage();
			negative.saveForUndo({
				imageDimensions: null,
				imageSrc: null
			});
		`);
	},

	undo() {
		this.executeJavaScriptInFocusedWindow(`
			negative.undo();
		`);
	},

	redo() {
		this.executeJavaScriptInFocusedWindow(`
			negative.redo();
		`);
	},

	copy() {
		this.executeJavaScriptInFocusedWindow(`
			negative.tabsController.copy();
		`);
	},

	paste() {
		this.executeJavaScriptInFocusedWindow(`
			negative.tabsController.paste();
		`);
	},
	
	addTab() {
		this.executeJavaScriptInFocusedWindow(`
			negative.tabsController.addTab(true);
		`);
	},

	closeTab() {
		const focusedWindow = BrowserWindow.getFocusedWindow();
		
		if (focusedWindow) {
			focusedWindow.webContents.executeJavaScript(`
				negative.tabsController.closeTab(${focusedWindow.tabIndex});
			`);
		}
	},

	selectNextTab() {
		this.executeJavaScriptInFocusedWindow(`
			negative.tabsController.selectNextTab();
		`);
	},

	selectNextTabAndResizeWindowToFitImage() {
		this.executeJavaScriptInFocusedWindow(`
			negative.tabsController.selectNextTab();
			negative.tabsController.fitWindowToImage();
		`);
	},

	selectPreviousTab() {
		this.executeJavaScriptInFocusedWindow(`
			negative.tabsController.selectPreviousTab();
		`);
	},

	selectPreviousTabAndResizeWindowToFitImage() {
		this.executeJavaScriptInFocusedWindow(`
			negative.tabsController.selectPreviousTab();
			negative.tabsController.fitWindowToImage();
		`);
	},

	fitWindowToImage() {
		this.executeJavaScriptInFocusedWindow(`
			negative.tabsController.fitWindowToImage();
		`);
	},
	
	zoomIn() {
		this.executeJavaScriptInFocusedWindow(`
			negative.frameController.zoomIn();
		`);
	},
	
	zoomOut() {
		this.executeJavaScriptInFocusedWindow(`
			negative.frameController.zoomOut();
		`);
	},
	
	zoomTo(zoomLevel) {
		this.executeJavaScriptInFocusedWindow(`
			negative.frameController.zoomTo(${zoomLevel});
		`);
	},
	
	reset() {
		const _reset = function _reset() {
			const windows = electronWindow.windows;
			
			for (const key in windows) {
				if (windows.hasOwnProperty(key)) {
					windows[key].close();
				}
			}
			
			this.initNegativeWindow();
		}.bind(this);
		
		if (NEGATIVE_SKIP_RESET_DIALOG === 'true') {
			_reset();
		} else {
			ipcMain.once('confirm-reset-response', (event, shouldReset) => {
				if (shouldReset) {
					_reset();
				}
			});
			
			this.executeJavaScriptInFocusedWindow(`
				negative.confirmReset();
			`);
		}
		
	},

	toggleDarkMode() {
		isDarkMode = !isDarkMode;
		this.negativeSettings.set('isDarkMode', isDarkMode);
		this.negativeSettings.save();
		
		this.executeJavaScriptInAllWindows(`
			negative.toggleDarkMode();
		`);
	},
	
	toggleHiding() {
		const windows = electronWindow.windows;

		for (const key in windows) {
			if (windows.hasOwnProperty(key) && settingsWindowId !== key) {
				const _window = windows[key];
				
				if (isAppHidden) {
					_window.show();
				} else {
					_window.hide();
				}
			}
		}

		isAppHidden = !isAppHidden;
		
		this.negativeMenu.refreshForHiding();
	},
	
	toggleLocking() {
		const windows = electronWindow.windows;
	
		for (const key in windows) {
			if (windows.hasOwnProperty(key) && settingsWindowId !== key) {
				const _window = windows[key];
	
				_window.setIgnoreMouseEvents(!isAppLocked);
				_window.webContents.executeJavaScript(`negative.setLocked(${!isAppLocked})`);
			}
		}
	
		if (isAppLocked) {
			this.changeFocusToWindow(windows[mainWindowId]);
			windows[mainWindowId].focus();
		} else {
			this.changeFocusToWindow(null);
		}
	
		isAppLocked = !isAppLocked;
		
		this.negativeMenu.refreshForLocking();
	}
};
