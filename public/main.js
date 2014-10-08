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
			2271682572: 'warlock'
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
			message.css('color','#000');
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

	function showCurrency(character, isLastCharacter) {
		getCurrency(character.characterBase)
		.done(function (res) {
			var d = $('<div/>').html('<span style="font-weight:bold;margin-right:10px">' + character.characterLevel + ' ' + hashes[character.characterBase.genderHash] + ' ' + hashes[character.characterBase.raceHash] + ' ' + hashes[character.characterBase.classHash] + '</span>');
			for(var i=0;i<res.length;i++) {
				d.append(' ' + res[i].value + ' ' + hashes[res[i].itemHash]);
				if(i<res.length-1) {
					d.append(',');
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
					showCurrency(res.data.characters[i], i===res.data.characters.length-1);
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

});
