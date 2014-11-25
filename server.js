var express = require('express'),
	bodyParser = require('body-parser'),
	app = express(),
	request = require('request');

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

	var searchResult = new Searcher(req.body.username, req.body.accountType).search();
	new Stasher(searchResult).stash();

	res.json(searchResult);
}

function Searcher(username, accountType) {
	this.username = username;
	this.accountType = accountType;

	var result = {};

	this.search = function() {
		searchForMembership();
		getCharacterIds();
		getCurrency();
		getActivities();
		getProgress();
		return result;
	};

	function searchForMembership() {

		request({
			url: 'http://www.bungie.net/Platform/Destiny/SearchDestinyPlayer/' + selectedAccountType + '/' + username + '/',
			json: true
		}, function (error, response, body) {
			if (error) {
				throw error;
			}
			if (response.statusCode === 200) {
					
			} else {
				throw new Error('No response from Bungie');
			}
		});
	}

	function handleSearchResponse(res, dfd) {
		if(res.length < 1) {
			dfd.reject(errNoMatchesFound);
		} else {
			dfd.resolve(res);
		}
	}

	function getCharacterIds(member) {
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

}

function Stasher(data) {
	this.data = data;
	this.stash = function() {
		//TODO stash the data in a database
	};
}

app.get('/', redirectIfNeeded);
app.use(express.static('public'));
app.use(bodyParser.json());
app.post('/search', search);

var listenPort = process.env.PORT || 5000;
app.listen(listenPort);
console.log('Listening on port ' + listenPort);
