document.addEventListener('DOMContentLoaded', function () {

	window.negative = {
		frameController: new NegativeFrame(),
		tabsController: new NegativeTabs()
	};

	// let noop = function (evt) { evt.preventDefault(); return false; };

	// document.body.addEventListener('dragend', 	noop, false);
	// document.body.addEventListener('dragleave', noop, false);
	// document.body.addEventListener('dragover', 	noop, false);
	// document.body.addEventListener('dragstart', noop, false);
	// document.body.addEventListener('drop', 		noop, false);

});
