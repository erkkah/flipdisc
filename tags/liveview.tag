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
		<div class="uk-margin">
			<canvas if={useCanvas} name="livedisplay" width={width} height={height}/>
			<div if={!useCanvas} id="display"></div>
		</div>
	</div>

	<style>
		div#display {
			background-color: #000;
		}

		div.pixel {
			float: left;
			background-color: #111111;
			margin: 1px;
			border-radius: 100%;
			border-width: 1px;
			border-color: #444;
			border-style: solid;
			perspective: 2px;
			transform: rotate3d(1, 1, 0, 20deg);
			transition-property: background-color, transform;
			transition-duration: 0.25s, 0.5s;
			transition-timing-function: steps(1, end), linear;
		}

		div.pixel.set {
			background-color: #FFF;
			transform: rotate3d(1, 1, 0, 160deg);
		}
	</style>


	var self = this;
	self.socket = opts;
	self.useCanvas = true;

	var dotSize = 11;
	var border = 10;

	function updateDimensions(width, height){
		if(width != self.displayWidth || height != self.displayHeight){
			self.displayWidth = width;
			self.displayHeight = height;
			self.width = width * dotSize + border * 2
			self.height = height * dotSize + border * 2
			self.frame = new Array(width * height).fill(0);
			self.update();
		}
	}

	// Set initial dimensions
	updateDimensions(1, 1);


	/// Canvas implementation

	drawDisplayToCanvas() {
		// Draw live display
		var ctx = self.livedisplay.getContext('2d');

		var padding = 1;
		var halfDot = dotSize / 2;
		var radius = halfDot - padding;

		ctx.clearRect(0, 0, self.livedisplay.width, self.livedisplay.height);

		ctx.beginPath();
		ctx.rect(0, 0, self.livedisplay.width, self.livedisplay.height);
		ctx.fillStyle = 'black';
		ctx.fill();
		ctx.closePath();

		ctx.lineWidth = 0.2;
		ctx.strokeStyle = "#888888";
		try {
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
					ctx.stroke();
					ctx.closePath();
				}
			}
		}
		catch(error){
			console.log("Exception while drawing: " + error);
		}
	}

	/// CSS/DOM implementation

	drawDisplayUsingCSS() {
		if(self.frame.length == self.CSSpixels.length){
			for(var i = self.frame.length - 1; i >= 0; i--){
				var white = self.frame[i];
				var pixelClasses = self.CSSpixels[i].classList;
				if(white){
					pixelClasses.add('set');
				}
				else{
					pixelClasses.remove('set');
				}
			}
		}
	}

	function setupDisplay(){
		if(!self.useCanvas){
			var display = document.getElementById('display');

			while(display.firstChild){
				display.removeChild(display.firstChild);
			}

			// Canvas width includes border, css content box does not
			display.style.width = self.width - 2 * border + "px";
			display.style.height = self.height - 2 * border + "px";
			display.style.padding = border + "px";

			self.CSSpixels = [];

			var numDots = self.displayWidth * self.displayHeight;
			for(var i = 0; i < numDots; i++){
				var child = document.createElement("div");
				self.CSSpixels.push(child);
				child.classList.add("pixel");
				// border == 0.2px and margin == 1px in style
				// reduce dotSize by 2 * margin + 2 * border
				var padding = 2 + 2 * 1;
				var pixelSize = (dotSize - padding) + "px";
				child.style.width = pixelSize;
				child.style.height = pixelSize;
				display.appendChild(child);
			}
		}
	}

	function requestRedraw(){
		if(!document.hidden){
			if(self.useCanvas){
				window.requestAnimationFrame(self.drawDisplayToCanvas);
			}
			else {
				self.drawDisplayUsingCSS();
			}
		}
	}

	// Draw _after_ ('updated') tag is updated and the canvas is reallocated
	self.on('updated', function(){
		setupDisplay();
		requestRedraw();
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
			requestRedraw();
		}
	})

</liveview>
