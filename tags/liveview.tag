<liveview>
	<div class="uk-panel uk-panel-box">
		<h3 class="uk-panel-title">Status</h3>
		<ul>
			<li>Display: {status.display}</li>
			<li>Data fetcher: {status.dataFetcher ? "Running": "Stopped"}</li>
			<li>Animator: {status.animator ? "Running": "Stopped"}</li>
			<li>Message: {status.lastMessage}</li>
		</ul>
	</div>

	<div class="uk-panel uk-panel-box uk-hidden-small">
		<h3 class="uk-panel-title">Live view</h3>
		<div class="uk-margin"><canvas name="livedisplay" width={width} height={height}/></div>
	</div>

	var self = this;
	self.socket = opts;

	var dotSize = 11
	var border = 10

	function updateDimensions(width, height){
		if(width != self.displayWidth || height != self.displayHeight){
			self.displayWidth = width;
			self.displayHeight = height;
			self.width = width * dotSize + border * 2
			self.height = height * dotSize + border * 2
			self.frame = new Array(width * height).fill(0);
		}
	}

	// Set initial dimensions
	updateDimensions(1, 1);

	drawDisplayBackground(ctx){
		ctx.beginPath();
		ctx.rect(0, 0, self.livedisplay.width, self.livedisplay.height);
		ctx.fillStyle = 'black';
		ctx.fill();
		ctx.closePath();		
	}

	self.on('update', function(){
		// Draw live display
		var ctx = self.livedisplay.getContext('2d');

		var padding = 1;
		var halfDot = dotSize / 2;
		var radius = halfDot - padding;
		self.drawDisplayBackground(ctx);

		for(var x = 0; x < self.displayWidth; x++){
			for(var y = 0; y < self.displayHeight; y++){
				var idx = y * self.displayWidth + x;
				var white = self.frame[idx];
				ctx.beginPath();
				var arcX = x * dotSize + halfDot + border;
				var arcY = y * dotSize + halfDot + border;
				ctx.arc(arcX, arcY, radius, 0, 2 * Math.PI, false);
				ctx.fillStyle = white ? 'white' : '#111111';
				ctx.fill();
				ctx.lineWidth = 0.2;
				ctx.strokeStyle = "#888888";
				ctx.stroke();
				ctx.closePath();
			}
		}
	});

	self.socket.on('statuschanged', function(status){
		self.status = status;
		self.update();
	})

	// live frames are arraypacker encoded
	var arraypacker = require('../lib/arraypacker');
	var decoder = new arraypacker.Decoder();

	self.socket.on('frame', function(packed){
		// Simple optimization, don't redraw equal frames
		if(!self.lastPacked || self.lastPacked.some(function(item, index){
			return item != packed[index];
		})) {
			self.lastPacked = packed;
			var result = decoder.decode(packed);
			updateDimensions(decoder.width, decoder.height);
			self.frame = result;
			self.update();
		}
	})

</liveview>
