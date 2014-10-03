$(function() {
	var button = $('#submitButton'),
		textInput = $('#textInput'),
		pic = $('#pic'),
		selectedAccountType = 2,
		errUnableToConnectToBungie = {msg:'unable to connect to Bungie'},
		errNoResponseFromBungie = {msg:'no response from Bungie'},
		errNoMatchesFound = {msg:'no matches found'},
		errNoCharactersFound = {msg:'no characters found'};

	function searchForMembership(username) {
		var dfd = new $.Deferred();
		$.jsonp({
			url: 'http://www.bungie.net/Platform/Destiny/SearchDestinyPlayer/All/' + username + '/',
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

	function showError(err) {
		//TODO implement better error showing
		if(err && err.msg) {
			console.log('Error: ' + err.msg);
		} else {
			console.log('Unknown error');
		}
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
			pic.attr('src', data.filename);
			pic.show();
		})
		.fail(function() {
			showError();
		})
		.always(function() {
			button.attr('disabled',false);
		});
	}

	button.on('click', function() {
		var username = textInput.val();
		if(!$.trim(username)) {
			return;
		}
		button.attr('disabled',true);
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
				if(res.data.characters.length === 1) {
					retrievePic(res.data.characters[0].characterBase);
				} else {
					retrievePic(res.data.characters[0].characterBase);
					// TODO requireCharacterSelection(res);
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
});