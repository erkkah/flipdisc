var SerialPort = require('serialport').SerialPort;

var port = new SerialPort('/dev/ttyAMA0', {
		baudRate: 57600,
		parity: 'none',
		stopBits: 1,
		dataBits: 8
	}, false);

port.open(function(error) {
	if(error){
		console.log('failed to open: ' + error);
	}
	else {
		console.log('opened port');
		runTests(port);
	}
});


function runTests(serial) {
	var header = [0x80];
	var end = [0x8F];

	var command = 0x83;
	var address = 0;
	var line = 0x80;

	setInterval(function(){
		line >>= 1;
		if(line == 0){
			line = 0x40;
			address ^= 1;
		}

		var data = [];
		for(i = 0; i < 28; i++){
			data[i] = line;
		}

		var message = header.concat(command, address, data, end);
		var buffer = new Buffer(message);

		serial.write(buffer, function(error){
			if(error){ console.log('failed to send data') }
				port.drain(function(){
					//console.log('data sent');
				});
		});
   }, 100);
}
