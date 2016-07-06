window.NegativeFrame = (function () {
	'use strict';
	
	const { ipcRenderer } = require('electron');
	
	const ZOOM_DELTA = 0.25;
	const ZOOM_MAX = 2;
	const ZOOM_MIN = 0.5;

	class NegativeFrame {
		get canZoomIn() {
			return this.zoomLevel < ZOOM_MAX;
		}
		
		get canZoomOut() {
			return this.zoomLevel > ZOOM_MIN;
		}
		
		set zoomLevel(value) {
			this._zoomLevel = value;
			ipcRenderer.send('set-zoom-level-request', value);
		}

		get zoomLevel() {
			return this._zoomLevel;
		}

		set isInverted(value) {
			this._isInverted = value;
			ipcRenderer.send('set-inverted-request', value);
		}

		get isInverted() {
			return this._isInverted;
		}

		set isTranslucent(value) {
			this._isTranslucent = value;
			ipcRenderer.send('set-translucent-request', value);
		}

		get isTranslucent() {
			return this._isTranslucent;
		}

		constructor() {
			this.zoomLevel = 1;
			this.isInverted = __args__.isInverted;
			this.isTranslucent = __args__.isTranslucent;

			this.currentImage   = document.getElementById('negativeImage');
			this.imageContainer = document.getElementById('imageContainer');

			this.currentImage.addEventListener('load', function () {
				document.body.classList.add('negative-on');
			}, false);
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
				this.imageWidth = width;
				this.imageHeight = height;
				
				document.body.classList.add('negative-on');
				this.currentImage.setAttribute('src', src);
				
				this.setElementSize(width, height);

				window.negative.tabsController.setTabHasContent();
				window.negative.tabsController.setTabLabel(`${width}x${height}`);
			}
		}
		
		setElementSize(width, height) {
			const newHeight = `${height}px`;
			const newWidth  = `${width}px`;
			
			this.currentImage.style.width = newWidth;
			this.currentImage.style.height = newHeight;
			this.imageContainer.style.width = newWidth;
			this.imageContainer.style.height = newHeight;
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

		toggleInversion() {
			const wasInverted = !document.body.classList.contains('inversion-off');

			if (wasInverted) {
				document.body.classList.add('inversion-off');
			} else {
				document.body.classList.remove('inversion-off');
			}

			this.isInverted = !wasInverted;
		}

		toggleTranslucence() {
			const wasTranslucent = !document.body.classList.contains('translucence-off');

			if (wasTranslucent) {
				document.body.classList.add('translucence-off');
			} else {
				document.body.classList.remove('translucence-off');
			}

			this.isTranslucent = !wasTranslucent;
		}

		zoomIn() {
			this.zoomTo(this.zoomLevel + ZOOM_DELTA);
		}
		
		zoomOut() {
			this.zoomTo(this.zoomLevel - ZOOM_DELTA);
		}
		
		zoomTo(zoomLevel) {
			zoomLevel = Math.max(zoomLevel, ZOOM_MIN);
			zoomLevel = Math.min(zoomLevel, ZOOM_MAX);
			
			if (zoomLevel !== this.zoomLevel) {
				this.setElementSize(this.imageWidth * zoomLevel, this.imageHeight * zoomLevel);
				this.currentImage.setAttribute('data-zoom-level', zoomLevel);
				
				this.zoomLevel = zoomLevel;
				window.negative.refreshMenu();
			}
		}
	}
	
	return NegativeFrame;
}());

