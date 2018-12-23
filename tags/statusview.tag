<statusview>
	<div class="uk-panel uk-panel-box">
		<h3 class="uk-panel-title">Status</h3>
		<ul>
			<li>Display: {status.display}</li>
			<li>Data fetcher: {status.dataFetcher ? "Running": "Stopped"}</li>
			<li>Animator: {status.animator ? "Running": "Stopped"}</li>
			<li>Message: {status.lastMessage}</li>
		</ul>
	</div>

	var self = this;
	self.socket = opts;
	self.socket.on('statuschanged', function(status){
		self.status = status;
		self.update();
	})

</statusview>