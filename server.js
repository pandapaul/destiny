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
	bungieStuff.activityTypeNightfall = 575572995;
	bungieStuff.activityTypes = {
		575572995: 'Nightfall/WeeklyHeroic',
		2043403989: 'VaultOfGlass',
		837773392: 'CrotasEnd'
	};
	bungieStuff.progressions = {
		3871980777: 'New Monarchy',
		529303302: 'Cryptarch',
		2161005788: 'Iron Banner',
		452808717: 'Queen',
		3233510749: 'Vanguard',
		1357277120: 'Crucible',
		2778795080: 'Dead Orbit',
		1424722124: 'Future War Cult',
		174528503: 'Eris Morn',
		2033897742: 'Weekly Vanguard Marks',
		2033897755: 'Weekly Crucible Marks',
		2030054750: 'Mote of Light'
	};
}

function setupRoutesAndMiddleware() {
	app.get('/', redirectIfNeeded);
	app.use(express.static('public'));
	app.use(bodyParser.json());
	app.post('/search', search);
	app.post('/leaderboard', leaderboard);
}

function redirectIfNeeded(req, res, next) {
	if(req.header('host').indexOf('herokuapp.com') > -1) {
		res.redirect(301, 'http://www.destinyrep.com');
	} else {
		next();
	}
}

function listen() {
	var listenPort = process.env.PORT || 5000;
	app.listen(listenPort);
	console.log('Listening on port ' + listenPort);
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

	if(req.body.key !== '01242015' && req.headers.origin.indexOf('http://localhost:') < 0 && req.headers.origin !== 'http://www.destinyrep.com') {
		req.body.justChecking = true;
		console.log('Unknown Origin: ' + req.headers.origin);
	}

	try {
		var searcher = new Searcher(req.body.username, req.body.membershipType, req.body.justChecking);
		searcher.search();
		searcher.finished(function(searchResult) {
			res.json(searchResult);
			if(!searchResult.error && !req.body.justChecking) {
				new Stasher(searchResult).stash();
			}
		});
	} catch(err) {
		console.log('search error', err);
		res.json({error:'search error. try again in a moment'});
	}
}

function Searcher(username, membershipType, justChecking) {
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
				self.result.found = false;
				finish();
			} else if(justChecking) {
				self.result.found = true;
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
			character.level = resCharacter.characterLevel;
			character.raceHash = resCharacter.characterBase.raceHash;
			character.genderHash = resCharacter.characterBase.genderHash;
			character.classHash = resCharacter.characterBase.classHash;
			character.percentToNextLevel = resCharacter.percentToNextLevel;
			character.customization = {
				emblemPath: resCharacter.emblemPath,
				backgroundPath: resCharacter.backgroundPath
			};
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
			character.definitions = details.definitions;
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
		var url = self.characterUrl + 'Activities/?definitions=true';
		requestJson({url:url}, handleActivitiesResponse);
	}

	//TODO clean up activities response handling
	function handleActivitiesResponse(error, response, body) {
		if(bungieResponseIsValid(error, body) && body.Response.data && body.Response.data.available) {
			self.result.activities = {};
			self.result.definitions = {};
			var activities = body.Response.data.available,
				definitions = body.Response.definitions;
			for(var i=0; i < activities.length; i++) {
				var definition = definitions.activities[activities[i].activityHash];
				if(bungieStuff.activityTypes[definition.activityTypeHash]) {
					self.result.activities[activities[i].activityHash] = {
						isCompleted: activities[i].isCompleted
					};
					self.result.definitions[activities[i].activityHash] = {
						activityName: definition.activityName,
						activityLevel: definition.activityLevel,
						activityTypeHash: definition.activityTypeHash
					};
				}
			}
		}
		self.completion.activities = true;
		finishIfComplete();
	}

	function getProgressions() {
		var url = self.characterUrl + 'Progression/';
		requestJson({url:url}, handleProgressionResponse);
	}

	//TODO clean up progression response handling
	function handleProgressionResponse(error, response, body) {
		if(bungieResponseIsValid(error, body) && body.Response.data && body.Response.data.progressions) {
			var progressions = body.Response.data.progressions;
			self.result.progressions = {};
			for(var i=0; i<progressions.length; i++) {
				if(bungieStuff.progressions[progressions[i].progressionHash]) {
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

	function upsert(connectionError) {
		if(connectionError) {
			finish();
			return;
		}
		for(var i=0; i<self.data.characters.length; i++) {
			upsertCharacter(self.data.characters[i]);
		}
	}

	function upsertCharacter(character) {
		character.membership = self.data.membership;
		delete character.customization;
		delete character.definitions;
		character.updated = new Date();
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
			finish();
		}
	}

	function finish() {
		self.dbHandler.disconnect();
	}
}

function DatabaseConnectionHandler() {
	var self = this;

	self.connect = function(callback) {
		mongo.MongoClient.connect(process.env.MONGOLAB_URI, function(err, db) {
			self.db = db;
			if(err) {
				console.log(err);
			}
			callback(err);
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
	var faction = req.body.faction || 529303302,
		currentProgress = 'progressions.' + faction + '.currentProgress',
		level = 'progressions.' + faction + '.level';

	var sort = {};
	sort[currentProgress] = -1;

	var fields = {
		'_id':0,
		'membership':1,
		'id':1
	};
	fields[currentProgress] = 1;
	fields[level] = 1;

	var fetcher = new Fetcher({},{sort:sort, fields:fields});
	fetcher.fetch();
	fetcher.finished(function(docs) {
		res.json(docs);
	});
}

function Fetcher(condition, options) {
	var self = this;
	self.condition = condition;
	self.options = options;
	self.result = {};

	self.fetch = function() {
		try {
			validate();
			self.dbHandler = new DatabaseConnectionHandler();
			self.dbHandler.connect(find);
		} catch(err) {
			console.log('Fetcher Error',err);
			self.result.error = 'unable to fetch from the database';
			finish();
		}
	};

	self.finished = function(finishedCallback) {
		self.finishedCallback = finishedCallback;
	};

	function validate() {
		var limit = 1000;
		self.options = self.options || {};
		self.options.limit = (self.options.limit && Math.min(self.options.limit, limit)) || limit;
	}

	function find(connectionError) {
		if(connectionError) {
			finish();
			return;
		}
		self.dbHandler.find('characters',self.condition, self.options, handleResult);
	}

	function handleResult(err, docs) {
		if(err) {
			throw err;
		}
		self.result = docs;
		finish();
	}

	function finish() {
		if(self.dbHandler) {
			self.dbHandler.disconnect();
		}
		if(self.finishedCallback) {
			self.finishedCallback(self.result);
			self.finishedCallback = null;
		}
	}
}
