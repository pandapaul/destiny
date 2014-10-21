var path = require('path'),
	childProcess = require('child_process'),
	slimerjs = require('slimerjs'),
	express = require('express'),
	bodyParser = require('body-parser'),
	app = express(),
	binPath = slimerjs.path,
	slimerPath  = path.join(__dirname, 'slimer.js'),
	http = require('http');

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

function incrementViewCount(req, res, next) {
	fs.readFile('viewCount', function(err, data) {
		var viewCount = parseInt(data);
		if(!viewCount) {
			viewCount = 0;
		}
		viewCount++;
		fs.writeFile('viewCount', viewCount, function(err) {
			fs.readFile('viewCountTimestamp', function(err, data) {
				if(!data || viewCount === 1) {
					fs.writeFile('viewCountTimestamp', new Date(), function(err) {
						next();
					});
				} else {
					next();
				}
			});
		});
	});
}

function getViewCount(req, res) {
	fs.readFile('viewCount', function(err, count) {
		fs.readFile('viewCountTimestamp', function(err, timestamp) {
			res.write(count + ' views since ' + timestamp);
			res.end();
		});
	});
}

function proxyJSON(req, res) {

	if(!req.body.targetUrl) {
		res.end();
		return;
	}

	var http = require('http');

	http.get(req.body.targetUrl, function(bungieRes) {
	    var body = '';

	    bungieRes.on('data', function(chunk) {
	        body += chunk;
	    });

	    bungieRes.on('end', function() {
	        var bungieJSON = JSON.parse(body);
	        res.json(bungieJSON);
	        res.end();
	    });
	}).on('error', function(e) {
	      console.log("Got error from bungie: ", e);
	      res.json({bungieProxyError: e});
	      res.end();
	});

}

app.get('/', incrementViewCount);
app.use(express.static('public'));
app.use(bodyParser.json());
app.get('/viewcount', getViewCount);
app.post('/proxyJSON', proxyJSON);

var listenPort = process.env.PORT || 5000;
app.listen(listenPort);
console.log('Listening on port ' + listenPort);
