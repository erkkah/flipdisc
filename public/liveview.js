<liveview>
	<div class="uk-panel uk-panel-box">
		<h3 class="uk-panel-title">Status</h3>
		<ul>
			<li>Display: {status.running ? "Running": "Stopped"}</li>
			<li>Data fetcher: {status.dataFetcher ? "Running": "Stopped"}</li>
			<li>Animator: {status.animator ? "Running": "Stopped"}</li>
			<li>Message: {status.lastMessage}</li>
		</ul>
	</div>
	<div class="uk-panel uk-panel-box">
		<div class="uk-panel-badge uk-badge">Live!</div>
		<h3 class="uk-panel-title">Live view</h3>
		[live updated pic of display]
	</div>

	var self = this;
	self.socket = opts;

	self.socket.on('statuschanged', function(status){
		self.status = status;
		self.update();
	})

</liveview>
