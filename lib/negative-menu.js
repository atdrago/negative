'use strict';

let BrowserWindow = require('browser-window'),
    clipboard = require('clipboard'),
    Menu = require('menu'),
    template = null,
    ipc = require('electron').ipcMain;

module.exports = {
    init(negative) {
        ipc.on('refresh-menu', (function (evt, menuStates) {
            this.refresh(menuStates);
        }).bind(this))

        template = [
            {
                label: 'Negative',
                submenu: [
                    { label: 'About Negative', selector: 'orderFrontStandardAboutPanel:' },
                    { type: 'separator' },
                    { label: 'Preferences...', accelerator: 'Command+,', click: function () { negative.initSettingsWindow(); } },
                    { type: 'separator' },
                    { label: 'Quit Negative', accelerator: 'Command+Q', selector: 'terminate:' }
                ]
            },
            {
                label: 'File',
                submenu: [
                    { label: 'New Tab',         accelerator: 'Command+T', click: function() { negative.addTab(); } },
                    { label: 'New Window',      accelerator: 'Command+N', click: function() { negative.initNegativeWindow(); } },
                    { type: 'separator' },
                    { label: 'Close Tab',       accelerator: 'Command+W', click: function() { negative.closeTab(); } },
                    { label: 'Close Window',    accelerator: 'Shift+Command+W', selector: 'performClose:' },
                    { label: 'Close',           accelerator: 'Command+W', selector: 'performClose:', visible: false }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { label: 'Undo',    accelerator: 'Command+Z',           enabled: false, click: function() { negative.undo(); } },
                    { label: 'Redo',    accelerator: 'Shift+Command+Z',     enabled: false, click: function() { negative.redo(); } },
                    { type: 'separator' },
                    { label: 'Copy',    accelerator: 'Command+C',           enabled: false, click: function() { negative.copy(); } },
                    { label: 'Paste',   accelerator: 'Command+V',           enabled: false, click: function() { negative.paste(); } },
                    { label: 'Capture', accelerator: 'Command+G',           enabled: true,  click: function() { negative.captureRegionBehindWindow(); } },
                    { label: 'Delete',  accelerator: 'Command+Backspace',   enabled: false, click: function() { negative.removeImage(); } }
                ]
            },
            {
                label: 'View',
                submenu: [
                    { label: 'Reload',          accelerator: 'Command+R',       click: function() { BrowserWindow.getFocusedWindow().reload(); } },
                    { label: 'Toggle DevTools', accelerator: 'Alt+Command+I',   click: function() { BrowserWindow.getFocusedWindow().toggleDevTools(); } }
                ]
            },
            {
                label: 'Window',
                submenu: [
                    { label: 'Minimize',            accelerator: 'Command+M',       selector: 'performMiniaturize:' },
                    { label: 'Fit Window to Image', accelerator: 'Command+F',       enabled: false, click: function () { negative.fitWindowToImage(); } },
                    { label: 'Next Tab',            accelerator: 'Command+Right',   enabled: false, click: function () { negative.selectNextTab(); } },
                    { label: 'Previous Tab',        accelerator: 'Command+Left',    enabled: false, click: function () { negative.selectPreviousTab(); } },
                    { label: 'Next Tab and Resize',            accelerator: 'Shift+Command+Right',   enabled: false, click: function () { negative.selectNextTabAndResizeWindowToFitImage(); } },
                    { label: 'Previous Tab and Resize',        accelerator: 'Shift+Command+Left',    enabled: false, click: function () { negative.selectPreviousTabAndResizeWindowToFitImage(); } },
                    {
                        label: 'Move',
                        submenu: [
                            { label: 'Right by 1px',    accelerator: 'Right',       click: function() { negative.move('right', 1); } },
                            { label: 'Left by 1px',     accelerator: 'Left',        click: function() { negative.move('left', 1); } },
                            { label: 'Up by 1px',       accelerator: 'Up',          click: function() { negative.move('up', 1); } },
                            { label: 'Down by 1px',     accelerator: 'Down',        click: function() { negative.move('down', 1); } },
                            { type: 'separator' },
                            { label: 'Right by 10px',   accelerator: 'Shift+Right', click: function() { negative.move('right', 10); } },
                            { label: 'Left by 10px',    accelerator: 'Shift+Left',  click: function() { negative.move('left', 10); } },
                            { label: 'Up by 10px',      accelerator: 'Shift+Up',    click: function() { negative.move('up', 10); } },
                            { label: 'Down by 10px',    accelerator: 'Shift+Down',  click: function() { negative.move('down', 10); } }
                        ]
                    },
                    { type: 'separator' },
                    { label: 'Bring All to Front', selector: 'arrangeInFront:' }
                ]
            }
        ];
        return Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    },

    refresh(menuStates, isSettingsWindow) {

        if (menuStates) {
            for (let i = 0, menuLength = template.length; i < menuLength; i++) {
                let item = template[i];

                switch (item.label) {
                    case 'File':
                        let fileSubmenuItems = item.submenu.items;

                        for (let j = 0, fileSubmenuLength = fileSubmenuItems.length; j < fileSubmenuLength; j++) {
                            let fileItem = fileSubmenuItems[j];

                            switch (fileItem.label) {
                                case 'New Tab': fileItem.enabled = menuStates.canAddTab; break;
                                case 'Close Tab':
                                    fileItem.enabled = menuStates.canCloseTab;
                                    fileItem.visible = !isSettingsWindow;
                                    break;
                                case 'Close Window':
                                    fileItem.enabled = menuStates.canCloseWindow;
                                    fileItem.visible = !isSettingsWindow;
                                    break;
                                case 'Close':
                                    fileItem.visible = isSettingsWindow;
                                    break;
                            }
                        }
                        break;

                    case 'Edit':
                        let editSubmenuItems = item.submenu.items;

                        for (let j = 0, editSubmenuLength = editSubmenuItems.length; j < editSubmenuLength; j++) {
                            let editItem = editSubmenuItems[j];

                            switch (editItem.label) {
                                case 'Undo': editItem.enabled = menuStates.canUndo; break;
                                case 'Redo': editItem.enabled = menuStates.canRedo; break;
                                case 'Capture': editItem.enabled = menuStates.canCapture; break;
                                case 'Copy': editItem.enabled = !menuStates.isImageEmpty; break;
                                case 'Paste': editItem.enabled = !clipboard.readImage().isEmpty(); break;
                                case 'Delete': editItem.enabled = !menuStates.isImageEmpty; break;
                            }
                        }
                        break;

                    case 'View':
                        let viewSubmenuItems = item.submenu.items;

                        for (let j = 0, viewSubmenuLength = viewSubmenuItems.length; j < viewSubmenuLength; j++) {
                            let viewItem = viewSubmenuItems[j];

                            switch (viewItem.label) {
                                case 'Reload': viewItem.enabled = menuStates.canReload; break;
                                case 'Toggle DevTools': viewItem.enabled = menuStates.canToggleDevTools; break;
                            }
                        }
                        break;

                    case 'Window':
                        let windowSubmenuItems = item.submenu.items;

                        for (let j = 0, windowSubmenuLength = windowSubmenuItems.length; j < windowSubmenuLength; j++) {
                            let windowItem = windowSubmenuItems[j];

                            switch (windowItem.label) {
                                case 'Minimize': windowItem.enabled = menuStates.canMinimize; break;
                                case 'Fit Window to Image': windowItem.enabled = !menuStates.isImageEmpty; break;
                                case 'Next Tab': windowItem.enabled = menuStates.canSelectNextTab; break;
                                case 'Previous Tab': windowItem.enabled = menuStates.canSelectPreviousTab; break;
                                case 'Next Tab and Resize': windowItem.enabled = menuStates.canSelectNextTab; break;
                                case 'Previous Tab and Resize': windowItem.enabled = menuStates.canSelectPreviousTab; break;
                                case 'Move':
                                    let moveSubmenuItems = windowItem.submenu.items;

                                    for (let k = 0, moveSubmenuLength = moveSubmenuItems.length; k < moveSubmenuLength; k++) {
                                        moveSubmenuItems[k].enabled = menuStates.canMove;
                                    }
                                    break;
                            }
                        }
                        break;
                }
            }
        }
    },

    refreshForSettingsWindow() {
        this.refresh({
            canAddTab: false,
            canCloseTab: false,
            canCloseWindow: false,
            canUndo: false,
            canRedo: false,
            canCapture: false,
            isImageEmpty: true,
            canSelectPreviousTab: false,
            canSelectNextTab: false,
            canReload: true,
			canToggleDevTools: true,
            canMinimize: true,
            canMove: false
        }, true);
    },

    refreshForNoWindow() {
        this.refresh({
            canAddTab: false,
            canCloseTab: false,
            canCloseWindow: false,
            canUndo: false,
            canRedo: false,
            canCapture: false,
            isImageEmpty: true,
            canSelectPreviousTab: false,
            canSelectNextTab: false,
            canReload: false,
			canToggleDevTools: false,
            canMinimize: false,
            canMove: false
        }, false);
    }
};
