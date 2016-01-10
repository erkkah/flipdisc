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
	<div class="uk-panel uk-panel-box">
		<div class="uk-panel-badge uk-badge">Not Really Live!</div>
		<h3 class="uk-panel-title">Live view</h3>
		<canvas id="livedisplay" width={width} height={height}/>
	</div>

	var self = this;
	self.socket = opts;

	var width = 56
	var height = 14
	var dotSize = 12
	var border = 10
	self.width = width * dotSize + border * 2
	self.height = height * dotSize + border * 2
	self.frame = new Array(width * height).fill(0);

	self.on('update', function(){
		var ctx = livedisplay.getContext('2d');
		ctx.beginPath();

		ctx.rect(0, 0, livedisplay.width, livedisplay.height);
		ctx.fillStyle = 'black';
		ctx.fill();
		ctx.closePath();

		var padding = 1;
		var halfDot = dotSize / 2;
		var radius = halfDot - padding;

		for(var x = 0; x < width; x++){
			for(var y = 0; y < height; y++){
				var idx = y * width + x;
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

	var decoder = new arraypacker.Decoder();

	self.socket.on('frame', function(frame){
		decoder.decode(frame, function(error, result){
			if(!error){
				self.frame = result;
				self.update();
			}
		})

	})

</liveview>
