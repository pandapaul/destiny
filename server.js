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
	app.post('/leaderboard', leaderboard);
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
		res.json(searchResult);
		if(!searchResult.error) {
			new Stasher(searchResult).stash();
		}
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
			self.characterDetailsCompletion.push(true);
			if(characterDetailsFetchingIsComplete()) {
				finish();
			}
		};
	}

	function characterDetailsFetchingIsComplete() {
		return self.characterDetailsCompletion.length >= self.result.characters.length;
	}

	function finish() {
		self.result.dateLastUpdated = new Date();
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

	//TODO clean up inventory response handling
	function handleInventoryResponse(error, response, body) {
		if(bungieResponseIsValid(error, body) && body.Response.data && body.Response.data.currencies) {
			self.result.inventory = {currencies:{}};
			var currencies = body.Response.data.currencies;
			for(var i=0;i<currencies.length;i++) {
				self.result.inventory.currencies[currencies[i].itemHash] = {
					value: currencies[i].value
				};
			}
		}
		self.completion.inventory = true;
		finishIfComplete();
	}

	function getActivities() {
		var url = self.characterUrl + 'Activities/';
		requestJson({url:url}, handleActivitiesResponse);
	}

	function handleActivitiesResponse(error, response, body) {
		if(bungieResponseIsValid(error, body) && body.Response.data && body.Response.data.available) {
			self.result.activities = {};
			var activities = body.Response.data.available;
			for(var i=0; i < activities.length; i++) {
				self.result.activities[activities[i].activityHash] = {
					isCompleted: activities[i].isCompleted
				};
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
		if(bungieResponseIsValid(error, body) && body.Response.data && body.Response.data.progressions) {
			var progressions = body.Response.data.progressions;
			self.result.progressions = {};
			for(var i=0; i<progressions.length; i++) {
				self.result.progressions[progressions[i].progressionHash] = {
					dailyProgress: progressions[i].dailyProgress,
                    weeklyProgress: progressions[i].weeklyProgress,
                    currentProgress: progressions[i].currentProgress,
                    level: progressions[i].level,
                    progressToNextLevel: progressions[i].progressToNextLevel,
                    nextLevelAt: progressions[i].nextLevelAt
				};
			}
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

function Stasher(data) {
	var self = this;
	self.data = data;

	self.stash = function() {
		try {
			validate();
			self.dbHandler = new DatabaseConnectionHandler();
			self.dbHandler.connect(upsert);
		} catch(err) {
			console.log('Stasher Error',err);
		}
	};

	function validate() {
		if(!self.data || !self.data.membership || !self.data.membership.id) {
			throw new Error('data has no membership id');
		}
	}

	function upsert() {
		for(var i=0; i<self.data.characters.length; i++) {
			upsertCharacter(self.data.characters[i]);
		}
	}

	function upsertCharacter(character) {
		character.membership = self.data.membership;
		var condition = {
			'id': character.id,
			'membership.id': character.membership.id
		};
		self.dbHandler.upsert('characters', condition, character, trackUpsertProgress);
	}

	function trackUpsertProgress() {
		if(!self.upsertProgress) {
			self.upsertProgress = 0;
		}
		self.upsertProgress++;
		if(self.upsertProgress >= self.data.characters.length) {
			self.dbHandler.disconnect();
		}
	}
}

function DatabaseConnectionHandler() {
	var self = this;

	self.connect = function(callback) {
		mongo.MongoClient.connect(process.env.MONGOLAB_URI, function(err, db) {
			if(err) {
				throw err;
			}
			self.db = db;
			callback();
		});
	};

	self.disconnect = function() {
		if(self.db && self.db.close) {
			self.db.close();
		}
	};

	self.upsert = function(collection, condition, data, callback) {
		self.db.collection(collection).update(condition, data, {upsert:true}, callback);
	};

	self.find = function(collection, condition, options, callback) {
		self.db.collection(collection).find(condition, options).toArray(callback);
	};
}

function leaderboard(req, res) {
	var currentProgressField = {};
	var fetcher = new Fetcher({},{sort:{'progressions.529303302.currentProgress':-1}, fields:{'_id':0, 'membership':1, 'id':1, 'progressions.529303302.currentProgress':1, 'progressions.529303302.level':1}});
	// var fetcher = new Fetcher();
	fetcher.fetch();
	fetcher.finished(function(docs) {
		res.json(docs);
	});
}

function Fetcher(condition, options) {
	var self = this;
	self.condition = condition;
	self.options = options;

	self.fetch = function() {
		try {
			validate();
			self.dbHandler = new DatabaseConnectionHandler();
			self.dbHandler.connect(find);
		} catch(err) {
			console.log('Stasher Error',err);
			self.result.error = 'unable to fetch from the database';
			finish();
		}
	};

	self.finished = function(finishedCallback) {
		self.finishedCallback = finishedCallback;
	};

	function validate() {
		var limit = 100;
		self.options = self.options || {};
		self.options.limit = (self.options.limit && Math.min(self.options.limit, limit)) || limit;
	}

	function find() {
		self.dbHandler.find('characters',self.condition, self.options, handleResult);
	}

	function handleResult(err, docs) {
		if(err) {
			throw err;
		}
		self.dbHandler.disconnect();
		self.result = docs;
		finish();
	}

	function finish() {
		if(self.finishedCallback) {
			self.finishedCallback(self.result);
			self.finishedCallback = null;
		}
	}

}