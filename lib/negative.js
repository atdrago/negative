'use strict';

let app = require('app'),
    BrowserWindow = require('browser-window'),
    dataUri = require('datauri'),
    electronWindow = require('electron-window'),
    exec = require('child_process').exec,
    fs = require('fs'),
    globalShortcut = require('global-shortcut'),
    path = require('path'),
    negativeMenu = require('./negative-menu'),
    ipc = require('electron').ipcMain,

    isAppHidden = false,
    mainWindowId = null,
    settingsWindowId = null;

const FRAME_WIDTH = 10,
    TAB_HEIGHT = 37,
    WIDTH_COMPENSATION = FRAME_WIDTH * 2,
    HEIGHT_COMPENSATION = FRAME_WIDTH + TAB_HEIGHT;

function changeFocusToWindow(newWindow) {
    let currentWindow = electronWindow.windows[mainWindowId];

    if (currentWindow != null) {
        currentWindow.webContents.executeJavaScript('negative.frameController.unsetFocused();');
    }

    newWindow.webContents.executeJavaScript(
        'negative.frameController.setFocused();' +
        'negative.tabsController.refreshMenu();'
    );

    mainWindowId = newWindow.id;
}

module.exports = {
    init() {
        negativeMenu.init(this);

        this.initNegativeWindow();

        globalShortcut.register('Command+Control+H', function() {
            let windows = electronWindow.windows;

            for (let key in windows) {
                if (windows.hasOwnProperty(key) && settingsWindowId != key) {
                    let _window = windows[key];
                    isAppHidden ? _window.show() : _window.hide();
                }
            }

            isAppHidden = !isAppHidden;
        });

        ipc.on('close-window', function () {
            let focusedWindow = BrowserWindow.getFocusedWindow();

            if (focusedWindow) {
                focusedWindow.close();
            }
        });

        ipc.on('fit-window-to-image', function (evt, dimensions) {
            let focusedWindow = BrowserWindow.getFocusedWindow();

            if (focusedWindow && dimensions) {
                focusedWindow.setSize(dimensions[0] + WIDTH_COMPENSATION, dimensions[1] + HEIGHT_COMPENSATION);
            }
        });
    },

    initNegativeWindow() {
        let newWindow = electronWindow.createWindow({
            width: 800,
            height: 600,
            transparent: true,
            titleBarStyle: 'hidden',
            alwaysOnTop: true,
            show: true,
            enableLargerThanScreen: true,
            fullscreen: false,
            title: 'Negative',
            acceptFirstMouse: true,
            webPreferences: {
                java: false,
                webgl: false,
                webaudio: false,
                plugins: false,
                experimentalFeatures: false,
                experimentalCanvasFeatures: false
            }
        });

        newWindow.showUrl(path.resolve(__dirname, '../view/index.html'), function() {
            changeFocusToWindow(newWindow);

            newWindow.on('focus', function() {
                changeFocusToWindow(this);
            });
        });
    },

    initSettingsWindow() {
        if (!settingsWindowId) {
            let settingsWindow = electronWindow.createWindow({
                width: 400,
                height: 300,
                show: true,
                alwaysOnTop: true,
                fullscreen: false,
                title: 'Negative - Settings',
                acceptFirstMouse: true,
                webPreferences: {
                    java: false,
                    webgl: false,
                    webaudio: false,
                    plugins: false,
                    experimentalFeatures: false,
                    experimentalCanvasFeatures: false
                }
            });

            settingsWindow.showUrl(path.resolve(__dirname, '../view/settings.html'), function () {
                settingsWindowId = settingsWindow.id;

                settingsWindow.on('closed', function () {
                    settingsWindowId = null;
                });
            });
        } else {
            electronWindow.windows[settingsWindowId].focus();
        }
    },

    addTab() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript(
                `negative.tabsController.addTab(${focusedWindow.tabIndex});`
            );
        }
    },

    closeTab() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript(
                `negative.tabsController.closeTab(${focusedWindow.tabIndex});`
            );
        }
    },

    selectNextTab() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript('negative.tabsController.selectNextTab();');
        }
    },

    selectNextTabAndResizeWindowToFitImage() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript(
                'negative.tabsController.selectNextTab();' +
                'negative.tabsController.fitWindowToImage();'
            );
        }
    },

    selectPreviousTab() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript('negative.tabsController.selectPreviousTab();');
        }
    },

    selectPreviousTabAndResizeWindowToFitImage() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript(
                'negative.tabsController.selectPreviousTab();' +
                'negative.tabsController.fitWindowToImage();'
            );
        }
    },

    captureRegionBehindWindow() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            let bounds = focusedWindow.getBounds(),
                newImageX = bounds.x + FRAME_WIDTH,
                newImageY = bounds.y + TAB_HEIGHT,
                newImageWidth = bounds.width - WIDTH_COMPENSATION,
                newImageHeight = bounds.height - HEIGHT_COMPENSATION,
                screencapturePath = `${app.getPath('temp')}negative-sc.png`,
                command = `screencapture -R${newImageX},${newImageY},${newImageWidth},${newImageHeight} ${screencapturePath}`;

            focusedWindow.hide();

            exec(command, function(err, stdout, stderr) {
                focusedWindow.show();

                let newDataUri = dataUri(screencapturePath);

                focusedWindow.webContents.executeJavaScript(`
                    negative.frameController.setImageAndSize('${newDataUri}', ${newImageWidth}, ${newImageHeight});
                    negative.tabsController.saveForUndo({
                        imageDimensions: [${newImageWidth}, ${newImageHeight}],
                        imageSrc: '${newDataUri}'
                    });
                `);

                fs.unlink(screencapturePath);
            });
        }
    },

    removeImage() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript(`
                negative.frameController.removeImage();
                negative.tabsController.saveForUndo({
                    imageDimensions: null,
                    imageSrc: null
                });
            `);
        }
    },

    undo() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript('negative.tabsController.undo();');
        }
    },

    redo() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript('negative.tabsController.redo();');
        }
    },

    copy() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript('negative.tabsController.copy();');
        }
    },

    paste() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript('negative.tabsController.paste();');
        }
    },

    move(direction, amount) {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            let currentPosition = focusedWindow.getPosition();

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
            }

            focusedWindow.setPosition(currentPosition[0], currentPosition[1]);
        }
    },

    fitWindowToImage() {
        let focusedWindow = BrowserWindow.getFocusedWindow();

        if (focusedWindow) {
            focusedWindow.webContents.executeJavaScript('negative.tabsController.fitWindowToImage();');
        }
    }
};
