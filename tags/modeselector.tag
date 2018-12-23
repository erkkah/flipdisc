<modeselector>
	<div class="uk-panel uk-panel-box uk-clearfix">
		<form class="uk-form" onsubmit="{onSubmit}"><fieldset data-uk-margin>
			<legend>Select mode</legend>
			<div each={modes} class="uk-form-row uk-form-controls uk-form-controls-text uk-form-stacked">
				<label class="uk-form-label"><input type="radio" name="mode" id="{_id}" onchange="{onChange}" checked={_id == parent.config.selectedMode}> {name}</label>
				<small class="uk-form-help-inline">{description}</small>
			</div>
			<div if={modes.length == 0} class="uk-panel uk-panel-box">
			<small>No modes defined</small>
			</div>
		</fieldset></form>
	</div>

	var socket = opts;
	var self = this;

	socket.on('configchanged', function(newConfig){
		self.config = newConfig;
		self.update();
	});

	socket.on('modeschanged', function(modes){
		self.modes = modes;
		self.update();
	});

	this.modes = []

	onChange(e){
		self.config.selectedMode = e.currentTarget.id;
		socket.emit('setconfig', self.config);
	}

</modeselector>
