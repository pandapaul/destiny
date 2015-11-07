$(function() {
	var eventButtons = $('.event-buttons'),
		coinsButton = eventButtons.find('.used-3oc-button'),
		noExoticButton = eventButtons.find('.no-exotic-button'),
		exoticDroppedButton = eventButtons.find('.exotic-dropped-button'),
		lastCoins = coinsButton.find('.last'),
		lastCoinsTimestamp,
		lastNoExotic = noExoticButton.find('.last'),
		lastNoExoticTimestamp,
		lastExoticDropped = exoticDroppedButton.find('.last'),
		lastExoticDroppedTimestamp,
		localLogEvents = $('.local-log-events'),
		zebraLog = false,
		events = {
			'3oc': 'Used 3oC',
			'noExotic': 'No drop',
			'exoticDropped': 'Exotic dropped'
		},
		sessionId;

	function submitEvent(type) {
		return $.ajax({
			url: '/3oc/logEvent',
			type: 'POST',
			data: JSON.stringify({
					eventType: type,
					sessionId: sessionId
				}),
			contentType: 'application/json; charset=utf-8',
			dataType: 'json'
		}).done(function (res) {
			sessionId = (res && res.sessionId) || sessionId;
		});
	}

	function setupButtonHandling() {
		coinsButton.on('click', function () {
			lastCoinsTimestamp = moment();
			updateTimestamps();
			localLog('3oc', lastCoinsTimestamp);
			submitEvent('3oc');
		});
		noExoticButton.on('click', function () {
			lastNoExoticTimestamp = moment();
			updateTimestamps();
			localLog('noExotic', lastNoExoticTimestamp);
			submitEvent('noExotic');
		});
		exoticDroppedButton.on('click', function () {
			lastExoticDroppedTimestamp = moment();
			updateTimestamps();
			localLog('exoticDropped', lastExoticDroppedTimestamp);
			submitEvent('exoticDropped');
		});
	}

	function localLog(eventType, timestamp) {
		var localLogItem = $('<div/>').text((events[eventType] || 'Unknown event') + ' at ' + timestamp.format('H:mm'));
		localLogItem.toggleClass('zebra', zebraLog);
		localLogItem.addClass(eventType);
		localLogItem.addClass('local-log-item');
		localLogItem.prependTo(localLogEvents);
		zebraLog = !zebraLog;
	}

	function updateTimestamps() {
		if (lastCoinsTimestamp) {
			lastCoins.text(lastCoinsTimestamp.fromNow());
		}
		if (lastNoExoticTimestamp) {
			lastNoExotic.text(lastNoExoticTimestamp.fromNow());
		}
		if (lastExoticDroppedTimestamp) {
			lastExoticDropped.text(lastExoticDroppedTimestamp.fromNow());
		}
	}

	function startUpdatingTimestamps() {
		setInterval(updateTimestamps, 10000);
	}

	setupButtonHandling();
	startUpdatingTimestamps();

});
