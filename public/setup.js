<setup>
	<div class="uk-panel uk-panel-box uk-panel-box-primary">
		<h3 class="uk-panel-title">Setup</h3>
		Nothing to see here. Go to server and edit the "flipdisc.ini" file.
	</div>
	<div class="uk-panel uk-panel-box uk-panel-box-primary">
		<h3 class="uk-panel-title">Database backup</h3>
		Direct download links to database json files for backup:
		<ul class="uk-list uk-list-line">
			<li each={file, index in files}><i class="uk-icon-download"></i><a href={"/db/" + file} target="_blank" download> {file}</a></li>
		</ul>
	</div>

	this.files = [
	'config.json',
	'modes.json',
	'displayScripts.json',
	'dataFetchers.json'
	]
</setup>
