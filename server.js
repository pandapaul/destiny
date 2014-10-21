var path = require('path'),
	express = require('express'),
	bodyParser = require('body-parser'),
	app = express(),
	request = require('request');

var fs = require('fs');

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
		res.json({proxyError:'missing targetUrl'});
		res.end();
		return;
	}

	request({
		url: req.body.targetUrl,
		json: true
	}, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			res.json(body);
		} else {
			res.json({proxyError:error});
		}
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
