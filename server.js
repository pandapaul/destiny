var express = require('express'),
	bodyParser = require('body-parser'),
	request = require('request'),
	mongo = require('mongodb'),
	app = express(),
	bungieStuff = {};

initializeBungieStuff();
setupRoutesAndMiddleware();
listen();

function initializeBungieStuff() {
	bungieStuff.membershipPlatforms = {
		1: 'TigerXbox',
		2: 'TigerPSN'
	};
	bungieStuff.url = 'http://www.bungie.net/Platform/Destiny/';
}

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
	if(!req.body.membershipType) {
		res.json({error:'missing membershipType'});
		return;
	}

	var searcher = new Searcher(req.body.username, req.body.membershipType);
	searcher.search();
	searcher.finished(function(searchResult) {
		new Stasher(searchResult).stash();
		res.json(searchResult);
	});
}

function Searcher(username, membershipType) {
	var self = this;
	self.username = username;
	self.membershipType = membershipType;
	self.result = {};
	self.response = {};

	self.search = function() {
		searchForMembership();
	};

	self.finished = function(callback) {
		self.finishedCallback = callback;
	};

	function searchForMembership() {
		var url = bungieStuff.url + 'SearchDestinyPlayer/' + self.membershipType + '/' + self.username + '/';
		requestJson({url: url}, handleSearchResponse);
	}

	function handleSearchResponse(error, response, body) {
		if(bungieResponded(error, body)) {
			if(body.Response.length < 1) {
				self.result.error = 'no matches found';
				finish();
			} else {
				self.response = body.Response[0];
				mapResponseToResultMembership();
				getCharacters();
			}
		}
	}

	function bungieResponded(error, body) {
		var valid = bungieResponseIsValid(error, body);
		if(!valid) {
			self.result.error = 'no response from Bungie';
			finish();
		}
		return valid;
	}

	function mapResponseToResultMembership() {
		var membership = {};
		membership.type = self.response.membershipType;
		membership.id = self.response.membershipId;
		membership.displayName = self.response.displayName;
		self.result.membership = membership;
		self.membershipPlatform = bungieStuff.membershipPlatforms[membership.type];
	}

	function getCharacters() {
		var url = bungieStuff.url + self.membershipPlatform + '/Account/' + self.result.membership.id + '/';
		requestJson({url:url}, handleCharactersResponse);
	}

	function handleCharactersResponse(error, response, body) {
		if(bungieResponded(error, body)) {
			if(body.Response.data && body.Response.data.characters && body.Response.data.characters.length) {
				self.response = body.Response.data;
				mapResponseToResultCharacters();
				getCharacterDetails();
			} else {
				self.result.error = 'no characters found';
				finish();
			}
		}
	}

	function mapResponseToResultCharacters() {
		var characters = [];
		for (var i=0; i < self.response.characters.length; i++) {
			var character = {},
				resCharacter = self.response.characters[i];
			character.id = resCharacter.characterBase.characterId;
			character.dateLastPlayed = resCharacter.characterBase.dateLastPlayed;
			character.minutesPlayedThisSession = resCharacter.characterBase.minutesPlayedThisSession;
			character.minutesPlayedTotal = resCharacter.characterBase.minutesPlayedTotal;
			character.level = resCharacter.characterBase.powerLevel;
			character.raceHash = resCharacter.characterBase.raceHash;
			character.genderHash = resCharacter.characterBase.genderHash;
			character.classHash = resCharacter.characterBase.classHash;
			characters.push(character);
		}
		self.result.characters = characters;
	}

	function getCharacterDetails() {
		var detailsFetcher;
		self.characterDetailsCompletion = [];
		for(var i=0; i < self.result.characters.length; i++) {
			detailsFetcher = new CharacterDetailsFetcher(getCharacterUrl(i));
			detailsFetcher.fetch();
			detailsFetcher.finished(getDetailsResultHandler(i));
		}
	}

	function getCharacterUrl(characterIndex) {
		return bungieStuff.url + self.membershipPlatform + '/Account/' + self.result.membership.id + '/Character/' + self.result.characters[characterIndex].id + '/';
	}

	function getDetailsResultHandler(characterIndex) {
		var character = self.result.characters[characterIndex];
		return function(details) {
			character.inventory = details.inventory;
			character.activities = details.activities;
			character.progressions = details.progressions;
			self.characterDetailsCompletion[characterIndex] = true;
			if(characterDetailsFetchingIsComplete()) {
				finish();
			}
		};
	}

	function characterDetailsFetchingIsComplete() {
		return self.characterDetailsCompletion.length >= self.result.characters.length;
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

function bungieResponseIsValid(error, body) {
	return !error && body && body.Response;
}

function CharacterDetailsFetcher(characterUrl) {
	var self = this;
	self.characterUrl = characterUrl;
	self.completion = {};
	self.result = {};

	self.fetch = function() {
		getInventory();
		getActivities();
		getProgressions();
	};

	self.finished = function(callback) {
		self.finishedCallback = callback;
	};

	function getInventory() {
		var url = self.characterUrl + 'Inventory/';
		requestJson({url:url}, handleInventoryResponse);
	}

	function handleInventoryResponse(error, response, body) {
		if(bungieResponseIsValid(error, body) && body.Response.data) {
			self.result.inventory = {
				currencies: body.Response.data.currencies
			};
		}
		self.completion.inventory = true;
		finishIfComplete();
	}

	function getActivities() {
		var url = self.characterUrl + 'Activities/';
		requestJson({url:url}, handleActivitiesResponse);
	}

	function handleActivitiesResponse(error, response, body) {
		if(bungieResponseIsValid(error, body) && body.Response.data) {
			self.result.activities = [];
			var activities = body.Response.data.available;
			for(var i=0; i < activities.length; i++) {
				self.result.activities.push({
					activityHash: activities[i].activityHash,
					isCompleted: activities[i].isCompleted
				});
			}
			self.result.activites = body.Response.data.available;
		}
		self.completion.activities = true;
		finishIfComplete();
	}

	function getProgressions() {
		var url = self.characterUrl + 'Progression/';
		requestJson({url:url}, handleProgressionResponse);
	}

	function handleProgressionResponse(error, response, body) {
		if(bungieResponseIsValid(error, body) && body.Response.data) {
			self.result.progressions = body.Response.data.progressions;
		}
		self.completion.progressions = true;
		finishIfComplete();
	}

	function finishIfComplete() {
		if(self.completion.inventory && self.completion.activities && self.completion.progressions) {
			finish();
		}
	}

	function finish() {
		if(self.finishedCallback) {
			self.finishedCallback(self.result);
			self.finishedCallback = null;
		}
	}
}

console.log();

function Stasher(data) {
	var self = this;
	self.data = data;
	self.stash = function() {
		try {
			connect();
		} catch(err) {
			console.log(err);
		}
	};

	function connect() {
		mongo.MongoClient.connect(process.env.MONGOLAB_URI || 'mongodb://heroku_app30494315:4r32lkr8kaqj5cgdk5lufohujt@ds051740.mongolab.com:51740/heroku_app30494315', function(err, db) {
		  if(err) {
		  	throw err;
		  }
		  self.db = db;
		});
	}

	function disconnect() {
		if(!self.db) {
			throw 'Stasher: db not set. Connect first.';
		}
		self.db.close();
	}

	function upsert() {
		
	}
}
