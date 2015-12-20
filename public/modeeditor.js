<modeeditor>
	<div class="uk-panel uk-panel-box uk-margin">
		<div class="uk-grid uk-grid-match" data-uk-grid-match>
			<form class="uk-form uk-form-stacked uk-width-1-2">
				<legend>Display Modes</legend>
				<div class="uk-form-row">
					<select size=4 class="uk-form-width-medium" onchange="{onChange}">
						<option each={modes} selected={id == parent.selected}>{id}</option>
					</select>
					<div class="uk-button-group">
						<button class="uk-button uk-button-small" onclick="{onEdit}"><i class="uk-icon-edit"></i></button>
						<button class="uk-button uk-button-small" onclick="{onDelete}"><i class="uk-icon-trash"></i></button>
					</div>
				</div>
				<div class="uk-form-row">
					<input type="text" class="uk-form-width-medium" placeholder="New mode" id="newModeText">
					<button class="uk-button uk-button-small" onclick="{onAdd}"><i class="uk-icon-plus"></i></button>
				</div>
			</form>
			<div class="uk-width-1-2">
				<div class="uk-alert">
					<h3>Mode: {selected}</h3>
					{selectedDescription}
				</div>
			</div>
		</div>
	</div>

	<modedetails></modedetails>

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

	this.selectedIndex = 1
	this.selected = "visitor"
	this.selectedDescription = "tjolahopp"

	this.on('update', function(){
		for(var i in this.modes){
			var mode = this.modes[i]

			if(mode.id == this.selected){
				this.selectedDescription = mode.description
				this.selectedIndex = i
				break
			}
		}
	})

	onEdit(event){
		var self = this;
		UIkit.modal.prompt("Rename mode", "hej", function(name){

		});
	}

	onDelete(event){
		var self = this;
		UIkit.modal.confirm("Delete mode?", function(){
			if(self.selectedIndex != -1){
				self.modes.splice(self.selectedIndex, 1)
				self.update()
			}
		})
	}

	onAdd(event){
		var newModeText = document.getElementById('newModeText')

		this.modes.push({
			"id": newModeText.value,
			"description": ""
		})

		return false;
	}

	onChange(event){
		this.selected = this.modes[event.target.selectedIndex].id
		this.update()
	}
</modeeditor>

<modedetails>
	<div class="uk-panel uk-panel-box">
		<div class="uk-grid">
			<form class="uk-form uk-form-stacked uk-width-1-1">
				<legend>Mode configuration</legend>
				<div class="uk-form-row">
					<label class="uk-form-label" for="form_desc">Description</label>
					<input type="text" class="uk-width-1-1" placeholder="description" id="form_desc" value={description}>
				</div>
				<div class="uk-form-row">
					<label class="uk-form-label" for="form_mode_config">Display scripts</label>
					<p class="uk-form-help-block"><small><i class="uk-icon-info-circle"></i> Drag to reorder script configurations</small></p>
					<ul class="uk-sortable uk-grid uk-grid-width-1-1" data-uk-grid-margin data-uk-sortable id="form_mode_config">
						<li each={displayScripts}>
							<div class="uk-panel uk-panel-box">
								<div class="uk-flex uk-flex-space-between">
									<div class="uk-text-truncate">
										<i class="uk-sortable-handle uk-icon uk-icon-bars uk-margin-small-right"></i>
										<strong>{ID}</strong>
										<code>{code}</code>
									</div>
									<div class="uk-button-group">
										<button class="uk-button uk-button-small" onclick="{onEdit}" data-uk-modal="\{target:'#config-dialog', bgclose:false\}"><i class="uk-icon-edit"></i></button>
										<button class="uk-button uk-button-small"><i class="uk-icon-trash"></i></button>
									</div>
								</div>
							</div>
						</li>
					</ul>
				</div>
				<div class="uk-form-row">
					<p class="uk-form-help-block"><small><i class="uk-icon-info-circle"></i> Add new scripts here</small></p>
					<select>
						<option>Pacman</option>
						<option selected>Text scrollerama</option>
					</select>
					<button class="uk-button uk-button-small"><i class="uk-icon-plus"></i></button>
					<button class="uk-float-right uk-button uk-button-small"><i class="uk-icon-save"></i> Save</button>
				</div>
			</form>
		</div>
	</div>

	<div id="config-dialog" class="uk-modal">
		<div class="uk-modal-dialog">
        	<a class="uk-modal-close uk-close"></a>
        	<div class="uk-modal-header">Edit config</div>
        	<div id="config-editor" style="height:200px;">config</div>
        	<div class="uk-modal-footer uk-text-right">
        		<button class="uk-button">Cancel</button>
        		<button class="uk-button uk-button-primary">OK</button>
        	</div>
    	</div>
	</div>

this.displayScripts = [
{
	"ID": "Text scrollerama",
	"code": `
{
	"text": "Hejsan",
	"kalle": "svejsan",
	"list": ["a", "little", "list"]
}
`
},
{
	"ID": "Pacman",
	"code": '{"speed": 22}'
}
]

onEdit(){
	var editor = ace.edit("config-editor");
	editor.getSession().setMode("ace/mode/json");
	return false;
}

</modedetails>
