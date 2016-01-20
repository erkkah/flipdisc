<modeeditor>
	<div class="uk-panel uk-panel-box uk-margin">
		<div class="uk-grid uk-grid-match" data-uk-grid-match>
			<form class="uk-form uk-form-stacked uk-width-1-2">
				<legend>Display Modes</legend>
				<div class="uk-form-row">
					<select size=6 class="uk-form-width-medium" onchange="{onChange}" id="modeslist">
						<option each={modes} selected={_id == parent.selectedId}>{name}</option>
					</select>
					<div class="uk-button-group">
						<button class="uk-button uk-button-small" onclick="{onEdit}" id="editbutton"><i class="uk-icon-edit"></i></button>
						<button class="uk-button uk-button-small" onclick="{onCopy}" id="copybutton"><i class="uk-icon-copy"></i></button>
						<button class="uk-button uk-button-small" onclick="{onDelete}" id="deletebutton"><i class="uk-icon-trash"></i></button>
					</div>
				</div>
				<div class="uk-form-row">
					<input type="text" class="uk-form-width-medium" placeholder="New mode" id="newModeText">
					<button class="uk-button uk-button-small" onclick="{onAdd}"><i class="uk-icon-plus"></i></button>
				</div>
			</form>
			<div class="uk-width-1-2 uk-hidden-small">
				<div class="uk-panel uk-panel-box uk-panel-box-primary">
					<yield/>
				</div>
			</div>
		</div>
	</div>

	<modedetails selected_id="{selectedId}"></modedetails>

	var self = this;
	self.socket = opts;

	self.socket.on('modeschanged', function(modes){
		self.modes = modes;
		self.update();
	});

	self.modes = []

	self.selectedId = undefined
	self.selectedDescription = ""

	self.on('update', function(){
		for(var i in self.modes){
			var mode = self.modes[i]

			if(self.selectedId == undefined){
				self.selectedId = mode._id;
			}

			if(mode._id == self.selectedId){
				self.selectedName = mode.name;
				self.selectedDescription = mode.description;
				break
			}
		}

		var disabled = self.tags.modedetails.dirty;
		self.modeslist.disabled = disabled;
		self.deletebutton.disabled = disabled;
		self.copybutton.disabled = disabled;
		self.editbutton.disabled = disabled;
	})

	findModeById(wantedId){
		var matching = self.modes.reduce(function(previous, current){
			if(current._id == wantedId){
				return previous.concat(current);
			}
			else {
				return previous;
			}
		}, []);

		return matching.empty ? undefined : matching[0];
	}

	onEdit(event){
		if(self.selectedId){
			UIkit.modal.prompt("Rename mode", self.selectedName, function(newName){
				var current = self.findModeById(self.selectedId);
				current.name = newName;
				self.socket.emit('setmode', current, function(err){
					if(err){
						UIkit.modal.alert('Failed to rename mode: ' + err);
					}
				});
			});
		}
	}

	onCopy(event){
		if(self.selectedId){
			var current = self.findModeById(self.selectedId);
			var copy = Object.assign({}, current);
			copy.name += " copy"
			delete copy._id;
			self.socket.emit('setmode', copy, function(err){
				if(err){
					UIkit.modal.alert('Failed to duplicate mode: ' + err);
				}
			});
		}
	}	

	onDelete(event){
		if(self.selectedId){
			UIkit.modal.confirm("Delete mode '" + self.selectedName + "'?", function(){
				self.socket.emit('deletemode', self.selectedId);
			});
		}
		return false;
	}

	onAdd(event){
		var newModeText = document.getElementById('newModeText')

		var newMode = {
			"name": newModeText.value,
			"description": "",
			"scripts": []
		};
		self.socket.emit('setmode', newMode, function(err){
			if(err){
				UIkit.modal.alert('Failed to add new mode: ' + err);
			}
		});

		return false;
	}

	onChange(event){
		self.selectedId = self.modes[event.target.selectedIndex]._id
		self.update()
	}
</modeeditor>

<modedetails>
	<div class="uk-panel uk-panel-box">
		<div class="uk-grid">
			<form class="uk-form uk-form-stacked uk-width-1-1">
				<legend>{"Mode configuration" + (dirty ? " *" : "")}</legend>
				<div class="uk-form-row">
					<label class="uk-form-label" for="form_desc">Description</label>
					<input type="text" class="uk-width-1-1" placeholder="description" id="form_desc" value={currentMode.description} onchange={onDescriptionChange}>
				</div>
				<div class="uk-form-row">
					<label class="uk-form-label" for="form_mode_config">Display scripts</label>
					<p class="uk-form-help-block"><small><i class="uk-icon-info-circle"></i> Drag to reorder script configurations</small></p>
					<ul class="uk-sortable uk-grid uk-grid-width-1-1 uk-grid-small" data-uk-grid-margin data-uk-sortable id="form_mode_config">
						<li each={script, index in currentScripts} data-order={index + 100}>
							<div class="uk-panel uk-panel-box uk-padding-vertical-remove">
								<div class="uk-flex uk-flex-space-between">
									<div class="uk-text-truncate">
										<i class="uk-sortable-handle uk-icon uk-icon-bars uk-margin-small-right"></i>
										<strong>{script.name}</strong>
										<code>{script.config}</code>
									</div>
									<div class="uk-button-group">
										<button class="uk-button uk-button-small" targetscript={script._id} onclick={onEditConfig} data-uk-modal="\{target:'#config-dialog', bgclose:false\}"><i class="uk-icon-edit"></i></button>
										<button class="uk-button uk-button-small" onclick={onCopy}><i class="uk-icon-copy"></i></button>
										<button class="uk-button uk-button-small" onclick={onDelete}><i class="uk-icon-trash"></i></button>
									</div>
								</div>
							</div>
						</li>
					</ul>
					<div class="uk-panel uk-panel-box" if={currentScripts.length == 0}>
						<small>No scripts</small>
					</div>
				</div>
				<div class="uk-form-row">
					<p class="uk-form-help-block"><small><i class="uk-icon-info-circle"></i> Add new scripts here</small></p>
					<select class="uk-form-width-medium" id="allscriptslist">
						<option each={allScripts}>{name}</option>
					</select>
					<button class="uk-button uk-button-small" onclick={onAdd}><i class="uk-icon-plus"></i></button>
					<div class="uk-float-right">
						<button class="uk-button uk-button-small" onclick={onRevert}><i class="uk-icon-recycle"></i> Revert</button>
						<button class="uk-button uk-button-small" onclick={onSave}><i class="uk-icon-save"></i> Save</button>
					</div>
				</div>
			</form>
		</div>
	</div>

	<div id="config-dialog" class="uk-modal">
		<div class="uk-modal-dialog">
        	<a class="uk-modal-close uk-close"></a>
        	<div class="uk-modal-header">Edit config</div>
        	<div id="config-editor" style="height:250px;">config</div>
        	<div class="uk-modal-footer uk-text-right">
        		<button class="uk-button uk-modal-close">Cancel</button>
        		<button class="uk-button uk-button-primary uk-modal-close" onclick={onSaveConfig}>OK</button>
        	</div>
    	</div>
	</div>

	var self = this;
	self.socket = parent.socket;
	self.currentMode = null;
	self.currentScripts = [];
	self.allScripts = [];
	self.dirty = false;

	self.socket.on('scriptschanged', function(newScripts){
		self.allScripts = newScripts;
		self.update();
	});

	self.on('mount', function(){
		self.configEditor = ace.edit("config-editor");
		self.configEditor.$blockScrolling = Infinity;
		self.configEditor.getSession().setMode("ace/mode/json");

		var sortable = UIkit.sortable(self.form_mode_config);
		sortable.on('stop.uk.sortable', function(event, object, dragged, action){
			// collect order after dragging
			var newOrder = [];
			sortable.find('>li').each(function(){
				var order = $(this).data('order');
				newOrder.push(order);
			})

			// build reordered list of scripts
			var reordered = [];
			for(var index = 0; index < newOrder.length; index++){
				// remember to subtract 100, since we added 100 in html above to avoid
				// auto removal of "falsy" attributes
				newIndex = newOrder[index] - 100;
				reordered.push(self.currentScripts[newIndex]);
			}

			self.dirty = true;

			// Force an update of an empty array first before
			// updating with the reordered array. This is needed
			// since Riot is clever and diffs the changed array to
			// its virtual DOM to figure out what diffs to push to
			// the real DOM. However, UIKit has already changed the
			// real DOM, which makes the result really confusing.
			//
			// Changing to the empty array forces a complete rebuild
			// instead of clever diffing, and avoids the problem.
			// Hacketi-hack..
			self.currentScripts = [];
			self.update();
			self.currentScripts = reordered;
			self.parent.update();
		});
	})

	self.on('update', function(){
		if(!self.dirty){
			self.draggableOrder = 0;
			self.currentScripts = [];
			var current = self.parent.findModeById(opts.selected_id);
			if(current && self.allScripts.length){
				self.currentMode = Object.assign({}, current);
				// Get name from list of all scripts
				self.currentScripts = self.currentMode.scripts.map(function(scriptReference){
					var script = self.allScripts.find(function(el){
						return (el._id == scriptReference.scriptID);
					});
					scriptReference.name = script.name;
					return scriptReference;
				});
			}
		}
	})

	onDescriptionChange(e){
		self.dirty = true;
		self.parent.update();
	}

	onEditConfig(e){
		self.editedItem = e.item.script;
		self.configEditor.setValue(self.editedItem.config, -1);
		return false;
	}

	onSaveConfig(e){
		self.editedItem.config = self.configEditor.getValue();
		self.editedItem = null;
		self.dirty = true;
		self.parent.update();
	}

	onAdd(){
		var list = self.allscriptslist;
		var script = self.allScripts[list.selectedIndex];
		var newScript = {
			scriptID: script._id,
			name: script.name,
			config: "{}"
		}
		self.currentScripts.push(newScript);
		self.dirty = true;
		self.parent.update();
		return false;
	}

	onCopy(e){
		var current = self.currentScripts[e.item.index];
		var copy = Object.assign({}, current);
		self.currentScripts.splice(e.item.index, 0, copy);
		self.dirty = true;
		self.parent.update();
	}

	onDelete(e){
		self.currentScripts.splice(e.item.index, 1);
		self.dirty = true;
		self.parent.update();

		return false;
	}

	onRevert(){
		self.dirty = false;
		self.parent.update();
		return false;
	}

	onSave(){
		self.currentMode.description = self.form_desc.value;
		self.currentMode.scripts = self.currentScripts;
		self.socket.emit('setmode', self.currentMode, function(err){
			if(err){
				UIkit.modal.alert('Failed to save mode:' + err);
			}
			else {
				self.dirty = false;
				self.parent.update();
			}
		})
		return false;
	}

</modedetails>
