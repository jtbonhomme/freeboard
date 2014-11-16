// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ F R E E B O A R D                                                  │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright © 2013 Jim Heising (https://github.com/jheising)         │ \\
// │ Copyright © 2013 Bug Labs, Inc. (http://buglabs.net)               │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                    │ \\
// └────────────────────────────────────────────────────────────────────┘ \\

(function () {

	var redmineDatasource = function (settings, updateCallback) {
		var self            = this;
		var updateTimer     = null;
		var requestURL      = "";
		var currentSettings = settings;
		var errorStage      = 0; 	// 0 = try standard request
		var lockErrorStage  = false;

		function updateRefresh(refreshTime) {
			if (updateTimer) {
				clearInterval(updateTimer);
			}

			updateTimer = setInterval(function () {
				self.updateNow();
			}, refreshTime);
		}

		updateRefresh(currentSettings.refresh * 1000);

		this.issues = {total_count: -1, issues: []};

		this.download = function (offset, updateCallback) {
			$.ajax({
				url: requestURL+"&offset=" + offset,
				dataType: "JSON",
				type: "GET",
				success: function (data) {
		            self.issues.total_count = data.total_count;
		            self.issues.issues = self.issues.issues.concat(data.issues);
		            var next_offset = self.issues.issues.length;
		            if (self.issues.issues.length < self.issues.total_count) {
		                self.download(next_offset, updateCallback);
		            }
		            else {
						lockErrorStage = true;
						updateCallback(self.issues);
		            }
				},
				error: function (xhr, status, error) {
					if (!lockErrorStage) {
						// TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
						errorStage++;
						self.updateNow();
					}
				}
			});
		}

		this.startDownload = function () {
			requestURL = currentSettings.host + 'issues.json?query_id=' + currentSettings.query+'&limit=100&key='+currentSettings.key;
      		self.download(0, updateCallback);
		}

		this.updateNow = function () {
			if (errorStage > 1)
			{
				return; // TODO: Report an error
			}
			self.startDownload();
		}

		this.onDispose = function () {
			clearInterval(updateTimer);
			updateTimer = null;
		}

		this.onSettingsChanged = function (newSettings) {
			lockErrorStage = false;
			errorStage = 0;

			currentSettings = newSettings;
			updateRefresh(currentSettings.refresh * 1000);
			self.updateNow();
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name: "Redmine Query",
		settings: [
			{
				name: "host",
				display_name: "Redmine host URL",
				type: "text"
			},
			{
				name: "query",
				display_name: "QueryId",
				type: "text"
			},
			{
				name: "key",
				display_name: "Secret Key",
				type: "text"
			},
			{
				name: "refresh",
				display_name: "Refresh Every",
				type: "number",
				suffix: "seconds",
				default_value: 5
			}
		],
		newInstance: function (settings, newInstanceCallback, updateCallback) {
			newInstanceCallback(new redmineDatasource(settings, updateCallback));
		}
	});
}());