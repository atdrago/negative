(function () {
	'use strict';
	
	document.addEventListener('DOMContentLoaded', () => {
		const settingsForm = new SettingsForm();
		const cancelEvent  = (evt) => { 
			evt.preventDefault(); 
			return false; 
		};

		document.body.addEventListener('dragend', 	cancelEvent, false);
		document.body.addEventListener('dragleave', cancelEvent, false);
		document.body.addEventListener('dragover', 	cancelEvent, false);
		document.body.addEventListener('dragstart', cancelEvent, false);
		document.body.addEventListener('drop', 		cancelEvent, false);
	});
})();

