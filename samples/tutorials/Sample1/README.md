# Tutorial 1: Drawing with pointing devices

In this tutorial, you will learn how to use WILL SDK to draw strokes in an HTML canvas element that are produced by the pointer input of the user. 
The tutorial is divided into the following parts:

* [Part 1: Setting up the ink engine](#part-1-setting-up-the-ink-engine)
* [Part 2: Building paths from pointer input](#part-2-building-paths-from-pointer-input)
* [Part 3: Smoothing paths](#part-3-smoothing-paths)
* [Part 4: Drawing preliminary paths](#part-4-drawing-preliminary-paths)
* [Part 5: Drawing semi-transparent strokes](#part-5-drawing-semi-transparent-strokes)
* [Part 6: Using a particle brush](#part-6-using-a-particle-brush)
* [Part 7: Generating a Bezier path](#part-7-generating-a-bezier-path)

Each part builds on the previous part, extending and improving its functionality.

## Prerequisites

You will need WILL SDK to complete this tutorial. 
For more information see Getting started with WILL SDK for Web.

## Source code

You can find the sample project in the following location:

```HTML and JavaScript: /web/tutorials/Sample1```

---
---
## Part 1: Setting up the ink engine

WILL SDK provides a 2D drawing engine that focuses primarily on inking. 
The central class of the engine is *Module.InkCanvas*, which relies on the WebGL API and is a factory for creating other layers. 
To use WILL SDK, your browser must support WebGL.

When the web page loads, it creates an instance of ```WebGLRenderingContext``` and associates it with an HTML ```<canvas>``` element. 
The ```Module``` namespace contains a ```canvas``` property (ypu can change the default value if required) that is initialized by the init function with the canvas element. 
The ```WebGLRenderingContext``` interface is accessible through the global variable *GLctx*.

In Part 1 of this tutorial, you will set up the rendering environment and draw a stroke on the canvas.

### Step 1: Configure an HTML file to include the engine

Add the drawing engine to an HTML page as follows:

```html
<head>
    <script type="text/javascript" src="Module.js"></script>
    <script async type="text/javascript" src="WacomInkEngine.js"></script>
</head>
```

The key information is as follows:

* The ```Module``` namespace contains the core functionality for the Wacom ink engine.
* You must configure the ```Module``` namespace before the engine loads because the engine relies on the namespace. 
  For example, to load successfully, the engine requires the ```canvas``` property in the ```Module``` namespace.
* The ```Module.addPostScript``` method loads when the engine is ready. It takes a function as a parameter. You can use this method to extend the functionality of the engine.

### Step 2: Configure the HTML file to include additional tools

These tutorials use the following additional tools:

* jQuery: For more information about this framework, see jQuery and jQuery api.
* js.ext: This library extends some generic functionality to ensure cross-browser compatibility. 
  This tutorial does not discuss its contents.
  
Add jQuery and js.ext to the HTML page as follows:

```html
<head>
    <script type="text/javascript" src="jquery.min.js"></script>
    <script type="text/javascript" src="js.ext.js"></script>
</head>
```

**Note:** Other useful libraries are *Module.RectTools* and *Module.GLTools*. 
These libraries are integrated in the drawing engine.

### Step 3: Specify an identifier for the WebGL resource

You can create WebGL resources through the ink engine, and these resources have identifiers. 
You can also use resources that were already created. 
However, WebGL resources created from the WebGL context do not have identifiers by default. 
A resource must have a valid identifier if you want to use the resource with WILL SDK.

* The ```createTexture``` method in the ```Module.GLTools``` namespace creates a texture. 
  This texture is completed with the *wrapMode* parameter *GLctx.CLAMP_TO_EDGE* and the *sampleMode* parameter *GLctx.NEAREST*, which you can override later. 
  The ```Module.GLTools.createTexture(wrapMode, sampleMode)``` method allows you to specify the *wrapMode* and *sampleMode* values.

**Note:** You can also manage your own WebGL resources outside of the engine. 
However, this topic is not covered in this tutorial.

### Step 4: Configure WILL

Perform basic configuration of WILL, as follows:

```javascript
var WILL = {
    backgroundColor: Module.Color.WHITE,
    color: Module.Color.from(204, 204, 204),

    init: function(width, height) {
        this.canvas = new Module.InkCanvas(document.getElementById("canvas"), width, height);
        this.canvas.clear(this.backgroundColor);

        this.brush = new Module.DirectBrush();

        this.pathBuilder = new Module.SpeedPathBuilder();
        this.pathBuilder.setNormalizationConfig(182, 3547);
        this.pathBuilder.setPropertyConfig(Module.PropertyName.Width, 2.05, 34.53, 0.72, NaN, Module.PropertyFunction.Power, 1.19, false);

        this.strokeRenderer = new Module.StrokeRenderer(this.canvas, this.canvas);
        this.strokeRenderer.configure({brush: this.brush, color: this.color});
    },

    draw: function() {
        var points = [0,300,10, 100,100,20, 400,100,40, 500,300,50];
        var path = this.pathBuilder.createPath(points);

        this.strokeRenderer.draw(path, true);
    }
};

Module.addPostScript(function() {
    WILL.init(1600, 600);
    WILL.draw();
});
```

This configuration is used as a basis in subsequent tutorials and tutorial parts.

### View sample

* View sample

The configuration in this sample result shows the following:

* A WILL namespace with the ```backgroundColor``` property and ```init``` method. 
  When the engine is ready, ```init``` should be executed.
* The ```backgroundColor``` property is of type *Module.Color*. 
  The color channels should be normalized in the range [0, 1].
  * **Note:** You could also use the ```Module.Color.from(red, green, blue, alpha = 1)``` method, which accepts color channel parameters in the range [0, 255] and alpha channel parameters in the range [0, 1].
* ```WILL.init(width, height);```: The parameters describe the width and height of the canvas. 
  The parameters are handled by the engine and declared explicitly.
* ```this.canvas```: Represents the *Module.InkCanvas* class, which acts as a wrapper around the HTML canvas element. This is where the drawing is rendered. To change the size of the canvas, use the resize method of the Module.InkCanvas class.
* ```this.brush```: An instance of *Module.DirectBrush*. 
  A brush determines how a stroke will be rendered. In this case, the simplest option is used: a solid color brush.
* ```this.pathBuilder```: An instance of *Module.SpeedPathBuilder*. A path builder is responsible for stroke building. It keeps track of the input data. In this case, it is configured to produce paths with variable widths depending on the speed.
* ```this.strokeRenderer```: An instance of *Module.StrokeRenderer*. 
  The second parameter in the constructor is optional and defines the behavior. For simplicity, set this parameter to canvas to draw directly over the canvas. This setting is convenient when drawing temporary data. This class can be used in different ways, and in later parts of this tutorial you will see other possible uses.
* The ```draw``` method renders a stroke from static path data. 
  The ```points``` array defines four points, each with three fields (determined by ```this.pathBuilder.stride```):X, Y, and Width. 
  These are the control points of the drawn Catmull-Rom spline. 
  The ```this.strokeRenderer.draw``` method requires a path in the *Module.Path* format. 
  The ```createPath``` method is a convenient way to provide data of this type.

---
---
## Part 2: Building paths from pointer input

In Part 2 of this tutorial, you will build a path from the pointer input and draw it as a stroke in the drawing layer.

This process is logically divided into three phases, which are described by the ```Module.InputPhase``` class:

* Begin
* Move
* End

You must perform two fundamental steps in each phase:

* Build a path from the current user input. 
  To do this, call the ```buildPath``` method from example. 
  For more detailed information, see the example code below.
* Render the partial path that was created in step 1. 
  To do this, use the ```drawPath``` method. This occurs for every input.

The input event is used to create a partial path. 
Then, the partial path is added to the existing path. 
Separating the path construction in this way gives you flexibility to process partial paths (for example, to smooth the control values) before adding them to the existing path. 
For more information about the path building process, see *Generating ink content*.

### Step 1: Extend initialization and attach input events

Attaching the input events is not WILL dependent but the purpose of this step is to introduce the *Module.PressurePathBuilder*. 
When we have browser support for pressure usage we could take advantage of this path builder.

```javascript
    ...

    if (window.PointerEvent) {
        this.pressurePathBuilder = new Module.PressurePathBuilder();
        this.pressurePathBuilder.setNormalizationConfig(0.195, 0.88);
        this.pressurePathBuilder.setPropertyConfig(Module.PropertyName.Width, 2.05, 34.53, 0.72, NaN, Module.PropertyFunction.Power, 1.19, false);
    }

    ...
```
    
Currently pointer events are still not wide supported. 
Microsoft and Mozilla already have implemented them. 
Google works over them. 
Example code provides helper method to achieve the pressure. 
Probably when the integration of this functionality in browser completes it should be updated.

```javascript
    getPressure: function(e) {
        return (e instanceof PointerEvent && e.pressure !== 0.5)?e.pressure:NaN;
    },
```
Currently there is no way to detect is the pointer device provides pressure. Mouse and touch input provides value 0.5 as pressure.

### Step 2: Define a beginStroke function to start building the stroke

Define a ```beginStroke``` function that does the following:

* Initialize the stroke building process by setting the ```inputPhase``` property to *Module.InputPhase.Begin*.
* Initialize current input ```pressure``` and select proper path builder.
* Call the ```buildPath``` method with the first of the user input points. 
  The result is a reference to an instance of ```Module.PathContext```. 
  This instance refers to the full path (all input points up to the current moment) with the ```getPath``` method and to the partial path (new points added from the last input) with the getPathPart method. 
  The result of both methods is a ```Module.Path``` object.
* Render the ```pathPart``` object on screen by calling the ```strokeRenderer.draw`` method.

This code is as follows:

```javascript
    beginStroke: function(e) {
        if (["mousedown", "mouseup"].contains(e.type) && e.button != 0) return;

        this.inputPhase = Module.InputPhase.Begin;
        this.pressure = this.getPressure(e);
        this.pathBuilder = isNaN(this.pressure)?this.speedPathBuilder:this.pressurePathBuilder;

        this.buildPath({x: e.clientX, y: e.clientY});
        this.drawPath();
    },
```
    
### Step 3: Define a ```moveStroke``` function to add to the stroke
Define a ```moveStroke``` function that does the following:

* Set the ```inputPhase``` property to *Module.InputPhase.Move*.
* Update the input ```pressure```.
* Build on the stroke as the user moves the pointer over the drawing canvas.

**Note:** In the example code below, path building and drawing is performed on every frame (per 16 ms), rather than for each input sample. 
You can achieve this downsampling by calling the ```requestAnimationFrame``` method of ```Module.InkCanvas``` instance. 
We recommend you set the downsampling because correct rendering happens at a rate of 60 frames per second.
This code is as follows:

```javascript
    moveStroke: function(e) {
        if (!this.inputPhase) return;

        this.inputPhase = Module.InputPhase.Move;
        this.pointerPos = {x: e.clientX, y: e.clientY};
        this.pressure = this.getPressure(e);

        if (WILL.frameID != WILL.canvas.frameID) {
            var self = this;

            WILL.frameID = WILL.canvas.requestAnimationFrame(function() {
                if (self.inputPhase && self.inputPhase == Module.InputPhase.Move) {
                    self.buildPath(self.pointerPos);
                    self.drawPath();
                }
            }, true);
        }
    }
```
    
### Step 4: Define an ```endStroke``` function to finish the stroke

Define an ```endStroke``` function that does the following:

* Finish the stroke building process by setting the inputPhase property to Module.InputPhase.End.
* Update the input ```pressure```.
* Remove the ```inputPhase```.

This code is as follows:

```javascript
    endStroke: function(e) {
        if (!this.inputPhase) return;

        this.inputPhase = Module.InputPhase.End;
        this.pressure = this.getPressure(e);

        this.buildPath({x: e.clientX, y: e.clientY});
        this.drawPath();

        delete this.inputPhase;
    },
```
    
The completed code for this part of the tutorial is as follows:

```javascript
var WILL = {
    backgroundColor: Module.Color.WHITE,
    color: Module.Color.from(204, 204, 204),

    init: function(width, height) {
        this.initInkEngine(width, height);
        this.initEvents();
    },

    initInkEngine: function(width, height) {
        this.canvas = new Module.InkCanvas(document.getElementById("canvas"), width, height);
        this.canvas.clear(this.backgroundColor);

        this.brush = new Module.DirectBrush();

        this.speedPathBuilder = new Module.SpeedPathBuilder();
        this.speedPathBuilder.setNormalizationConfig(182, 3547);
        this.speedPathBuilder.setPropertyConfig(Module.PropertyName.Width, 2.05, 34.53, 0.72, NaN, Module.PropertyFunction.Power, 1.19, false);

        if (window.PointerEvent) {
            this.pressurePathBuilder = new Module.PressurePathBuilder();
            this.pressurePathBuilder.setNormalizationConfig(0.195, 0.88);
            this.pressurePathBuilder.setPropertyConfig(Module.PropertyName.Width, 2.05, 34.53, 0.72, NaN, Module.PropertyFunction.Power, 1.19, false);
        }

        this.strokeRenderer = new Module.StrokeRenderer(this.canvas, this.canvas);
        this.strokeRenderer.configure({brush: this.brush, color: this.color});
    },

    initEvents: function() {
        var self = this;

        if (window.PointerEvent) {
            Module.canvas.addEventListener("pointerdown", function(e) {self.beginStroke(e);});
            Module.canvas.addEventListener("pointermove", function(e) {self.moveStroke(e);});
            document.addEventListener("pointerup", function(e) {self.endStroke(e);});
        }
        else {
            Module.canvas.addEventListener("mousedown", function(e) {self.beginStroke(e);});
            Module.canvas.addEventListener("mousemove", function(e) {self.moveStroke(e);});
            document.addEventListener("mouseup", function(e) {self.endStroke(e);});

            if (window.TouchEvent) {
                Module.canvas.addEventListener("touchstart", function(e) {self.beginStroke(e);});
                Module.canvas.addEventListener("touchmove", function(e) {self.moveStroke(e);});
                document.addEventListener("touchend", function(e) {self.endStroke(e);});
            }
        }
    },

    getPressure: function(e) {
        return (window.PointerEvent && e instanceof PointerEvent && e.pressure !== 0.5)?e.pressure:NaN;
    },

    beginStroke: function(e) {
        if (["mousedown", "mouseup"].contains(e.type) && e.button != 0) return;
        if (e.changedTouches) e = e.changedTouches[0];

        this.inputPhase = Module.InputPhase.Begin;
        this.pressure = this.getPressure(e);
        this.pathBuilder = isNaN(this.pressure)?this.speedPathBuilder:this.pressurePathBuilder;

        this.buildPath({x: e.clientX, y: e.clientY});
        this.drawPath();
    },

    moveStroke: function(e) {
        if (!this.inputPhase) return;
        if (e.changedTouches) e = e.changedTouches[0];

        this.inputPhase = Module.InputPhase.Move;
        this.pointerPos = {x: e.clientX, y: e.clientY};
        this.pressure = this.getPressure(e);

        if (WILL.frameID != WILL.canvas.frameID) {
            var self = this;

            WILL.frameID = WILL.canvas.requestAnimationFrame(function() {
                if (self.inputPhase && self.inputPhase == Module.InputPhase.Move) {
                    self.buildPath(self.pointerPos);
                    self.drawPath();
                }
            }, true);
        }
    },

    endStroke: function(e) {
        if (!this.inputPhase) return;
        if (e.changedTouches) e = e.changedTouches[0];

        this.inputPhase = Module.InputPhase.End;
        this.pressure = this.getPressure(e);

        this.buildPath({x: e.clientX, y: e.clientY});
        this.drawPath();

        delete this.inputPhase;
    },

    buildPath: function(pos) {
        var pathBuilderValue = isNaN(this.pressure)?Date.now() / 1000:this.pressure;

        var pathPart = this.pathBuilder.addPoint(this.inputPhase, pos, pathBuilderValue);
        var pathContext = this.pathBuilder.addPathPart(pathPart);

        this.pathPart = pathContext.getPathPart();
    },

    drawPath: function() {
        this.strokeRenderer.draw(this.pathPart, this.inputPhase == Module.InputPhase.End);
    },

    clear: function() {
        this.canvas.clear(this.backgroundColor);
    }
};

Module.addPostScript(function() {
    WILL.init(1600, 600);
});
```

### View sample

You might notice that the strokes look jagged. 
In Part 3, you will resolve this issue by implementing smoothing.

---
---
## Part 3: Smoothing paths

In Part 3 of this tutorial, you will use the *Module.MultiChannelSmoothener* class to smooth the path built in Part 2.

The WILL SDK *Smoothing* module smooths data sequences that are stored in one or more channels using a technique based on double exponential smoothing. 
The result of the smoothing operation depends on the most recent sequence values.

### Step 1. Add a ```smoothener``` property to the ```initInkEngine``` method

Extend the engine's configuration by adding a ```smoothener``` property to the ```initInkEngine``` method, and initialize the property with an instance of the ```Module.MultiChannelSmoothener``` class. 

To make this change, add the following code:

```javascript
this.smoothener = new Module.MultiChannelSmoothener(this.pathBuilder.stride);
```

### Step 2. Update the ```buildPath``` method to reset the smoothener when a new stroke begins

Update the ```buildPath``` method so that when a new stroke begins, the ```reset``` method is called for the this.smoothener instance. 
To make this change, add the following code:

```javascript
if (this.inputPhase == Module.InputPhase.Begin)
    this.smoothener.reset();
```

### Step 3. Smooth path parts

In the ```buildPath``` method, perform smoothing by calling the ```smooth``` method with the ```pathPart``` object returned by the ```addPoint``` method, as follows:

```javascript
buildPath: function(pos) {
    if (this.inputPhase == Module.InputPhase.Begin)
        this.smoothener.reset();

    var pathPart = this.pathBuilder.addPoint(this.inputPhase, pos, Date.now()/1000);
    var smoothedPathPart = this.smoothener.smooth(pathPart, this.inputPhase == Module.InputPhase.End);
    var pathContext = this.pathBuilder.addPathPart(smoothedPathPart);

    this.pathPart = pathContext.getPathPart();
},
```

The completed code for this part of the tutorial is as follows:

```javascript
var WILL = {
    ...

    init: function(width, height) {...},

    initInkEngine: function(width, height) {
        ...

        this.smoothener = new Module.MultiChannelSmoothener(this.pathBuilder.stride);

        ...
    },

    initEvents: function() {...},
    beginStroke: function(e) {...},
    moveStroke: function(e) {...},
    endStroke: function(e) {...},

    buildPath: function(pos) {
        if (this.inputPhase == Module.InputPhase.Begin)
            this.smoothener.reset();

        var pathPart = this.pathBuilder.addPoint(this.inputPhase, pos, Date.now()/1000);
        var smoothedPathPart = this.smoothener.smooth(pathPart, this.inputPhase == Module.InputPhase.End);
        var pathContext = this.pathBuilder.addPathPart(smoothedPathPart);

        this.pathPart = pathContext.getPathPart();
    },

    drawPath: function() {...},
    clear: function() {...}
};

Module.addPostScript(function() {...});
```

**Note:** For the sake of clarity, method implementations from earlier in this tutorial are replaced with ... in the example code above.

### View sample

* View complete source code
* View sample

After implementing these changes, the strokes look much smoother. 
However, you might notice that the strokes lag behind the input. 
This is an inevitable result of the smoothing process because there is a delay while the smoothing determines the slope of the stroke trajectory. 
Another issue is that the starting and ending parts of the stroke are cut off. 
In Part 4, you will learn how to resolve these issues.

---
---
## Part 4: Drawing preliminary paths

There is a lag in stroke generation while the smoothing algorithm smooths the partial paths of a stroke.

In Part 4 of this tutorial, you will draw preliminary stroke curves (that is, curves from the last path point to the current location of the pointer) to neutralize any lag in the stroke generation. 
Since the preliminary path is a prediction for the trajectory of the real path and can prove wrong, especially if the stroke makes a sharp turn, you will display the preliminary path temporarily and discard it later.

### Step 1. Add a second layer to store completed strokes

Extend the path building process to add a second layer called ```strokesLayer```, as follows:

```javascript
initInkEngine: function(width, height) {
    this.canvas = new Module.InkCanvas(document.getElementById("canvas"), width, height);
    this.strokesLayer = this.canvas.createLayer();

    this.clear();

    this.brush = new Module.DirectBrush();

    this.pathBuilder = new Module.SpeedPathBuilder();
    this.pathBuilder.setNormalizationConfig(182, 3547);
    this.pathBuilder.setPropertyConfig(Module.PropertyName.Width, 2.05, 34.53, 0.72, NaN, Module.PropertyFunction.Power, 1.19, false);

    this.smoothener = new Module.MultiChannelSmoothener(this.pathBuilder.stride);

    this.strokeRenderer = new Module.StrokeRenderer(this.canvas, this.strokesLayer);
    this.strokeRenderer.configure({brush: this.brush, color: this.color});
},
```
### Step 2: Blend the existing strokes to the canvas

Draw the current part of the stroke in the ```strokesLayer``` object, then blend it to the ```canvas``` object so it can be rendered on the screen.

### Step 3. Draw the preliminary path directly on the canvas

Draw the preliminary path directly on the canvas. 
Use the ```pathBuilder.createPreliminaryPath``` method to create a preliminary path, then smooth it with the ```smoothener.smooth(preliminaryPathPart, true)``` method.

To indicate that the smoothing should finish, call the ```smooth``` method with its ```finish``` parameter set to true.

Pass the smoothed part to the ```finishPreliminaryPath``` method, which returns the completed preliminary path.

```javascript
buildPath: function(pos) {
    if (this.inputPhase == Module.InputPhase.Begin)
        this.smoothener.reset();

    var pathPart = this.pathBuilder.addPoint(this.inputPhase, pos, Date.now()/1000);
    var smoothedPathPart = this.smoothener.smooth(pathPart, this.inputPhase == Module.InputPhase.End);
    var pathContext = this.pathBuilder.addPathPart(smoothedPathPart);

    this.pathPart = pathContext.getPathPart();

    if (this.inputPhase == Module.InputPhase.Move) {
        var preliminaryPathPart = this.pathBuilder.createPreliminaryPath();
        var preliminarySmoothedPathPart = this.smoothener.smooth(preliminaryPathPart, true);

        this.preliminaryPathPart = this.pathBuilder.finishPreliminaryPath(preliminarySmoothedPathPart);
    }
},
```

**Note:** As mentioned in Part 1, the second parameter of the ```strokeRenderer``` class specifies different behaviors. 
In this example, the second parameter is set to strokesLayer, which means that completed strokes are stored in the strokesLayer instance. 
However, preliminary curves are drawn on the canvas (since the preliminary curves are temporary data and you do not want to store them permanently). 
The ```strokeRenderer.blendUpdatedArea``` method copies the contents of strokesLayer into the canvas for the purpose of generating preliminary paths. 
Drawing the preliminary path directly on the canvas is convenient for this example, but other strategies are also possible.

### Step 4. Add a round cap to the start and end of strokes

In the previous example, strokes had cut-off start and end parts. 
To resolve this, you will round the ends of the stroke.

Add a round beginning cap to the first drawing segment (you can do this for either the preliminary or the actual segment), then add a round ending cap for each preliminary curve and for the ending of the actual stroke. 
The ```strokeRenderer``` class contains a method to add caps to strokes.

For example, to add a round beginning cap to the first drawing segment and to each preliminary curve, you can add the following code to the ```beginStroke``` and ```drawPoint``` functions:

```javascript
this.strokeRenderer.draw(this.pathPart, false)
```
To add a round ending cap to the end of the stroke, you can add the following code to the ```endStroke``` function:

```javascript
this.strokeRenderer.draw(this.pathPart, true)
```

### Step 5. Change the color of the preliminary curve

Change the color of the preliminary curve to emphasize it.

**Note:** In a real application, the color of the preliminary curve will probably be the same as the color of the stroke. 
For this tutorial, choose a noticeably different color to highlight the preliminary curve.

### Step 5. Recompose view for completed stroke bounds

```javascript
    this.canvas.clear(this.strokeRenderer.strokeBounds, this.backgroundColor);
    this.canvas.blend(this.strokesLayer, {rect: this.strokeRenderer.strokeBounds});
```

**Note:** Note that recomposition starts from the beginning, the updated area is cleared, than blending should happens.

The completed code for this part of the tutorial is as follows:

```javascript
var WILL = {
    ...

    init: function(width, height) {...},

    initInkEngine: function(width, height) {
        ...

        this.strokesLayer = this.canvas.createLayer();

        this.strokeRenderer = new Module.StrokeRenderer(this.canvas, this.strokesLayer);
        this.strokeRenderer.configure({brush: this.brush, color: this.color});
    },

    initEvents: function() {...},
    beginStroke: function(e) {...},
    moveStroke: function(e) {...},
    endStroke: function(e) {...},

    buildPath: function(pos) {
        ...

        if (this.inputPhase == Module.InputPhase.Move) {
            var preliminaryPathPart = this.pathBuilder.createPreliminaryPath();
            var preliminarySmoothedPathPart = this.smoothener.smooth(preliminaryPathPart, true);

            this.preliminaryPathPart = this.pathBuilder.finishPreliminaryPath(preliminarySmoothedPathPart);
        }
    },

    drawPath: function() {
        if (this.inputPhase == Module.InputPhase.Begin) {
            this.strokeRenderer.draw(this.pathPart, false);
            this.strokeRenderer.blendUpdatedArea();
        }
        else if (this.inputPhase == Module.InputPhase.Move) {
            this.canvas.clear(this.strokeRenderer.updatedArea, this.backgroundColor);
            this.canvas.blend(this.strokesLayer, {rect: this.strokeRenderer.updatedArea});

            this.strokeRenderer.draw(this.pathPart, false);
            this.strokeRenderer.blendUpdatedArea();

            this.strokeRenderer.color = Module.Color.RED;
            this.strokeRenderer.drawPreliminary(this.preliminaryPathPart);
            this.strokeRenderer.color = this.color;
        }
        else if (this.inputPhase == Module.InputPhase.End) {
            this.strokeRenderer.draw(this.pathPart, true);
            this.strokeRenderer.blendUpdatedArea();
        }
    },

    clear: function() {
        this.strokesLayer.clear(this.backgroundColor);
        this.canvas.clear(this.backgroundColor);
    }
};

Module.addPostScript(function() {...});
```

**Note:** For the sake of clarity, method implementations from earlier in this tutorial are replaced with ... in the example code above.

### View sample

* View complete source code
* View sample

In Part 5 of this tutorial, you will add variable transparency to your strokes.

---
---
## Part 5: Drawing semi-transparent strokes

Up to this point, you used the direct brush. 
WILL SDK provides another type of brush, called the solid color brush, which is more precise and allows the use of alpha in color.

In Part 5 of this tutorial, you will use the solid color brush to draw semi-transparent strokes. 
To use the solid color brush, you must make some changes to your code.

### Step 1: Replace the brush type to enable transparency

Replace the ```Module.DirectBrush``` object with an instance of the *Module.SolidColorBrush* class.

The differences between two brushes are as follows:

* ```Module.DirectBrush```, which you used in previous parts, is faster than the solid color brush, but can sometimes produce glitches.
* ```Module.SolidColorBrush``` draws with solid color and transparency. 
  The ```blendMode``` of this brush is always MAX and cannot be modified. 
  This brush is more sophisticated and allows you to draw semi-transparent strokes.

For this brush to work correctly, you must use two-step rendering. 
To do this, do not provide a second parameter for the ```Module.strokeRenderer``` constructor. 
When you do not provide the second parameter, the ```strokeRenderer``` constructor generates two internal layers automatically: a buffer layer for the stroke being drawn and another layer for the stroke with a preliminary curve. 
This caches the data for further blending. 
The ```Module.StrokeRenderer``` method uses this constructor to handle the two-step rendering.

The difference between the code in this example and the code in previous parts of this tutorial is in the ```strokeRenderer.blendUpdatedArea``` method. 
This method enables you to blend strokes using the *Module.BlendMode.NORMAL* blend mode. 
This technique allows you to mix input data with previously created or foreign input data. 
The *Module.BlendMode.NORMAL* blend mode is more powerful than the alternative, *Module.BlendMode.NONE*, which only copies data.

In the ```drawPoint``` method, before drawing the new stroke, you clear the previous preliminary curve from the updated layer of the canvas. 
The actual data for the new stroke is then blended with the existing data in the strokesLayer instance.

An example of this code is as follows:

```javascript
var WILL = {
    ...
    color: Module.Color.from(204, 204, 204, 0.5),

    init: function(width, height) {...},

    initInkEngine: function(width, height) {
        ...

        this.brush = new Module.SolidColorBrush();

        ...

        this.strokeRenderer = new Module.StrokeRenderer(this.canvas);
        this.strokeRenderer.configure({brush: this.brush, color: this.color});
    },

    initEvents: function() {...},
    beginStroke: function(e) {...},
    moveStroke: function(e) {...},
    endStroke: function(e) {...},
    buildPath: function(pos) {...},

    drawPath: function() {
        if (this.inputPhase == Module.InputPhase.Begin) {
            this.strokeRenderer.draw(this.pathPart, false);
            this.strokeRenderer.blendUpdatedArea();
        }
        else if (this.inputPhase == Module.InputPhase.Move) {
            this.strokeRenderer.draw(this.pathPart, false);
            this.strokeRenderer.drawPreliminary(this.preliminaryPathPart);

            this.canvas.clear(this.strokeRenderer.updatedArea, this.backgroundColor);
            this.canvas.blend(this.strokesLayer, {rect: this.strokeRenderer.updatedArea});

            this.strokeRenderer.blendUpdatedArea();
        }
        else if (this.inputPhase == Module.InputPhase.End) {
            this.strokeRenderer.draw(this.pathPart, true);

            this.strokeRenderer.blendStroke(this.strokesLayer, Module.BlendMode.NORMAL);

            this.canvas.clear(this.strokeRenderer.updatedArea, this.backgroundColor);
            this.canvas.blend(this.strokesLayer, {rect: this.strokeRenderer.updatedArea});
        }
    },

    clear: function() {...}
};

Module.addPostScript(function() {...});
```

**Note:** For the sake of clarity, method implementations from earlier in this tutorial are replaced with ... in the example code above.

### View sample
* View complete source code
* View sample

---
---
## Part 6: Using a particle brush

In earlier parts of this tutorial, you used a brush that fills the stroke with a solid color. 
WILL SDK provides another type of brush, called the particle brush, that uses textures to produce visual effects and add an artistic touch to strokes.

Particle brushes draw a large number of small textures scattered along the trajectory of the stroke. 
Drawing with this type of brush comes at a cost because it is more computationally expensive.

In Part 6 of this tutorial, you will change your code to use a particle brush.

### Step 1: Replace the solid color brush with the particle brush
In the ```initInkEngine``` method, replace the ```Module.SolidColorBrush``` object with an instance of the *Module.ParticleBrush* class, as follows:

```javascript
this.brush = new Module.ParticleBrush(false);
```

The ```Module.ParticleBrush``` class draws a large number of small images (shape.png) along the path. 
The stroke is then filled by repeating the image in the fill.png file. 
The particle brush provides various settings that control the appearance of the filled stroke.

### Step 2: Set spacing, scattering, and rotation to vary the appearance of the particles

In the ```initInkEngine``` method, set the spacing between the images as 15% of their width (a value of 0.15), and specify that the images spread out randomly between 0% and 5% of their width (a value of 0.05). 
Apply random rotation to each shape.png image.

For example:

```javascript
this.brush.configure(true, {x: 0, y: 0}, 0.15, 0.05, Module.RotationMode.RANDOM);
```
### Step 3: Change the transparency of the stroke depending on pointer speed

To make the transparency of the stroke change depending on the pointer speed, call the ```this.pathBuilder.setPropertyConfig``` method with *Module.PropertyName.Alpha* as the first parameter. 
You do not have to enable this feature when using a particle brush, but it produces nice results.

For example:
```javascript
this.pathBuilder.setPropertyConfig(Module.PropertyName.Alpha, 0.2, 0.2, NaN, NaN, Module.PropertyFunction.Power, 1, false);
```

You control variable transparency with the ```pathBuilder``` class and the configuration of the alpha channel with the *Module.PropertyName.Alpha* parameter. 
This configuration is applicable only for *Module.ParticleBrush* brushes. 
The ```strokeRenderer``` class has the ```variableAlpha``` property that is true by default. 
If you do not want to use variable alpha, set this value to False.

The completed code for this part of the tutorial is as follows:

```javascript
var WILL = {
    ...

    init: function(width, height) {...},

    initInkEngine: function(width, height) {
        ...

        this.brush = new Module.ParticleBrush(false);
        this.brush.configure(true, {x: 0, y: 0}, 0.15, 0, Module.RotationMode.RANDOM);
        this.brush.configureShape("shape.png");
        this.brush.configureFill("fill.png");

        this.pathBuilder = new Module.SpeedPathBuilder();
        this.pathBuilder.setNormalizationConfig(180, 1800);
        this.pathBuilder.setPropertyConfig(Module.PropertyName.Width, 8, 30, 5, NaN, Module.PropertyFunction.Power, 1, false);
        this.pathBuilder.setPropertyConfig(Module.PropertyName.Alpha, 0.2, 0.2, NaN, NaN, Module.PropertyFunction.Power, 1, false);

        this.smoothener = new Module.MultiChannelSmoothener(this.pathBuilder.stride);

        this.strokeRenderer = new Module.StrokeRenderer(this.canvas);
        this.strokeRenderer.configure({brush: this.brush, color: this.color});
    },

    initEvents: function() {...},
    beginStroke: function(e) {...},
    moveStroke: function(e) {...},
    endStroke: function(e) {...},
    buildPath: function(pos) {...},
    drawPath: function() {...},
    clear: function() {...}
};

Module.addPostScript(function() {...});
```

**Note:** For the sake of clarity, method implementations from earlier in this tutorial are replaced with ... in the example code above.

### View sample

* View complete source code
* View sample

---
---
## Part 7: Generating a Bezier path

The paths that WILL SDK generates are Catmull-Rom splines that have a variable width. 
WILL SDK can render these paths efficiently, but you might need to represent the shape of the stroke in a more standard way: as a list of Bezier curves that define the boundaries of the stroke.

With a Bezier curve representation, you can render the stroke using ```CanvasRenderingContext2D``` or use it to produce an SVG or PDF document.

WILL SDK provides the *Module.BezierPath* class. 
It is a container for instances of the *Module.Boundary* class. 
The ```startingPoint``` property points to the beginning of the boundary. 
A boundary is a container for *Module.BezierCurve* objects.

In Part 7 of this tutorial, you will render a Bezier path of predefined points that are similar to Part 1 of this tutorial.

### Step 1: Set the context as CanvasRenderingContext2D

In the basic configuration of WILL, set ```this.context``` as an instance of ```CanvasRenderingContext2D```.
```javascript
var WILL = {
    ...
    this.context = Module.canvas.getContext("2d");
    ...
}
```

### Step 2: Create an instance of the bezierPath class

In the basic configuration of WILL, initialize *bezierPath* as a new instance of the ```bezierPath``` class. 
Use the ```setStroke``` method to assign your stroke:

```javascript
    ...
    var bezierPath = new Module.BezierPath();
    bezierPath.setStroke(strokeData);
    ...
```

### Step 3: Convert the stroke to a Bezier path

At the end of the ```draw``` function, call the ```draw``` method.

```javascript
var WILL = {
    backgroundColor: Module.Color.WHITE,
    color: Module.Color.from(204, 204, 204),

    init: function(width, height) {
        Module.canvas = document.getElementById("canvas");
        Module.canvas.width = width;
        Module.canvas.height = height;
        Module.canvas.style.backgroundColor = Module.Color.toHex(this.backgroundColor);

        this.context = Module.canvas.getContext("2d");
    },

    draw: function() {
        var points = [0,300,10, 100,100,20, 400,100,40, 500,300,50];
        var path = Module.PathBuilder.createPath(points, 3);
        var strokeData = {path: path, color: this.color};

        var bezierPath = new Module.BezierPath();
        bezierPath.setStroke(strokeData);

        bezierPath.draw(this.context);
    }
};

Module.addPostScript(function() {
    WILL.init(1600, 600);
    WILL.draw();
});
```

**Note:** For the sake of clarity, method implementations from earlier in this tutorial are replaced with ... in the example code above.

### View sample

* View sample

You can expect very small differences between the original path, rendered with WILL, and the Bezier path produced by this conversion. 
These differences are mainly in the anti-aliasing.

---
---
