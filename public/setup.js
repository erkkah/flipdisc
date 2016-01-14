<setup>
	<div class="uk-grid uk-grid-match uk-margin" data-uk-grid-match data-uk-grid-margin>
		<div class="uk-width-1-2">
			<div class="uk-panel uk-panel-box uk-panel-box-primary">
				<h3 class="uk-panel-title">Database backup</h3>
				Direct download links to database json files for backup:
				<ul class="uk-list uk-list-line">
					<li each={file, index in dbfiles}><i class="uk-icon-download"></i><a href={"/db/" + file} target="_blank" download> {file}</a></li>
				</ul>
			</div>
		</div>
		<div class="uk-width-1-2">
			<div class="uk-panel uk-panel-box uk-panel-box-primary">
				<h3 class="uk-panel-title">Font list</h3>
				<small>
					<i class="uk-icon-info-circle"></i>
					Fonts available in display script <q>drawText</q> and <q>getTextBitmap</q> functions.
				</small>
				<ul class="uk-list uk-list-lines">
					<li each={font, index in fonts}><i class="uk-icon-font"></i> {font}</li>
				</ul>
			</div>
		</div>
		<div class="uk-width-1-1">
			<div class="uk-panel uk-panel-box uk-panel-box-primary">
				<span class="uk-panel-title">Script log</span>
				<button class="uk-button uk-button-small" data-uk-button onchange={onLogChange}><i class="uk-icon-play-circle"></i></button>
				<p class="uk-form-help-block"><small><i class="uk-icon-info-circle"></i> Showing last 10 entries while logging is enabled</small></p>
				<div class="uk-scrollable-box">

<pre each={logEntries}><b>{timestamp}</b>:
{message}</pre>

				</div>
			</div>
		</div>
	</div>

	var self = this;
	self.socket = opts;

	self.dbfiles = [
		'config.json',
		'modes.json',
		'displayScripts.json',
		'dataFetchers.json'
	]

	self.logEntries = [];
	
	self.socket.on('log', function(message){
		while(self.logEntries.length >= 10){
			self.logEntries.shift();
		}
		self.logEntries.push(message);
		self.update();
	})

	self.socket.on('statuschanged', function(status){
		self.fonts = status.fonts;
		self.update();
	})

	self.logstate = false;

	onLogChange(event) {
		// UIKit magically adds class "uk-active" to checked buttons
		var logState = event.currentTarget.className.indexOf("uk-active") != -1;
		self.socket.emit("setlogstate", logState);
	}

</setup>
