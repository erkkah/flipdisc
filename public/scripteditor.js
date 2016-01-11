<scripteditor>
	<div class="uk-panel uk-panel-box uk-margin">
		<div class="uk-grid uk-grid-match" data-uk-grid-match>
			<form class="uk-form uk-form-stacked uk-width-1-2">
				<legend>{opts.title}</legend>
				<div class="uk-form-row">
					<select size=6 class="uk-form-width-medium" id="scriptlist" onchange="{onChange}" disabled={tags.scriptdetails.dirty}>
						<option each={scripts} selected={_id == parent.selectedId}>{name}</option>
					</select>
					<div class="uk-button-group">
						<button class="uk-button uk-button-small" onclick="{onEdit}" id="editbutton"><i class="uk-icon-edit"></i></button>
						<button class="uk-button uk-button-small" onclick="{onCopy}" id="copybutton"><i class="uk-icon-copy"></i></button>
						<button class="uk-button uk-button-small" onclick="{onDelete}" id="deletebutton"><i class="uk-icon-trash"></i></button>
					</div>
				</div>
				<div class="uk-form-row">
					<input type="text" class="uk-form-width-medium" placeholder="New script" id="newscripttext">
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

	<scriptdetails selected_id={selectedId} events={opts.events}></scriptdetails>

	var self = this;
	self.socket = opts.socket;

	self.socket.on(opts.events.update, function(scripts){
		self.scripts = scripts;
		self.update();
	});

	self.scripts = []

	self.selectedId = undefined

	self.on('update', function(){
		for(var i in self.scripts){
			var script = self.scripts[i]

			if(self.selectedId == undefined){
				self.selectedId = script._id;
			}

			if(script._id == self.selectedId){
				self.selectedName = script.name;
				break
			}
		}
	})

	findScriptById(wantedId){
		var matching = self.scripts.reduce(function(previous, current){
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
			UIkit.modal.prompt("Rename script", self.selectedName, function(newName){
				var current = self.findScriptById(self.selectedId);
				current.name = newName;
				self.socket.emit(opts.events.set, current, function(err){
					if(err){
						UIkit.modal.alert('Failed to rename script:' + err);
					}
				});
			});
		}
	}

	onCopy(event){
		if(self.selectedId){
			var current = self.findScriptById(self.selectedId);
			var copy = Object.assign({}, current);
			copy.name += " copy";
			delete copy._id;
			self.socket.emit(opts.events.set, copy, function(err){
				if(err){
					UIkit.modal.alert('Failed to duplicate script:' + err);
				}
			});
		}
	}

	onDelete(event){
		if(self.selectedId){
			UIkit.modal.confirm("Delete script '" + self.selectedName + "'?", function(){
				self.socket.emit(opts.events.delete, self.selectedId, function(err){
					if(err){
						UIkit.modal.alert('Failed to delete script:' + err);
					}
				});
			});
		}
		return false;
	}

	onAdd(event){
		var scriptName = $('#newscripttext', self.root).val();
		var newScript = {
			name: scriptName,
			code: opts.template
		};
		self.socket.emit(opts.events.set, newScript, function(err){
			if(err){
				UIkit.modal.alert('Failed to create new script:', err);
			}
		});

		return false;
	}

	onChange(event){
		this.selectedId = this.scripts[event.target.selectedIndex]._id;
		this.update();
	}
</scripteditor>

<scriptdetails>
	<div class="uk-panel uk-panel-box">
		<div show={currentScript._id} class="uk-grid">
			<form class="uk-form uk-form-stacked uk-width-1-1">
				<legend>{"Code" + (dirty ? " *": "")}</legend>
				<div class="uk-form-row">
					<div id="code_editor" style="height:300px;"></div>
				</div>
				<div class="uk-form-row">
					<div class="uk-float-right">
						<button class="uk-button uk-button-small" onclick={onRevert}><i class="uk-icon-recycle"></i> Revert</button>
						<button class="uk-button uk-button-small" onclick={onSave}><i class="uk-icon-save"></i> Save</button>
					</div>
				</div>
			</form>
		</div>
	</div>

	var self = this;
	self.socket = parent.socket;
	self.dirty = false;
	self.blockDirtyNotifications = false;

	self.on('mount', function(){
		try{
			var code_editor = $('#code_editor', self.root).get(0);
			self.editor = ace.edit(code_editor);
			self.editor.$blockScrolling = Infinity;
			self.editor.getSession().setMode("ace/mode/javascript");
			self.editor.getSession().setOption("useWorker", false);
			self.editor.getSession().on('change', function(e){
				if(!self.blockDirtyNotifications){
					self.dirty = true;
					self.parent.update();
				}
			});
		}catch(er){
			console.log("Editor init problem:" + er);
		}
	});
	
	self.socket.on(opts.events.update, function(newScripts){
		if(self.dirty){
			if(newScripts.find(function(script){
				// Match currently edited script, if it differs
				return (script._id == self.currentScript._id) && (script.code != self.currentScript.code);
			})){
				UIkit.modal.alert('Heads-up, script was changed while you were editing!');
			}
		}
		self.update();
	});

	self.on('update', function(){
		var current = self.parent.findScriptById(opts.selected_id);
		if(!self.dirty){
			self.currentScript = {};
			if(current){
				// Clone script object to allow local editing
				Object.assign(self.currentScript, current);
			}
			// Notifications on setters... :|
			self.blockDirtyNotifications = true;
			self.editor.setValue(self.currentScript.code || "", -1);
			self.blockDirtyNotifications = false;
		}
	});

	onSave(e){
		if(self.dirty){
			self.currentScript.code = self.editor.getValue();
			self.socket.emit(opts.events.set, self.currentScript, function(err, result){
				if(err){
					UIkit.modal.alert('Failed to save script:' + err);
				}
				else {
					self.dirty = false;
					self.parent.update();
				}
			});
		}
		return false;
	}

	onRevert(e){
		// Notifications on setters... :|
		self.blockDirtyNotifications = true;
		self.editor.setValue(self.currentScript.code, -1);
		self.dirty = false;
		self.blockDirtyNotifications = false;
		self.parent.update();
	}

</scriptdetails>
