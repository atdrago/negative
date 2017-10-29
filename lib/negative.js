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
const windowFactory  = require('./factories/window-factory');
const negativeScreenshot = require('negative-screenshot');

const {
	NEGATIVE_IGNORE_SETTINGS,
	NEGATIVE_SKIP_RESET_DIALOG,
	NODE_ENV
} = process.env;

const {
	FRAME_WIDTH,
	TAB_HEIGHT,
	HEIGHT_COMPENSATION,
	WIDTH_COMPENSATION
} = require('../config/constants');

let isAppHidden            = false;
let isDarkMode             = true;
let isAppLocked            = false;
let mainWindowId           = null;
let settingsWindowId       = null;
let settingsWindowOnOpenJs = '';
let shouldAutoUpdate       = true;
let shouldShowTips         = true;

module.exports = {
	get isAppHidden() {
		return isAppHidden;
	},

	get isAppLocked() {
		return isAppLocked;
	},

	get isDarkMode() {
		return isDarkMode;
	},

	init() {
		this.negativeMenu = require('./negative-menu');
		this.negativeSettings = require('./negative-settings');

		this.negativeMenu.init(this);
		this.negativeSettings.init(() => {
			const negativeWindows = this.negativeSettings.get('windowSettings');

			if (NEGATIVE_IGNORE_SETTINGS === 'true') {
				isDarkMode = true;
				shouldAutoUpdate = true;
				shouldShowTips = true;
			} else {
				isDarkMode = this.negativeSettings.get('isDarkMode') !== false;
				shouldAutoUpdate = this.negativeSettings.get('shouldAutoUpdate') !== false;
				shouldShowTips = this.negativeSettings.get('shouldShowTips') !== false;
			}

			this.initGlobalShortcuts();
			this.initIpcListeners();
			this.initAppListeners();
			this.initProcessListeners();

			if (!negativeWindows || negativeWindows.length === 0 || NEGATIVE_IGNORE_SETTINGS === 'true') {
				this.initNegativeWindow();
			} else {
				negativeWindows.forEach((_window) => this.initNegativeWindow(_window));
			}
		});

		if (NODE_ENV === 'development') {
			require('./negative-test').init();
		}
	},

	initAppListeners() {
		app.on('before-quit', () => {
			// Save settings before quitting.
			const windowKeys = Object.keys(electronWindow.windows).filter((key) => key !== settingsWindowId);

			const negativeWindows = windowKeys.map((key) => {
				const _window = electronWindow.windows[key];

				return {
					bounds: _window.getBounds(),
					// Always set the last focused window as the window to be focused
					// on next launch. All others should not be focused.
					isFocused: (key === mainWindowId),
					isInverted: _window.isInverted,
					isTranslucent: _window.isTranslucent,
					tabIndex: _window.tabIndex,
					undoManagers: _window.undoManagers,
					zoomLevel: _window.zoomLevel
				};
			});

			this.negativeSettings.set('windowSettings', negativeWindows);
			this.negativeSettings.save();
		});
	},

	initAutoUpdater() {
		const appVersion     = require('../package.json').version;
		const nextAutoUpdate = this.negativeSettings.get('nextAutoUpdate');

		autoUpdater.setFeedURL(`https://hazel-pguxkhdcxq.now.sh/update/darwin?version=${appVersion}`);

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

	initGlobalShortcuts() {
		globalShortcut.register('Command+Control+H', () => this.toggleHiding());
		globalShortcut.register('Command+Control+L', () => this.toggleLocking());
	},

	initIpcListeners() {
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
					const _window = windows[key];

					shouldAutoUpdate = this.negativeSettings.get('shouldAutoUpdate') !== false;
					shouldShowTips = this.negativeSettings.get('shouldShowTips') !== false;

					_window.webContents.executeJavaScript(`negative.frameController.setShouldShowTips(${shouldShowTips})`);
				}
			}
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

		ipcMain.on('set-inverted-request', (evt, isInverted) => {
			const _window = electronWindow.windows[evt.sender.id];

			if (_window) {
				_window.isInverted = isInverted;
			}
		});

		ipcMain.on('set-translucent-request', (evt, isTranslucent) => {
			const _window = electronWindow.windows[evt.sender.id];

			if (_window) {
				_window.isTranslucent = isTranslucent;
			}
		});

		ipcMain.on('check-for-updates-request', () => {
			autoUpdater.checkForUpdates();
		});

		ipcMain.on('restart-and-install-request', () => {
			autoUpdater.quitAndInstall();
		});
	},

	initProcessListeners() {
		process.on('uncaughtException', (err) => {
			/* eslint-disable no-console */
			console.log(`Caught exception: ${err}`);
			console.error(err);
			/* eslint-enable no-console */
		});
	},

	initNegativeWindow(_window) {
		const newWindow = windowFactory.negativeWindow(_window);
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

		const {
			tabIndex,
			undoManagers,
			zoomLevel,
			isInverted,
			isTranslucent
		} = _window || {};

		const args = {
			isDarkMode: isDarkMode,
			isInverted: isInverted !== false,
			isTranslucent: isTranslucent !== false,
			shouldShowTips: shouldShowTips
		};

		newWindow.showUrl(path.resolve(__dirname, '../view/index.html'), args, () => {
			this.negativeMenu.refreshForNewWindow();

			newWindow.on('focus', (evt) => this.changeFocusToWindow(evt.sender));
			newWindow.on('blur', () => this.changeFocusToWindow(null));

			newWindow.on('closed', () => {
				if (Object.keys(electronWindow.windows).length === 0) {
					this.negativeMenu.refreshForNoWindow();
				}
			});
		});

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
			const settingsWindow = windowFactory.settingsWindow();

			const args = {
				shouldAutoUpdate: shouldAutoUpdate,
				shouldShowTips: shouldShowTips
			};

			settingsWindow.showUrl(path.resolve(__dirname, '../view/settings.html'), args, () => {
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
			const windowBounds = focusedWindow.getBounds();
			const cropBounds = {
				x: windowBounds.x + FRAME_WIDTH,
				y: windowBounds.y + TAB_HEIGHT,
				width: windowBounds.width - WIDTH_COMPENSATION,
				height: windowBounds.height - HEIGHT_COMPENSATION
			};

			negativeScreenshot({
				bounds: cropBounds,
				belowWindow: focusedWindow
			}).then(function (base64Uri) {
				focusedWindow.webContents.executeJavaScript(`
					negative.frameController.setImageAndSize('${base64Uri}', ${cropBounds.width}, ${cropBounds.height});
					negative.saveForUndo({
						imageDimensions: [${cropBounds.width}, ${cropBounds.height}],
						imageSrc: '${base64Uri}'
					});
				`);
			}).catch(function (err) {
				console.log(err);
			});
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
	},

	toggleInversion() {
		this.executeJavaScriptInFocusedWindow(`
			negative.frameController.toggleInversion();
		`);
	},

	toggleTranslucence() {
		this.executeJavaScriptInFocusedWindow(`
			negative.frameController.toggleTranslucence();
		`);
	}
};
