$(function() {
	var button = $('#submitButton'),
		textInput = $('#textInput'),
		results = $('.results'),
		characters = results.find('.characters'),
		tabs = results.find('.tabs'),
		message = $('.message'),
		selectedAccountType = 2,
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
			3871980777: 'New Monarchy',
			529303302: 'Cryptarch',
			2161005788: 'Iron Banner',
			452808717: 'Queen',
			3233510749: 'Vanguard',
			1357277120: 'Crucible',
			2778795080: 'Dead Orbit',
			1424722124: 'Future War Cult',
			174528503: 'Eris Morn',
			weeklyMarks: {
				2033897742: 'Vanguard Marks',
				2033897755: 'Crucible Marks'
			},
			weeklyHeroics: {
				2591274210: {name: "The Devil's Lair", level: 22},
				1178608439: {name: "The Summoning Pits", level: 22},
				1100096652: {name: "The Nexus", level: 22},
				3304208793: {name: "Cerberus Vae III", level: 22},
				2495639390: {name: "Winter's Run", level: 22},
				906746307: {name: "The Devil's Lair", level: 22},
				1748464680: {name: "The Summoning Pits", level: 22},
				3815863573: {name: "The Nexus", level: 22},
				3037962954: {name: "Cerberus Vae III", level: 22},
				670913375: {name: "Winter's Run", level: 22},
				2591274211: {name: "The Devil's Lair", level: 26},
				1178608438: {name: "The Summoning Pits", level: 26},
				1100096653: {name: "The Nexus", level: 26},
				3304208792: {name: "Cerberus Vae III", level: 26},
				2495639391: {name: "Winter's Run", level: 26},
				906746306: {name: "The Devil's Lair", level: 26},
				1748464681: {name: "The Summoning Pits", level: 26},
				3815863572: {name: "The Nexus", level: 26},
				3037962955: {name: "Cerberus Vae III", level: 26},
				670913374: {name: "Winter's Run", level: 26},
				2591274208: {name: "The Devil's Lair", level: 28},
				1178608437: {name: "The Summoning Pits", level: 28},
				1100096654: {name: "The Nexus", level: 28},
				3304208795: {name: "Cerberus Vae III", level: 28},
				2495639388: {name: "Winter's Run", level: 28},
				906746305: {name: "The Devil's Lair", level: 28},
				1748464682: {name: "The Summoning Pits", level: 28},
				3815863575: {name: "The Nexus", level: 28},
				3037962952: {name: "Cerberus Vae III", level: 28},
				670913373: {name: "Winter's Run", level: 28}
			},
			weeklyNightfalls: {
				2591274209: "The Devil's Lair",
				1178608436: "The Summoning Pits",
				1100096655: "The Nexus",
				3304208794: "Cerberus Vae III",
				2495639389: "Winter's Run",
				906746304: "The Devil's Lair",
				1748464683: "The Summoning Pits",
				3815863574: "The Nexus",
				3037962953: "Cerberus Vae III",
				670913372: "Winter's Run"
			},
			vaultOfGlass: {
				2659248071: {name: "Vault of Glass", level: 26},
				2659248068: {name: "Vault of Glass", level: 30}
			}
		},
		playerData = {};

	function getUrlVars()
	{
	    var vars = [], hash;
	    var hashes = window.location.href.slice(window.location.href.indexOf('#') + 1).split('&');
	    for(var i = 0; i < hashes.length; i++)
	    {
	        hash = hashes[i].split('=');
	        vars.push(hash[0]);
	        vars[hash[0]] = hash[1];
	    }
	    return vars;
	}

	function performSearch() {
		startLoading();
		$.ajax({
			url: '/search', 
			type: 'POST',
			data: JSON.stringify({username:textInput.val(), membershipType:selectedAccountType}),
			contentType:'application/json; charset=utf-8',
			dataType:'json'
		}).done(function(res){
			playerData = res;		
			sortPlayerData();
			mapPlayerData();
			displayPlayerData();
			stopLoading(playerData.error);
		}).fail(function(err){
			stopLoading(err);
		});
	}

	function startLoading() {
		showMessage({text:'loading...',level:'info'});
		button.attr('disabled',true);
		results.hide();
		characters.empty();
	}

	function stopLoading(err) {
		if(err) {
			showError(err);
		} else {
			message.empty();
		}
		button.attr('disabled',false);
		results.show();
	}

	function sortPlayerData() {
		if(!playerData.characters || playerData.characters.length <= 1) {
			return;
		}
		playerData.characters.sort(function(a,b) {
			return new Date(b.dateLastPlayed) - new Date(a.dateLastPlayed);
		});
	}

	function mapPlayerData() {
		for(var i=0; i<playerData.characters.length;i++) {
			mapCharacterData(playerData.characters[i]);
		}
	}


	//TODO figure out how to eloquently map all the char data to box data
	function mapCharacterData(character) {
		var characterBox = {
			label: character.level + hashes[character.classHash],
			type: hashes[progressionData.progressionHash].toLowerCase().replace(/ /g,'-'),
			title: 'Rank ' + progressionData.level,
			current: progressionData.progressToNextLevel,
			max: progressionData.nextLevelAt
		};
	}

	function displayPlayerData() {
		if(!playerData.characters || !playerData.characters.length) {
			return;
		}
		for(var i=0; i<playerData.characters.length;i++) {
			displayCharacterData(playerData.characters[i]);
		}
	}

	function displayCharacterData(character) {
		displayCurrentCharacterData();
		displayWeeklyCharacterData();
		displayDailyCharacterData();

		function displayCurrentCharacterData() {
			
		}

		function displayWeeklyCharacterData() {

		}

		function displayDailyCharacterData() {

		}
	}

	//TODO gyahhhh cleanup
	function displayCharacterData(character) {
		
		var mostRecentWeeklyReset = getDateOfMostRecentWeeklyReset(),
			mostRecentDailyReset = getDateOfMostRecentDailyReset();
		var profileHref = 'http://www.bungie.net/en/Legend/' + playerData.membership.type + '/' + playerData.membership.id + '/' + character.id;
		var d = $('<div class="container character-container"/>').html('<a class="character-link" href="' + profileHref + '">' + character.level + ' ' + hashes[character.genderHash] + ' ' + hashes[character.raceHash] + ' ' + hashes[character.classHash] + '</a>');
		
		//currencies  TODO cleanup
		var currencyCount = 0;
		$.each(character.inventory.currencies, function(hash, currency) {
			d.append(' ' + currency.value + ' ' + hashes[hash]);
			currencyCount++;
			if(currencyCount<3) {
				d.append(',');
			}
		});

		//TODO cleanup
		var a = $('<div/>')
				.addClass('character-activities')
				.appendTo(d),
			w = $('<div/>')
				.addClass('character-weekly-marks')
				.appendTo(d),
			characterDate = new Date(character.dateLastPlayed),
			playedSinceWeeklyReset = characterDate - mostRecentWeeklyReset > 0;
			playedSinceDailyReset = characterDate - mostRecentDailyReset > 0;
		
		//show activities
		if(playedSinceWeeklyReset) {
			showActivityCompletion(a, character.activities);
		} else {
			showActivityCompletion(a);
		}

		//show progression
		//TODO cleanup
		$.each(character.progressions, function(hash, progression) {
			progression.characterDate = characterDate;
			progression.playedSinceWeeklyReset = playedSinceWeeklyReset;
			progression.playedSinceDailyReset = playedSinceDailyReset;
			progression.progressionHash = hash;
			if(hashes[hash]) {
				d.append(buildFactionBar(progression));
			} else if(hashes.weeklyMarks[hash]) {
				if(!playedSinceWeeklyReset) {
					progression.level = 0;
				}
				w.append(buildWeeklyMarksBar(progression));
			}
		});

		d.appendTo(characters);
	}

	function getDateOfMostRecentDailyReset() {
		var date = new Date();
		if(date.getUTCHours() < 9) {
			date.setUTCDate(date.getUTCDate() - 1);
		}
		date.setUTCHours(9);
		date.setUTCMinutes(0);
		date.setUTCSeconds(0);
		date.setUTCMilliseconds(0);
		return date;
	}

	function getDateOfMostRecentWeeklyReset() {
		var date = new Date();
		var currentDayOfWeek = date.getUTCDay();
		var distanceToMostRecentTuesday = currentDayOfWeek - 2;
		if(distanceToMostRecentTuesday < 0 || (distanceToMostRecentTuesday === 0 && date.getUTCHours() < 9)) {
			distanceToMostRecentTuesday += 7;
		}
		date.setUTCDate(date.getUTCDate() - distanceToMostRecentTuesday);
		date.setUTCHours(9);
		date.setUTCMinutes(0);
		date.setUTCSeconds(0);
		date.setUTCMilliseconds(0);
		return date;
	}

	function showActivityCompletion(div, activities) {
		var activity = null,
			heroic = null,
			nightfall = null,
			vog = null;
		if(activities) {
			$.each(activities, function(hash, activity) {
				if(activity.isCompleted) {
					activity = hashes.weeklyHeroics[hash];
					if((activity && !heroic) || (activity && heroic && activity.level > heroic.level)) {
						heroic = activity;
						return;
					}
					activity = hashes.weeklyNightfalls[hash];
					if(activity) {
						nightfall = activity;
						return;
					}
					activity = hashes.vaultOfGlass[hash];
					if((activity && !vog) || (activity && vog && activity.level > vog.level)) {
						vog = activity;
						return;
					}
				}
			});
		}
		var heroicCompletionText = 'Weekly Heroic ';
		if(heroic) {
			heroicCompletionText += '(' + heroic.level + ') Complete';
		} else {
			heroicCompletionText += 'Incomplete';
		}
		var nightfallCompletionText = 'Weekly Nightfall ';
		if(nightfall) {
			nightfallCompletionText += 'Complete';
		} else {
			nightfallCompletionText += 'Incomplete';
		}
		var vogCompletionText = 'Vault of Glass ';
		if(vog) {
			vogCompletionText += '(' + vog.level + ') Complete';
		} else {
			vogCompletionText += 'Incomplete';
		}
		div.append($('<span/>').text(heroicCompletionText + ', '))
			.append($('<span/>').text(nightfallCompletionText))
			.append($('<div/>').text(vogCompletionText));
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

	button.on('click', function() {
		var username = textInput.val().replace(/\s/g, '');
		textInput.val(username);
		if(!username) {
			return;
		}
		updateHash();
	});

	function updateHash() {
		window.location.hash = 'un=' + textInput.val() + '&t=' + selectedAccountType;
	}

	function buildFactionBar(progressionData) {
		var progress = {
			label: hashes[progressionData.progressionHash],
			type: hashes[progressionData.progressionHash].toLowerCase().replace(/ /g,'-'),
			title: 'Rank ' + progressionData.level,
			current: progressionData.progressToNextLevel,
			max: progressionData.nextLevelAt
		};
		return buildProgressBar(progress);
	}

	function buildProgressBar(progress) {
		var container = $('<div/>')
				.addClass('progress-container')
				.addClass(progress.type),
			icon = $('<div/>')
				.addClass('icon')
				.prop('alt',progress.label),
			progressbar = $('<div/>')
				.addClass('progress-bar')
				.height(progress.current/progress.max*100 + '%'),
			amount = $('<div/>')
				.addClass('amount')
				.text(progress.current + '/' + progress.max),
			title = $('<div/>')
				.addClass('title')
				.text(progress.title);

		return container.append(title, icon, progressbar, amount);
	}

	function buildWeeklyMarksBar(progressionData) {
		var adjustedLevel = 0;
		if(progressionData.playedSinceWeeklyReset) {
			adjustedLevel = progressionData.level;
		}
		var progress = {
			label: hashes.weeklyMarks[progressionData.progressionHash],
			type: hashes.weeklyMarks[progressionData.progressionHash].toLowerCase().replace(/ /g,'-'),
			title: 'Weekly',
			current: adjustedLevel,
			max: 100
		};
		return buildProgressBar(progress);
	}

	function updateFormFromHash() {
		var urlVars = getUrlVars();
		textInput.val(urlVars.un);
		if(urlVars.t) {
			selectedAccountType = parseInt(urlVars.t);
			$('input:radio[name=accountType][value=' + urlVars.t + ']').click();
		}
		if(urlVars.un && urlVars.t) {
			performSearch();
		} else {
			characters.empty();
		}
	}

	$(window).on('hashchange', function() {
		updateFormFromHash();
	});

	$("input:radio[name=accountType]").click(function() {
    	selectedAccountType = parseInt($(this).val());
	});

	textInput.on('keypress', function(e) {
		if(e.keyCode === 13) {
			button.click();
		}
	});

	function setupNavigation() {
		var headerHeight = parseInt($('.header').css('height')),
		coolStuffDiv = $('.cool-stuff'),
		aboutDiv = $('.about'),
		contactDiv = $('.contact'),
		contributingDiv = $('.contributing'),
		navpills = $('.nav-pills li');

		function scrollToDiv(div) {
			var pos = div.offset();
			pos.top -= headerHeight;
			scrollTo(pos.left, pos.top);
		}

		$('.search-link').on('click', function() {
			scrollTo(0,0);
		});

		$('.cool-stuff-link').on('click', function() {
			scrollToDiv(coolStuffDiv);
		});

		$('.about-link').on('click', function() {
			scrollToDiv(aboutDiv);
		});

		$('.contact-link').on('click', function() {
			scrollToDiv(contactDiv);
		});

		$('.contributing-link').on('click', function() {
			scrollToDiv(contributingDiv);
		});

		navpills.on('click', function() {
			var self = $(this);
			navpills.removeClass('active');
			self.addClass('active');
			tabs.find('.tab').hide();
			tabs.find('.' + self.text().toLowerCase()).show();
		});
	}

	textInput.focus();
	setupNavigation();
	updateFormFromHash();

});
