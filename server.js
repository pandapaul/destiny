var path = require('path'),
	childProcess = require('child_process'),
	slimerjs = require('slimerjs'),
	express = require('express'),
	bodyParser = require('body-parser'),
	app = express(),
	binPath = slimerjs.path,
	slimerPath  = path.join(__dirname, 'slimer.js');

var fs = require('fs');


function execSlimer(url, callback) {
	var filename = 'pics/' + new Date().getTime() + Math.round(Math.random()*10000) + '.png';
	var childArgs = [
		path.join(__dirname, 'slimer.js'),
		url,
		path.join(__dirname, 'public/' + filename)
	];

	childProcess.execFile(binPath, childArgs, function(err, stdout, stderr) {
		console.log(stdout);
		callback(filename);
	});
}

function getPic(req, res) {

	console.log(req.body);
	if(!req.body.url) {
		res.end();
	}
	execSlimer(req.body.url, function(filename) {
		var resBody = {'filename':filename};
		res.json(resBody);
	});
}

app.use(express.static('public'));
app.use(bodyParser.json());
app.post('/getPic', getPic);

var listenPort = process.env.PORT || 5000;
app.listen(listenPort);
console.log('Listening on port ' + listenPort);
