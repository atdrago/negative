let SimpleUndo = require('simple-undo');

class UndoManager {
    constructor() {
        this.state = {
            imageDimensions: null,
            imageSrc: null
        };

        this.history = new SimpleUndo({
            maxLength: 10,
            provider: function(done) {
                return done(JSON.stringify(this.state));
            }.bind(this)
        });
        this.history.initialize(JSON.stringify(this.state));

        this.unserializer = function(serialized) {
            this.state = JSON.parse(serialized);

            let imageDimensions = this.state.imageDimensions,
                imageSrc = this.state.imageSrc;

            if (imageSrc != null) {
                window.negative.frameController.setImageAndSize(imageSrc, imageDimensions[0], imageDimensions[1]);
            } else {
                window.negative.frameController.removeImage();
            }
        }.bind(this);
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
