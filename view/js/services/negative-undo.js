const SimpleUndo = require('simple-undo');

class UndoManager {
	constructor() {
		this.state = {
			imageDimensions: null,
			imageSrc: null
		};

		this.history = new SimpleUndo({
			maxLength: 10,
			provider: (done) => done(JSON.stringify(this.state))
		});
		this.history.initialize(JSON.stringify(this.state));

		this.unserializer = (serialized) => {
			this.state = JSON.parse(serialized);
			
			const { imageDimensions, imageSrc } = this.state;

			if (imageSrc != null) {
				window.negative.frameController.setImageAndSize(imageSrc, imageDimensions[0], imageDimensions[1]);
			} else {
				window.negative.frameController.removeImage();
			}
		};
	}

	save(state) {
		this.state = state;
		this.history.save();
	}

	undo() { this.history.undo(this.unserializer); }
	redo() { this.history.redo(this.unserializer); }
	canUndo() { return this.history.canUndo(); }
	canRedo() { return this.history.canRedo(); }

	serialize() {
		return {
			canUndo: this.canUndo(),
			canRedo: this.canRedo()
		};
	}
}
