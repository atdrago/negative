class NegativeFrame {
    constructor() {
        this.imageContainer = document.getElementById('imageContainer');
        this.currentImage = document.getElementById('negativeImage');

        this.currentImage.addEventListener('load', function () {
			document.body.classList.add('negative-on');
		}, false);
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
        }
    }

    removeImage() {
        document.body.classList.remove('negative-on');
        this.currentImage.setAttribute('src', '');
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
