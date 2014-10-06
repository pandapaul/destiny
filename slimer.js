var page = require('webpage').create();
var system = require('system');

var url = system.args[1],
	filename = system.args[2];

page.viewportSize = { width: 980, height: 700 };
page.clipRect = { top: 125, left: 250, width: 545, height: 540 };
page.onLoadFinished = function (status) {
	if (status == 'success') {
		page.scrollPosition = {top:0, left:0};
		page.evaluate(function () {
			$('#sidebar').hide();
			$('.Sub_Nav').hide();
			$('.charactersList').offset({top:160, left:330});
		});
		slimer.wait(1000);
		page.render(filename);
		system.stdout.writeLine('rendered file ' + filename);
	} else {
		system.stderr.writeLine('page-load-failed');
	}
	slimer.exit();
};

page.open(url);
