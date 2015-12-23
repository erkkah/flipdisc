<scripteditor>
	<div class="uk-panel uk-panel-box uk-margin">
		<div class="uk-grid uk-grid-match" data-uk-grid-match>
			<form class="uk-form uk-form-stacked uk-width-1-2" id="scriptform">
				<legend>Display Scripts</legend>
				<div class="uk-form-row">
					<select size=4 class="uk-form-width-medium" id="scriptlist" onchange="{onChange}">
						<option each={scripts} selected={_id == parent.selectedId}>{name}</option>
					</select>
					<div class="uk-button-group">
						<button class="uk-button uk-button-small" onclick="{onEdit}" id="editbutton"><i class="uk-icon-edit"></i></button>
						<button class="uk-button uk-button-small" onclick="{onDelete}" id="deletebutton"><i class="uk-icon-trash"></i></button>
					</div>
				</div>
				<div class="uk-form-row">
					<input type="text" class="uk-form-width-medium" placeholder="New script" id="newScriptText">
					<button class="uk-button uk-button-small" onclick="{onAdd}"><i class="uk-icon-plus"></i></button>
				</div>
			</form>
			<div class="uk-width-1-2">
				<div class="uk-alert">
					<h3>Script: {selectedName}</h3>
				</div>
			</div>
		</div>
	</div>

	<scriptdetails selected_id="{selectedId}"></scriptdetails>

	var self = this;
	self.socket = opts;

	self.socket.on('scriptschanged', function(scripts){
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

		var disabled = self.tags.scriptdetails.dirty;
		scriptlist.disabled = disabled;
		deletebutton.disabled = disabled;
		editbutton.disabled = disabled;
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
				self.socket.emit('setscript', current, function(err){
					if(err){
						UIkit.modal.alert('Failed to rename script:' + err);
					}
				});
			});
		}
	}

	onDelete(event){
		if(self.selectedId){
			UIkit.modal.confirm("Delete script '" + self.selectedName + "'?", function(){
				self.socket.emit('deletescript', self.selectedId, function(err){
					if(err){
						UIkit.modal.alert('Failed to delete script:' + err);
					}
				});
			});
		}
		return false;
	}

	onAdd(event){
		var newScriptText = document.getElementById('newScriptText')

		var newScript = {
			name: newScriptText.value,
			code: 'code = {\n' + 
				'	onSetup: function(configuration, dataSource){\n' +
				'		// set properties of this animation script\n' +
 				'		// pull data from data source\n' +
 				'		// set up animation\n' +
 				'	},\n' +
 				'	onFrame: function(oldFrame, timePassedInSeconds, frameCallback){\n' +
				'		// calculate one frame of animation\n' +
				'		// ...\n' +
				'		// call frameCallback with updated frame data and ms to next callback\n' +
				'		// Providing no callback time ends the script.\n' +
				'		//\n' +
				'		// frameCallback(updatedFrame, 1000);\n' +
				'	 	}\n' +
				'	};\n'
		};
		self.socket.emit('setscript', newScript, function(err){
			if(err){
				UIkit.modal.alert('Failed to create new script:', err);
			}
		});

		return false;
	}

	onChange(event){
		this.selectedId = this.scripts[event.target.selectedIndex]._id;
		this.update();
		// ??? Needed?
		//this.tags.scriptdetails.update();
	}
</scripteditor>

<scriptdetails>
	<div class="uk-panel uk-panel-box">
		<div show={currentScript._id} class="uk-grid">
			<form class="uk-form uk-form-stacked uk-width-1-1">
				<legend>{"Code" + (dirty ? " *": "")}</legend>
				<div class="uk-form-row">
					<div id="code-editor" style="height:300px;"></div>
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
			self.editor = ace.edit("code-editor");
			self.editor.$blockScrolling = Infinity;
			self.editor.getSession().setMode("ace/mode/javascript");
			self.editor.getSession().on('change', function(e){
				if(!self.blockDirtyNotifications){
					console.log('Editor changed!', e)
					self.dirty = true;
					self.parent.update();
				}
			});
		}catch(er){
			console.log("Editor init problem:" + er);
		}
	});
	
	self.socket.on('scriptschanged', function(newScripts){
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
			self.socket.emit('setscript', self.currentScript, function(err, result){
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
