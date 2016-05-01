window.UndoManager = (function () {
	'use strict';
	
	const SimpleUndo = require('simple-undo');

	class UndoManager {
		get canUndo() { 
			return this.history.canUndo(); 
		}
		
		get canRedo() { 
			return this.history.canRedo(); 
		}
		
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
				
				const { 
					imageDimensions, 
					imageSrc 
				} = this.state;

				if (imageSrc) {
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

		undo() { 
			this.history.undo(this.unserializer); 
		}
		
		redo() { 
			this.history.redo(this.unserializer); 
		}

		serialize() {
			return {
				canUndo: this.canUndo,
				canRedo: this.canRedo
			};
		}
	}
	
	return UndoManager;
})();
