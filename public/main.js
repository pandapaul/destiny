$(function() {
	var button = $('#submitButton'),
		textInput = $('#textInput'),
		results = $('.results'),
		characters = results.find('.characters'),
		tabs = results.find('.tabs'),
		message = $('.message'),
		selectedAccountType = 2,
		hashes = {
			3159615086: 'Glimmer',
			1415355184: 'Crucible Marks',
			1415355173: 'Vanguard Marks',
			898834093: 'Exo',
			3887404748: 'Human',
			2803282938: 'Awoken',
			3111576190: 'Male',
			2204441813: 'Female',
			671679327: 'Hunter',
			3655393761: 'Titan',
			2271682572: 'Warlock',
			2030054750: 'Mote of Light',
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
			},
			caps: {
				3159615086: 25000,
				1415355184: 200,
				1415355173: 200,
				2033897742: 100,
				2033897755: 100
			},
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
			if(playerData.characters) {
				sortPlayerData();
				mapPlayerData();
				displayPlayerData();
				results.show();
			}
			stopLoading(playerData.error);
		}).fail(function(err){
			stopLoading(err);
		});
	}

	function startLoading() {
		showMessage({text:'loading...',level:'info'});
		button.attr('disabled',true);
		results.hide();
		tabs.find('.tab').empty();
	}

	function stopLoading(err) {
		if(err) {
			showError(err);
		} else {
			message.empty();
			scrollToDiv(results);
		}
		button.attr('disabled',false);
		$('.nav-tabs li').get(0).click();
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
		getRecentResetDates();
		mapAllCharacters();

		function getRecentResetDates() {
			playerData.mostRecentWeeklyReset = getDateOfMostRecentWeeklyReset();
			playerData.mostRecentDailyReset = getDateOfMostRecentDailyReset();
		}

		function mapAllCharacters() {
			for(var i=0; i<playerData.characters.length;i++) {
				mapCharacterData(playerData.characters[i]);
			}
		}
	}

	function mapCharacterData(character) {
		calculatePlayedSinceReset();
		initializeBoxes();
		mapLight();
		mapMotes();
		mapCurrencies();
		mapActivities();
		mapFactions();

		function calculatePlayedSinceReset() {
			var characterDate = new Date(character.dateLastPlayed);
			character.playedSinceWeeklyReset = characterDate - playerData.mostRecentWeeklyReset > 0;
			character.playedSinceDailyReset = characterDate - playerData.mostRecentDailyReset > 0;
		}

		function initializeBoxes() {
			character.boxes = {};
			character.boxes.current = {
				light: {},
				motes: {},
				currencies: [],
				factions: []
			};
			character.boxes.weekly = {
				currencies: {},
				factions: [],
				activities: []
			};
			character.boxes.daily = {
				currencies: {},
				factions: []
			};
		}
		
		function mapLight() {
			var bungiePathPrefix = '//bungie.net';
			character.boxes.current.light = {
				isHeader: true,
				title: hashes[character.classHash] + ' ' + character.level,
				type: 'light',
				label: playerData.membership.displayName,
				iconPath: bungiePathPrefix + character.customization.emblemPath,
				backgroundPath: bungiePathPrefix + character.customization.backgroundPath,
				percentToNextLevel: 0,
				footer: hashes[character.genderHash] + ' ' + hashes[character.raceHash],
				progressColor: '#f5dc56',
				link: 'http://www.bungie.net/en/Legend/' + playerData.membership.type + '/' + playerData.membership.id + '/' + character.id + '/#gear'
			};
		}

		function mapMotes() {
			character.boxes.current.motes = {
				title: 'Mote of Light',
				type: 'mote-of-light',
				label: 'Next Mote of Light',
				progress: character.progressions[2030054750].progressToNextLevel,
				max: character.progressions[2030054750].nextLevelAt
			};
			character.boxes.weekly.motes = {
				title: 'Weekly/Lifetime',
				type: 'mote-of-light',
				label: 'Next Mote of Light',
				progress: character.progressions[2030054750].weeklyProgress,
				max: character.progressions[2030054750].currentProgress
			};
			character.boxes.daily.motes = {
				title: 'Daily/Weekly',
				type: 'mote-of-light',
				label: 'Next Mote of Light',
				progress: character.progressions[2030054750].dailyProgress,
				max: character.progressions[2030054750].weeklyProgress
			};
		}
		
		function mapCurrencies() {
			character.boxes.current.currencies = [];
			$.each(character.inventory.currencies, function(hash, currency) {
				character.boxes.current.currencies.push({
					title: hashes[hash],
					type: hashes[hash].toLowerCase().replace(/\s/g, '-'),
					label: hashes[hash],
					progress: currency.value,
					max: hashes.caps[hash]
				});
			});

			character.boxes.weekly.currencies = {
				vanguardMarks: {
					title: 'Weekly',
					type: 'vanguard-marks',
					label: 'Weekly Vanguard Marks',
					progress: character.progressions[2033897742].level,
					max: hashes.caps[2033897742]
				},
				crucibleMarks: {
					title: 'Weekly',
					type: 'crucible-marks',
					label: 'Weekly Crucible Marks',
					progress: character.progressions[2033897755].level,
					max: hashes.caps[2033897755]
				}
			};

			character.boxes.daily.currencies = {
				vanguardMarks: {
					title: 'Daily',
					type: 'vanguard-marks',
					label: 'Daily Vanguard Marks',
					progress: character.progressions[2033897742].dailyProgress,
					max: hashes.caps[2033897742]
				},
				crucibleMarks: {
					title: 'Daily',
					type: 'crucible-marks',
					label: 'Daily Crucible Marks',
					progress: character.progressions[2033897755].dailyProgress,
					max: hashes.caps[2033897755]
				}
			};

		}

		function mapActivities() {

			var nightfallHash,
				heroicHash,
				highestHeroicLevel = 0,
				heroicProgress = 0,
				heroicMax = 0;

			$.each(character.activities, function(hash, activity) {
				if(hashes.weeklyNightfalls[hash]) {
					nightfallHash = hash;
				} else if(hashes.weeklyHeroics[hash]){
					heroicMax += hashes.weeklyHeroics[hash].level;
					if(!heroicHash) {
						heroicHash = hash;
					}
					if(activity.isCompleted) {
						heroicProgress += hashes.weeklyHeroics[hash].level;
						if (hashes.weeklyHeroics[hash].level > highestHeroicLevel) {
							heroicHash = hash;
							highestHeroicLevel = hashes.weeklyHeroics[hash].level;
						}
					}
				}
			});

			character.boxes.weekly.activities = {};
			if(nightfallHash) {
				character.boxes.weekly.activities.nightfall = {
					title: hashes.weeklyNightfalls[nightfallHash],
					type: 'strike',
					label: 'Weekly Nightfall',
					progress: character.activities[nightfallHash].isCompleted? 1 : 0,
					max: 1,
					footer: 'Nightfall'
				};
			}
			if(heroicHash) {
				character.boxes.weekly.activities.heroic = {
					title: hashes.weeklyHeroics[heroicHash].name,
					type: 'strike',
					label: 'Weekly Heroic',
					progress: heroicProgress,
					max: heroicMax,
					footer: 'Heroic Level ' + hashes.weeklyHeroics[heroicHash].level
				};
			}
		}

		function mapFactions() {

			factions = [
				{hash: 529303302, name: 'Cryptarch'},
				{hash: 3233510749, name: 'Vanguard'},
				{hash: 1357277120, name: 'Crucible'},
				{hash: 2778795080, name: 'Dead Orbit'},
				{hash: 1424722124, name: 'Future War Cult'},
				{hash: 3871980777, name: 'New Monarchy'},
				{hash: 452808717, name: 'Queen'},
				{hash: 2161005788, name: 'Iron Banner'},
				{hash: 174528503, name: 'Eris Morn'}
			];

			$.each(factions, function(i, faction) {
				var hash = faction.hash;
				if(!character.progressions[hash]) {
					return;
				}
				var type = faction.name.toLowerCase().replace(/\s/g, '-');
				character.boxes.current.factions.push({
					title: 'Rank ' + (character.progressions[hash].level || 0),
					type: type,
					label: faction.name,
					progress: character.progressions[hash].progressToNextLevel,
					max: character.progressions[hash].nextLevelAt
				});
				character.boxes.weekly.factions.push({
					title: 'Weekly/Lifetime',
					type: type,
					label: faction.name,
					progress: character.progressions[hash].weeklyProgress,
					max: character.progressions[hash].currentProgress
				});
				character.boxes.daily.factions.push({
					title: 'Daily/Weekly',
					type: type,
					label: faction.name,
					progress: character.progressions[hash].dailyProgress,
					max: character.progressions[hash].weeklyProgress
				});
			});
		}

	}

	function getDateOfMostRecentDailyReset(date) {
		date = date || new Date();
		if(date.getUTCHours() < 9) {
			date.setUTCDate(date.getUTCDate() - 1);
		}
		date.setUTCHours(9);
		date.setUTCMinutes(0);
		date.setUTCSeconds(0);
		date.setUTCMilliseconds(0);
		return date;
	}

	function getDateOfMostRecentWeeklyReset(date) {
		date = date || new Date();
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

	function displayPlayerData() {
		if(!playerData.characters || !playerData.characters.length) {
			return;
		}
		for(var i=0; i<playerData.characters.length;i++) {
			displayCharacterData(playerData.characters[i]);
		}
	}

	function displayCharacterData(character) {
		var characterDate = new Date(character.dateLastPlayed),
			weeklyReset = getDateOfMostRecentWeeklyReset(characterDate),
			dailyReset = getDateOfMostRecentDailyReset(characterDate);

		displayCurrentCharacterData();
		displayWeeklyCharacterData();
		displayDailyCharacterData();

		function displayCurrentCharacterData() {
			var tab = tabs.find('.current'),
				container = $('<div/>').addClass('character-container').appendTo(tab);

			buildBox(character.boxes.current.light).appendTo(container);

			$('<div/>')
				.addClass('timestamp-header')
				.text('Last played on ' + moment(characterDate).format('dddd MMMM D, YYYY H:mm'))
				.appendTo(container);

			buildBox(character.boxes.current.motes).appendTo(container);

			$.each(character.boxes.current.currencies, function(i, val) {
				buildBox(val).appendTo(container);
			});

			$.each(character.boxes.current.factions, function(i, val) {
				buildBox(val).appendTo(container);
			});
		}

		function displayWeeklyCharacterData() {
			var tab = tabs.find('.weekly'),
				container = $('<div/>').addClass('character-container').appendTo(tab);

			buildBox(character.boxes.current.light).appendTo(container);

			$('<div/>')
				.addClass('timestamp-header')
				.text('Since weekly reset on ' + moment(weeklyReset).format('dddd MMMM D, YYYY H:mm'))
				.appendTo(container);

			buildBox(character.boxes.weekly.motes).appendTo(container);

			$.each(character.boxes.weekly.currencies, function(i, val) {
				buildBox(val).appendTo(container);
			});

			$.each(character.boxes.weekly.activities, function(i, val) {
				buildBox(val).appendTo(container);
			});

			$.each(character.boxes.weekly.factions, function(i, val) {
				buildBox(val).appendTo(container);
			});
		}

		function displayDailyCharacterData() {
			var tab = tabs.find('.daily'),
				container = $('<div/>').addClass('character-container').appendTo(tab);

			buildBox(character.boxes.current.light).appendTo(container);

			$('<div/>')
				.addClass('timestamp-header')
				.text('Since daily reset on ' + moment(dailyReset).format('dddd MMMM D, YYYY H:mm'))
				.appendTo(container);

			buildBox(character.boxes.daily.motes).appendTo(container);

			$.each(character.boxes.daily.currencies, function(i, val) {
				buildBox(val).appendTo(container);
			});

			$.each(character.boxes.daily.factions, function(i, val) {
				buildBox(val).appendTo(container);
			});
		}
	}

	function buildBox(data) {
		var box = $('<div/>')
				.addClass(data.isHeader? 'header-box' : 'progress-box')
				.addClass(data.type),
			icon = $('<div/>')
				.addClass('icon')
				.prop('title',data.label),
			progressbar = $('<div/>')
				.addClass('progress-bar')
				.height((data.percentToNextLevel || data.progress/data.max*100 || 0) + '%'),
			amount = $('<div/>')
				.addClass('amount')
				.text(data.footer || (data.progress + '/' + data.max)),
			title = $('<div/>')
				.addClass('title')
				.html(data.title);

		if(data.subtitle) {
			$('<div/>')
				.addClass('subtitle')
				.text(data.subtitle)
				.appendTo(box);
		}

		if(data.iconPath) {
			icon.css('background-image', 'url(' + data.iconPath + ')');
		}

		if(data.backgroundPath) {
			box.css('background-image', 'url(' + data.backgroundPath + ')');
		}

		if(data.progressColor) {
			progressbar.css('background-color', data.progressColor);
		}

		if(data.link) {
			box.css('cursor','pointer');
			box.on('click', function() {
				open(data.link, '_blank');
			});
		}

		return box.append(icon, title, amount, progressbar);
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

	function scrollToDiv(div) {
		var pos = div.offset();
		pos.top -= parseInt($('.header').css('height'));
		scrollTo(pos.left, pos.top);
	}

	function setupNavigation() {
		var coolStuffDiv = $('.cool-stuff'),
		aboutDiv = $('.about'),
		contactDiv = $('.contact'),
		contributingDiv = $('.contributing'),
		navpills = $('.nav-tabs li');

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
