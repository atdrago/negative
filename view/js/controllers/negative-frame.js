let ipc = require('electron').ipcRenderer

class NegativeFrame {
    constructor() {
        this.imageContainer = document.getElementById('imageContainer');
        this.currentImage = document.getElementById('negativeImage');

        this.currentImage.addEventListener('load', function () {
			document.body.classList.add('negative-on');
		}, false);

        ipc.send('get-settings-request');
        ipc.on('get-settings-response', function (evt, settings) {
            if (settings['shouldShowTips'] === false) {
                document.body.classList.add('no-tips');
            }
        }.bind(this));
    }

    setShouldShowTips(shouldShowTips) {
        if (shouldShowTips) {
            document.body.classList.remove('no-tips');
        } else {
            document.body.classList.add('no-tips');
        }
    }

    setImageAndSize(src, width, height) {
        if (src) {
            document.body.classList.add('negative-on');
            this.currentImage.setAttribute('src', src);

            let newWidth = width + 'px',
                newHeight = height + 'px';

            this.currentImage.style.width = newWidth;
            this.currentImage.style.height = newHeight;
            this.imageContainer.style.width = newWidth;
            this.imageContainer.style.height = newHeight;

            window.negative.tabsController.setTabHasContent();
        }
    }

    removeImage() {
        document.body.classList.remove('negative-on');
        this.currentImage.setAttribute('src', '');

        window.negative.tabsController.unsetTabHasContent();
    }

    unsetFocused() {
        document.body.classList.remove('focus');
        document.body.classList.add('blur');
    }

    setFocused() {
        document.body.classList.remove('blur');
        document.body.classList.add('focus');
    }
}
