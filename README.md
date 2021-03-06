# flipdisc

<img src="./preview.png"/>

"flipdisc" is a Node.js based controller for an [Alfa Zeta](http://www.flipdots.com) Flip Disc (disc, dot..)
based display. These displays are made out of 14x28 dot XY panels put together in a rectangular shape.
The display panels are connected to a RS485 bus which is connected via a serial interface as accessed by the
[serialport](https://www.npmjs.com/package/serialport) library. Only the two-controller panel version
is supported, where each 14x28 unit is driven by two separately addressable controllers, driving
7x28 dots each.

The controller can fetch data from online resources and show the data on the display using a set of
display scripts that perform basic animations and effects.

There is a web interface used to setup and program the controller. The web interface has a live view function,
that mirrors what is currently being shown on the actual display.
The controller can be run without a physical display for testing and development.
Configuration data is stored in a simple file based json database.

## Prerequisites

The only prerequisite in addition to the hardware is a recent (8+) Node.js installation with
the ability to build native modules. (Version v1.0 should still run on Node.js 4.x.)

The web interface is developed on Chrome, but should work on other sane modern browsers.

*Remember to disable serial console on Linux!*

## Getting started

First, edit the flipdisc.ini file to your liking, then install the dependencies, start the controller
and go to the web interface.

    npm install
    npm start

## Using the controller

OK, so a bit more details might be needed.

### flipdisc.ini

The `flipdisc.ini` config file sets up the basics to get up and running:

* Web interface port
* Serial port and baud rate - set port to 'NONE' for testing
* Display configuration - number of panels and orientation
* Database root
* Data fetcher update frequency
* Optional basic auth password

When the web interface is reachable, and the serial port opens without errors, the
rest can be done from a browser.

### Web interface and main components

The controller has a set of modes that it can operate in. Switching modes is done manually.
You could for example have one mode that shows secret information at a company, and a
"visitor" mode that is turned on when there are externals visiting.

The main controller components look roughly like this:

<img src="http://yuml.me/diagram/scruffy/class/[Controller]<-.-notifies[State], [Controller]<&gt;-&gt;[Data Fetcher], [Controller]<&gt;-&gt;[Animator], [Animator]reads-&gt;[Data Source], [Data Fetcher]updates-&gt;[Data Source], [Animator]-&gt;[Display driver], [note:Runs in a separate process {bg:cornsilk}]-.-[Data Fetcher], [Web Interface]<-.-&gt;[State], [Controller]notifies-.-&gt;[Web Interface{bg:orange}]"/>


The complete setup of modes, data fetchers, et.c. is stored in the central State and backed on disk.
The data pulled from online sources (or created from scratch) for later display is stored in the "Data Source".

Both the Animator and the Data Fetcher are configured/programmed by writing small scripts in ES6:ish Javascript
using the web interface.

#### Modes

Each mode defines a list of Display Script references. That list is repeatedly run through by the Animator
while the mode is active. A Display Script reference is a Display Script plus a simple JSON config.

#### Display Scripts

Display Scripts are responsible for writing to the display, they do all the dot flipping.
They use the JSON config as defined in the modes list and optionally reads data from the Data Source.

A Display Script runs indefinitely or for a set time, producing new frames for the display.
It can either replace the contents of the display completely or modify what is currently
being shown on the display, as a transition of other effect.

##### Writing Display Scripts

Display scripts must define a global variable `code` that contains the class implementation.
The class must define the methods `onSetup(configuration, dataSource)` and
`onFrame(oldFrame, timePassedInSeconds)`. The `onSetup` method is called each
time the animator reaches a Display Script in the mode list, to prepare for an animation
sequence. After that, the `onFrame` method is called repeatedly to update the display.
To update the display, modify the bitmap passed in `oldFrame`. Return the milliseconds
to the next call to `onFrame`. Returning zero will tell the animator to move on to the
next script in the mode list.

Example:

```javascript
var code = class{
    constructor(){
    }

    onSetup(configuration, dataSource){
        this.color = configuration.color || 0;
    }

    onFrame(oldFrame, timePassedInSeconds){
        // Just draw one frame
        oldFrame.fill(this.color);
        return 0;
    }
};
```

The frames passed to `onFrame` are MonoBitmap instances.

Example MonoBitmap usage:

```javascript
// Create a new bitmap and draw something
var bmp = new MonoBitmap(width, height);
bmp.fill(0).drawLine(0, 0, width - 1, height - 1);
bmp.putPixel(3, 3, 1);

// Draw the new bitmap to the frame
oldFrame.drawBitmap(bmp, 0, 0);

// In this case, you could of course simply draw directly to the
// frame instead! It's just an example :)
```

The following properties are available in the global scope for Display Scripts:

* console - Console instance for debugging. Writes to stdout and log in the "Advanced tab".
* width - Width of the display in dots
* height - Height of the display in dots
* MonoBitmap - Bitmap class for drawing to the display
* drawText(bmp, x, y, text, font) - Draws text to a MonoBitmap
* getTextBitmap(text, font) - Returns a MonoBitmap containing the complete text

#### Data Scripts

Data Scripts are responsible for updating the Data Source with fresh data
for Display Scripts to consume. The result from a Data Script is stored
using its name as key. For example `dataSource.foo` accesses the result
from the 'foo' Data Script.

You can also use the data source `resolve(path)` method to dig into the object
hierarchy using a dot separated path. Calling `dataSource.resolve("foo.splat.balonkas")`
equals accessing `dataSource.foo.splat.balonkas`, except that error checking is
done while traversing and null is returned if a subpath is missing.

Using `resolve(path)` is also useful for resolving object paths specified
in Display Script configurations.

##### Writing Data Scripts

Data Scripts must define a global variable `code` that contains the class implementation.
The class must define the method `onUpdate(callback)` that will be called every update
interval.

The `onUpdate(callback)` implementation can be either sync or async depending on the need.
For sync operation, just return a non-null value, and that will be used as the result.
If nothing is returned, the callback must be called with `(error, result)` some time
later to store a result.

Using both patterns (both returning and calling the callback) yields unpredictable results
and will cause a warning.

Sync example:

```javascript
var code = class {
    constructor() {
        this.msg = "Hejsan";
    }

    onUpdate(callback) {
        return this.msg;
    }
};
```

Async example:

```javascript
var code = class {
    constructor() {
    }

    onUpdate(callback) {
        someAsyncOperation(function(error, result){
            callback(error, result);
        });
    }
};
```

You can also start an updater timer using `setTimeout` in the constructor and then
providing sync access to the data produced using `onUpdate`.

*NOTE: The Data Fetcher running the Data Scripts runs in a separate process. All data returned
by Data Scripts is serialized to JSON and back before being put into the Data Source.*
