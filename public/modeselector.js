<modeselector>
	<div class="uk-panel uk-panel-box uk-clearfix">
		<form class="uk-form" onsubmit="{onSubmit}"><fieldset data-uk-margin>
			<legend>Mode selector</legend>
			<div each={modes} class="uk-form-row uk-form-controls uk-form-controls-text uk-form-stacked">
				<label class="uk-form-label"><input type="radio" name="mode" id="{id}" onchange="{onChange}" checked={id == parent.config.selectedMode}> {id}</label>
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

	socket.on('modeschange', function(modes){
		self.modes = modes;
		self.update();
	});

	this.modes = [
		{
			"id": "black",
			"description": "Just.. black"
		},
		{
			"id": "visitor",
			"description": "Safe for visitors"
		},
		{
			"id": "company",
			"description": "Internal - not safe for visitors"
		}
	]

	onChange(e){
		self.config.selectedMode = e.currentTarget.id;
	}

	onSubmit(e){
		socket.emit('setconfig', self.config);
		return false;
	}
</modeselector>
