<modeselector>
	<div class="uk-panel uk-panel-box uk-clearfix">
		<form class="uk-form" onsubmit="{submit}"><fieldset data-uk-margin>
			<legend>Mode selector</legend>
			<div each={modes} class="uk-form-row uk-form-controls uk-form-controls-text uk-form-stacked">
				<label class="uk-form-label"><input type="radio" name="mode" checked={id == parent.selected}> {id}</label>
				<small class="uk-form-help-inline">{description}</small>
			</div>
			<button class="uk-button uk-float-right">OK</button>
		</fieldset></form>
	</div>

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

	this.selected = "visitor"

	submit(e){
		console.log(e);
		return false;
	}
</modeselector>
