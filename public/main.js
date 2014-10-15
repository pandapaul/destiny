$(function() {
	var button = $('#submitButton'),
		textInput = $('#textInput'),
		results = $('.results'),
		message = $('.message'),
		selectedAccountType = 2,
		errUnableToConnectToBungie = {text:'unable to connect to Bungie'},
		errNoResponseFromBungie = {text:'no response from Bungie'},
		errNoMatchesFound = {text:'no matches found'},
		errNoCharactersFound = {text:'no characters found'},
		hashes = {
			3159615086: 'glimmer',
			1415355184: 'crucible marks',
			1415355173: 'vanguard marks',
			898834093: 'exo',
			3887404748: 'human',
			2803282938: 'awoken',
			3111576190: 'male',
			2204441813: 'female',
			671679327: 'hunter',
			3655393761: 'titan',
			2271682572: 'warlock',
			3871980777: 'new monarchy',
			529303302: 'cryptarch',
			2161005788: 'iron banner',
			452808717: 'queen',
			3233510749: 'vanguard',
			1357277120: 'crucible',
			2778795080: 'dead orbit',
			1424722124: 'future war cult'
		};

	function searchForMembership(username) {
		var dfd = new $.Deferred();
		$.jsonp({
			url: 'http://www.bungie.net/Platform/Destiny/SearchDestinyPlayer/' + selectedAccountType + '/' + username + '/',
			dataType:"jsonp",
			success: function(data) {
				if(data && data.Response) {
					return handleSearchResponse(data.Response, dfd);
				} else {
					dfd.reject(errNoResponseFromBungie);
				}
			}
		});
		return dfd;
	}

	function handleSearchResponse(res, dfd) {
		if(!res) {
			dfd.reject(errNoResponseFromBungie);
			return dfd;
		}
		if(res.length < 1) {
			dfd.reject(errNoMatchesFound);
		} else {
			dfd.resolve(res);
		}
		return dfd;
	}

	function showMessage(msg) {
		if(!msg) {
			return;
		}
		if(typeof msg === 'string') {
			msg = {text:msg};
		}
		if(msg.level === 'info') {
			message.css('color','');
		} else {
			message.css('color','#a94442');
		}
		if(msg.text) {
			message.text(msg.text);
		} else {
			message.text('unknown error');
		}
	}

	function showError(err) {
		if(typeof err === 'string') {
			err = {text:err};
		}
		err.level = 'error';
		showMessage(err);
	}

	function getCharacterIds(member) {
		var dfd = new $.Deferred(),
			accountType = 'TigerPSN';

		if(member.membershipType === 1) {
			accountType = 'TigerXbox';
		}

		$.jsonp({
			url: 'http://www.bungie.net/Platform/Destiny/' + accountType + '/Account/' + member.membershipId + '/',
			dataType:"jsonp",
			success: function(data) {
				if(data && data.Response) {
					return handleCharacterIdsResponse(data.Response, dfd);
				} else {
					dfd.reject(errNoResponseFromBungie);
				}
			}
		});
		return dfd;
	}

	function handleCharacterIdsResponse(res, dfd) {
		if(!res) {
			dfd.reject(errNoResponseFromBungie);
			return dfd;
		}
		if(!res.data || !res.data.characters || res.data.characters.length < 1) {
			dfd.reject(errNoCharactersFound);
		} else {
			dfd.resolve(res);
		}
		return dfd;
	}

	function requireCharacterSelection(res) {
		console.log('require character selection');
	}

	function retrievePic(character) {
		var url = 'http://www.bungie.net/en/Legend/' + character.membershipType + '/' + character.membershipId + '/' + character.characterId + '#gear';	

		$.ajax({
			type: 'POST',
			url: '/getPic',
			data: JSON.stringify({url: url}),
			contentType:"application/json; charset=utf-8",
			dataType:"json"
		})
		.done(function(data) {
			if(!data.filename) {
				return;
			}
			results.find('img').attr('src', data.filename);
			results.find('a').html(url).attr('href', url);
			results.show();
			message.empty();
		})
		.fail(function() {
			showError();
		})
		.always(function() {
			button.attr('disabled',false);
		});
	}

	function loadCharacterInfo(character, isLastCharacter) {
		var profileHref = 'http://www.bungie.net/en/Legend/' + character.characterBase.membershipType + '/' + character.characterBase.membershipId + '/' + character.characterBase.characterId;
		getCurrency(character.characterBase)
		.done(function (res) {
			var d = $('<div class="character-container"/>').html('<a class="character-link" href="' + profileHref + '">' + character.characterLevel + ' ' + hashes[character.characterBase.genderHash] + ' ' + hashes[character.characterBase.raceHash] + ' ' + hashes[character.characterBase.classHash] + '</a>');
			for(var i=0;i<res.length;i++) {
				d.append(' ' + res[i].value + ' ' + hashes[res[i].itemHash]);
				if(i<res.length-1) {
					d.append(',');
				}
			}
			getProgress(character.characterBase)
			.done(function (res) {
				for(var i=0;i<res.length;i++) {
					if(hashes[res[i].progressionHash]) {
						d.append(buildProgressBar(res[i]));
					}
				}
				d.appendTo(results);
			})
			.always(function () {
				if(isLastCharacter) {
					results.show();
					message.empty();
					button.attr('disabled',false);
				}
			});
		});
	}

	function getCurrency(characterBase) {
		var dfd = new $.Deferred(),
			accountType = 'TigerPSN';

		if(characterBase.membershipType === 1) {
			accountType = 'TigerXbox';
		}

		$.jsonp({
			url: 'http://www.bungie.net/Platform/Destiny/' + accountType + '/Account/' + characterBase.membershipId + '/Character/' + characterBase.characterId + '/Inventory',
			dataType:"jsonp",
			success: function(data) {
				if(data && data.Response && data.Response.data && data.Response.data.currencies && data.Response.data.currencies.length) {
					return dfd.resolve(data.Response.data.currencies);
				} else {
					dfd.reject(errNoResponseFromBungie);
				}
			}
		});
		return dfd;
	}

	button.on('click', function() {
		var username = textInput.val();
		if(!$.trim(username)) {
			return;
		}
		showMessage({text:'loading...',level:'info'});
		button.attr('disabled',true);
		results.empty();
		searchForMembership(username)
		.done(function(res){
			if(!res || res.length < 1) {
				showError();
				return;
			}
			var member = {};
			for(var i=0;i<res.length;i++) {
				if(res[i].membershipType === selectedAccountType) {
					member = res[i];
					break;
				}
			}
			getCharacterIds(member)
			.done(function(res) {
				for(var i=0;i<res.data.characters.length;i++) {
					loadCharacterInfo(res.data.characters[i], i===res.data.characters.length-1);
				}
			})
			.fail(function(res) {
				showError(res);
				button.attr('disabled',false);
			});
		})
		.fail(function(res){
			showError(res);
			button.attr('disabled',false);
		});
	});

	$("input:radio[name=accountType]").click(function() {
    	selectedAccountType = parseInt($(this).val());
	});

	textInput.on('keypress', function(e) {
		if(e.keyCode === 13) {
			button.click();
		}
	});

	textInput.focus();

	function getProgress(characterBase) {
		var dfd = new $.Deferred(),
			accountType = 'TigerPSN';

		if(characterBase.membershipType === 1) {
			accountType = 'TigerXbox';
		}
		console.log('http://www.bungie.net/Platform/Destiny/' + accountType + '/Account/' + characterBase.membershipId + '/Character/' + characterBase.characterId + '/Progression');

		$.jsonp({
			url: 'http://www.bungie.net/Platform/Destiny/' + accountType + '/Account/' + characterBase.membershipId + '/Character/' + characterBase.characterId + '/Progression',
			dataType:"jsonp",
			success: function(data) {
				if(data && data.Response && data.Response.data && data.Response.data.progressions && data.Response.data.progressions.length) {
					return dfd.resolve(data.Response.data.progressions);
				} else {
					dfd.reject(errNoResponseFromBungie);
				}
			}
		});
		return dfd;
	}

//{  
//	"dailyProgress":0,
//	"weeklyProgress":0,
//	"currentProgress":29655,
//	"level":11,
//	"step":0,
//	"progressToNextLevel":2255,
//	"nextLevelAt":3000,
//	"progressionHash":529303302
//}

// <div class="progress">
//   <div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
//     0%
//   </div>
// </div>
// <div class="progress">
//   <div class="progress-bar" role="progressbar" aria-valuenow="2" aria-valuemin="0" aria-valuemax="100" style="width: 2%;">
//     2%
//   </div>
// </div>


	function buildProgressBar(progressionData) {
		var container = $('<div/>')
				.addClass('progress-container'),
			description = $('<span/>')
				.addClass('progress-description')
				.text(hashes[progressionData.progressionHash] + ' rank ' + progressionData.level),
			progress = $('<div/>')
				.addClass('progress'),
			progressbar = $('<div/>')
				.addClass('progress-bar')
				.attr('role','progressbar')
				.attr('aria-valuenow',progressionData.progressToNextLevel)
				.attr('aria-valuemax',progressionData.nextLevelAt)
				.attr('aria-valuemin','0')
				.width(progressionData.progressToNextLevel/progressionData.nextLevelAt*100 + '%')
				.text(progressionData.progressToNextLevel + '/' + progressionData.nextLevelAt)
				.css('padding-left','3px');
		progress.append(progressbar);
		return container.append(description, progress);
	}

});
