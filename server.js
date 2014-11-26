var express = require('express'),
	bodyParser = require('body-parser'),
	app = express(),
	request = require('request');

setupRoutesAndMiddleware();
listen();

function setupRoutesAndMiddleware() {
	app.get('/', redirectIfNeeded);
	app.use(express.static('public'));
	app.use(bodyParser.json());
	app.post('/search', search);
}

function listen() {
	var listenPort = process.env.PORT || 5000;
	app.listen(listenPort);
	console.log('Listening on port ' + listenPort);
}

function redirectIfNeeded(req, res, next) {
	if(req.header('host').indexOf('herokuapp.com') > -1) {
		res.redirect(301, 'http://www.destinyrep.com');
	} else {
		next();
	}
}

function search(req, res) {
	if(!req.body.username) {
		res.json({error:'missing username'});
		return;
	}
	if(!req.body.accountType) {
		res.json({error:'missing accountType'});
		return;
	}

	var searcher = new Searcher(req.body.username, req.body.accountType);
	searcher.search();
	searcher.finished(function(searchResult) {
		new Stasher(searchResult).stash();
		res.json(searchResult);
	});
}

function Searcher(username, accountType) {
	var self = this;
	self.username = username;
	self.accountType = accountType;
	self.result = {};

	self.search = function() {
		searchForMembership();
	};

	self.finished = function(callback) {
		self.finishedCallback = callback;
	};

	function searchForMembership() {
		var url = 'http://www.bungie.net/Platform/Destiny/SearchDestinyPlayer/' + self.accountType + '/' + self.username + '/';
		requestJson({url: url}, handleSearchResponse);
	}

	function handleSearchResponse(error, response, body) {
		if(body.Response.length < 1) {
			self.result.error = new Error('no matches found');
			finish();
		} else {
			self.response = response;
			mapMembershipToResult();
			getCharacterIds();
		}
	}

	function mapMembershipToResult() {
		var membership = {};
		membership.type = self.response.membershipType;
		membership.id = self.response.membershipId;
		membership.displayName = self.response.displayName;
		self.result.membership = membership;
	}

	function getCharacterIds() {
		var dfd = new $.Deferred(),
			accountType = 'TigerPSN';

		if(member.membershipType === 1) {
			accountType = 'TigerXbox';
		}

		jsonp('http://www.bungie.net/Platform/Destiny/' + accountType + '/Account/' + member.membershipId + '/',
			function(res) {
				handleCharacterIdsResponse(res, dfd);
			},
			function(err) {
				dfd.reject(err);
			}
		);
		return dfd;
	}

	function handleCharacterIdsResponse(res, dfd) {
		if(!res.data || !res.data.characters || res.data.characters.length < 1) {
			dfd.reject(errNoCharactersFound);
		} else {
			dfd.resolve(res);
		}
	}

	function getCurrency(characterBase) {
		var dfd = new $.Deferred(),
			accountType = 'TigerPSN';

		if(characterBase.membershipType === 1) {
			accountType = 'TigerXbox';
		}

		jsonp('http://www.bungie.net/Platform/Destiny/' + accountType + '/Account/' + characterBase.membershipId + '/Character/' + characterBase.characterId + '/Inventory/',
			function(res) {
				if(res.data && res.data.currencies && res.data.currencies.length) {
					dfd.resolve(res.data.currencies);
				} else {
					dfd.reject(errNoResponseFromBungie);
				}
			},
			function(err) {
				dfd.reject(err);
			}
		);
		return dfd;
	}

	function getActivities(characterBase) {
		var dfd = new $.Deferred(),
			accountType = 'TigerPSN';

		if(characterBase.membershipType === 1) {
			accountType = 'TigerXbox';
		}

		jsonp('http://www.bungie.net/Platform/Destiny/' + accountType + '/Account/' + characterBase.membershipId + '/Character/' + characterBase.characterId + '/Activities/',
			function(res) {
				if(res.data && res.data.available && res.data.available.length) {
					return dfd.resolve(res.data.available);
				} else {
					dfd.reject(errNoResponseFromBungie);
				}
			},
			function(err) {
				dfd.reject(err);
			}
		);
		return dfd;
	}

	function getProgress(characterBase) {
		var dfd = new $.Deferred(),
			accountType = 'TigerPSN';

		if(characterBase.membershipType === 1) {
			accountType = 'TigerXbox';
		}

		jsonp('http://www.bungie.net/Platform/Destiny/' + accountType + '/Account/' + characterBase.membershipId + '/Character/' + characterBase.characterId + '/Progression/',
			function(res) {
				if(res.data && res.data.progressions && res.data.progressions.length) {
					return dfd.resolve(res.data.progressions);
				} else {
					dfd.reject(errNoResponseFromBungie);
				}
			},
			function(err) {
				dfd.reject(err);
			}
		);
		return dfd;
	}

	function finish() {
		if(self.finishedCallback) {
			self.finishedCallback(self.result);
			self.finishedCallback = null;
		}
	}

}

function requestJson(options, callback) {
	options = options || {};
	options.json = true;
	return request(options, callback);
}

function Stasher(data) {
	var self = this;
	self.data = data;
	self.stash = function() {
		//TODO stash the data in a database
	};
}
