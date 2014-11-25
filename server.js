var express = require('express'),
	bodyParser = require('body-parser'),
	app = express(),
	request = require('request');

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

function redirectIfNeeded(req, res, next) {
	if(req.header('host').indexOf('herokuapp.com') > -1) {
		res.redirect(301, 'http://www.destinyrep.com');
	} else {
		next();
	}
}

app.get('/', redirectIfNeeded);
app.use(express.static('public'));
app.use(bodyParser.json());
app.post('/proxyJSON', proxyJSON);

var listenPort = process.env.PORT || 5000;
app.listen(listenPort);
console.log('Listening on port ' + listenPort);
