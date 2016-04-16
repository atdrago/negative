const { ipcRenderer } = require('electron');

class NegativeFrame {
	constructor() {
		this.currentImage   = document.getElementById('negativeImage');
		this.imageContainer = document.getElementById('imageContainer');

		this.currentImage.addEventListener('load', function () {
			document.body.classList.add('negative-on');
		}, false);

		ipcRenderer.send('get-settings-request');
		ipcRenderer.on('get-settings-response', function (evt, settings) {
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

			let newHeight = `${height}px`;
			let newWidth  = `${width}px`;

			this.currentImage.style.width = newWidth;
			this.currentImage.style.height = newHeight;
			this.imageContainer.style.width = newWidth;
			this.imageContainer.style.height = newHeight;

			window.negative.tabsController.setTabHasContent();
			window.negative.tabsController.setTabLabel(`${width}x${height}`);
		}
	}

	removeImage() {
		document.body.classList.remove('negative-on');
		this.currentImage.setAttribute('src', '');

		window.negative.tabsController.unsetTabHasContent();
		window.negative.tabsController.setTabLabel('');
	}

	setFocused() {
		document.body.classList.remove('blur');
		document.body.classList.add('focus');
	}

	unsetFocused() {
		document.body.classList.remove('focus');
		document.body.classList.add('blur');
	}

	setPrimary() {
		document.body.classList.add('primary');
	}

	unsetPrimary() {
		document.body.classList.remove('primary');
	}
}
