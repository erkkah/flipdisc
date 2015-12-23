<modeselector>
	<div class="uk-panel uk-panel-box uk-clearfix">
		<form class="uk-form" onsubmit="{onSubmit}"><fieldset data-uk-margin>
			<legend>Mode selector</legend>
			<div each={modes} class="uk-form-row uk-form-controls uk-form-controls-text uk-form-stacked">
				<label class="uk-form-label"><input type="radio" name="mode" id="{_id}" onchange="{onChange}" checked={_id == parent.config.selectedMode}> {name}</label>
				<small class="uk-form-help-inline">{description}</small>
			</div>
			<button class="uk-button uk-float-right">OK</button>
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
	}

	onSubmit(e){
		socket.emit('setconfig', self.config);
		return false;
	}
</modeselector>
