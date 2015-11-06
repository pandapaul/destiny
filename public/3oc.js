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
			submitEvent('3oc').done(function (res) {
				lastCoinsTimestamp = moment();
				updateTimestamps();
			});
		});
		noExoticButton.on('click', function () {
			submitEvent('noExotic').done(function (res) {
				lastNoExoticTimestamp = moment();
				updateTimestamps();
			});
		});
		exoticDroppedButton.on('click', function () {
			submitEvent('exoticDropped').done(function (res) {
				lastExoticDroppedTimestamp = moment();
				updateTimestamps();
			});
		});
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
