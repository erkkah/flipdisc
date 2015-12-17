# flipdisc

Node.js based controller for an [Alfa Zeta](http://www.flipdots.com) Flip Disc (disc, dot..) display.
A display is made out of 14x28 dot XY panels put together in a rectangular shape. The display panels
are connected to a RS485 bus which is connected via a serial interface as accessed by the
[serialport](https://www.npmjs.com/package/serialport) library.

The controller fetches data from online resources and shows the data on the display using different
display scripts that perform basic animations and effects.

There is a web interface used to setup and program the controller. Configuration data is stored in
a simple file based json database.

### Getting started

First, edit the flipdisc.ini file to your liking, then install the dependencies, start the controller
and go to the web interface.

    npm install
    node main
