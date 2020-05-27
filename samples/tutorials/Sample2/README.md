# Tutorial 2: Encoding and decoding strokes

In this tutorial, you will learn how to use WILL SDK to encode strokes into compressed binary data and how to reconstruct strokes from encoded data. 
The tutorial is divided into the following parts:

* [Part 1: Creating a stroke model](#part-1-creating-a-stroke-model)
* [Part 2: Serializing and deserializing strokes](#part-2-serializing-and-deserializing-strokes)

Each part builds on the previous part, extending and improving its functionality.

## Prerequisites

This tutorial continues on from Part 4 of Tutorial 1: Drawing with pointing devices.

## Source code

You can find the sample project in the following location:

```HTML and JavaScript: /web/tutorials/Sample2```

---
---
## Part 1: Creating a stroke model

WILL stores input as a series of path points called a stroke. 
In this tutorial, you will learn how to create a model to store strokes and to encode and decode stroke data.

In Part 1 of this tutorial, you will create a model to store strokes. 
Part 1 of this tutorial continues on from Part 4 of Tutorial 1: Drawing with pointing devices.

### Step 1: Create a simple model to store strokes

Before you begin the serialization process, create a simple model to store the strokes that you will build. 
This model should consist of a single class called ```Stroke```, as follows:

```javascript
function Stroke(brush, points, stride, width, color, ts, tf, randomSeed, blendMode) {
    this.brush = brush;
    this.stride = stride;
    this.width = width;
    this.color = color;
    this.ts = ts;
    this.tf = tf;
    this.randomSeed = randomSeed || 0;
    this.blendMode = blendMode || Module.BlendMode.NORMAL;

    if (points instanceof Module.VectorFloat)
        this.points = points.toFloat32Array();
    else if (points instanceof Array)
        this.points = points.toFloat32Array();
    else
        this.points = new Float32Array(points, points.byteOffset, points.length);
}

Stroke.prototype.usePoints = function(callback) {
    Module.useVectoredFloat32Array(callback, this, this.points);
}
```
This class is very simple and demonstrates the parameters required to draw a stroke.

As you can see in the code above, you can choose different types for the points. 
Because the paths returned by the ```PathBuilder``` class consist of a sequence of floats, *Float32Array* is the appropriate choice. 
VectorFloat is not suitable because it is not a native object type and must be deallocated manually (JavaScript code must explicitly delete any C++ object handles that it has received, or the virtual heap will grow indefinitely). 
However, you can easily use points as vector floats with the *usePoints* method.

This example demonstrates a simple stroke configuration. 
The WILL SDK contains the *Module.Stroke* class, which makes it easier to work with paths that are part of the stroke.

### Step 2: Add a container to store the strokes

Create a container called ```strokes``` to hold the strokes, and create your ```Stroke``` instance at the end of the drawing. 
When you clear the canvas, reconstruct the ```strokes``` container.

```javascript
var WILL = {
    ...

    strokes: new Array(),

    init: function(width, height) {...},
    initInkEngine: function(width, height) {...},
    initEvents: function() {...},

    beginStroke: function(e) {...},
    moveStroke: function(e) {...},

    endStroke: function(e) {
        ...

        var stroke = new Module.Stroke(this.brush, this.path, NaN, this.color, 0, 1);
        this.strokes.push(stroke);

        ...
    },

    buildPath: function(pos) {
        ...

        this.pathPart = pathContext.getPathPart();
        this.path = pathContext.getPath();
    },

    drawPath: function() {...},

    clear: function() {
        this.strokes = new Array();

        ...
    }
};

Module.addPostScript(function() {...});
```

Note: For simplicity, the code in this example continues from Part 4 of Tutorial 1: Drawing with pointing devices without implementing preliminary curves. 
Method implementations from earlier tutorials are replaced with ... in the example code.

### View sample
* View complete source code
* View sample

---
---
## Part 2: Serializing and deserializing strokes

In Part 1 of this tutorial, you created the stroke model. 
In Part 2 of this tutorial, you will encode strokes into a file and decode strokes from a file.

### Step 1: Extend the stroke model to assist the encoding process

Extend the stroke model with the following methods. 
These methods will help you in the encoding and decoding process.

In the stroke constructor, initialize the stroke rect and its segments. 
A segment is the curve between every two control points. 
The WILL engine provides methods to calculate segments, but you must store them in the stroke model. 
The stroke rect needs to redraw only the stroke area, because it is more efficient than redrawing the entire canvas.

Extend the stroke model as follows:

```javascript
function Stroke(brush, points, stride, width, color, ts, tf, randomSeed, blendMode) {
    ...

    this.initRect();
}

Stroke.prototype = {
    initRect: function() {
        this.rect = null;
        this.segments = new Array();

        this.usePoints(function(strokePoints) {
            for (var i = 0; i < this.getSegmentsCount(); i++) {
                var segmentRect = this.getSegmentRect(strokePoints, i);

                if (segmentRect) {
                    this.segments.push(segmentRect);
                    this.rect = Module.RectTools.union(this.rect, segmentRect);
                }
            }
        });

        if (this.rect.left < 0) {
            this.rect.width += this.rect.left;
            this.rect.left = 0;
        }

        if (this.rect.top < 0) {
            this.rect.height += this.rect.top;
            this.rect.top = 0;
        }
    },

    getSegmentRect: function(strokePoints, idx) {
        var result;

        if (idx < this.getSegmentsCount())
            result = Module.calculateSegmentBounds(strokePoints, this.stride, this.width, idx, 0.0);

        return result;
    },

    getSegmentsCount: function() {
        return this.getPointsCount() - 3;
    },

    getPointsCount: function() {
        return this.points.length / this.stride;
    },

    usePoints: function(callback, transformSegments) {
        var segments;

        if (transformSegments) {
            segments = new Array();

            this.segments.forEach(function(segment) {
                segments.push(segment.left);
                segments.push(segment.top);
                segments.push(segment.width);
                segments.push(segment.height);
            });
        }

        Module.useVectoredFloat32Array(callback, this, this.points, segments);
    },

};

```
**Note:** You might ask why the ```getSegmentsCount``` method returns *pointsCount - 3*. 
It does so because of the Catmull-Rom spline that defines the path of the stroke. 
The spline needs four points to define a single curve (segment). 
Because four points define one segment, each additional point after the first three adds a new segment (consisting of the new point plus the previous three control points).

### Step 2: Add a method to save encoded strokes

Stroke encoding happens with an instance of the *Module.InkEncoder* class. 
This class encodes every stroke from the ```strokes``` container that you created in Part 1 of this tutorial.

When the encoding is completed, deallocate the encoder using the ```encoder.delete``` method.

In the basic WILL configuration, add a method to save encoded strokes as follows:

```javascript
save: function() {
    var data = Module.InkEncoder.encode(this.strokes);
    saveAs(data, "export.data", "application/octet-stream");
}
```

### Step 3: Add a method to load encoded strokes
Decoding happens with an instance of the *Module.InkDecoder* class. 
While decoding, put decoded strokes into the ```strokes``` container that you created in Part 1 of this tutorial. 
When the decoding process is complete, you will draw these strokes to the canvas.

In the basic WILL configuration, add a method to decode strokes and store them in the ```strokes``` container as follows:

```javascript
load: function(e) {
    var input = e.currentTarget;
    var file = input.files[0];
    var reader = new FileReader();

    reader.onload = function(e) {
        WILL.clear();

        var strokes = Module.InkDecoder.decode(new Uint8Array(e.target.result));
        WILL.strokes.pushArray(strokes);
        WILL.redraw(strokes.bounds);
    };

    reader.readAsArrayBuffer(file);
}
```
### Step 4: Add a method to redraw the stored strokes

At the end of decoding, you will call a method to draw the strokes to the canvas using the ```strokeRenderer``` class.

In the basic WILL configuration, add a method to redraw the stored strokes as follows:

```javascript
redraw: function(dirtyArea) {
    if (!dirtyArea) dirtyArea = this.canvas.bounds;
    dirtyArea = Module.RectTools.ceil(dirtyArea);

    this.strokesLayer.clear(dirtyArea);

    this.strokes.forEach(function(stroke) {
        var affectedArea = Module.RectTools.intersect(stroke.bounds, dirtyArea);

        if (affectedArea) {
            this.strokeRenderer.draw(stroke);
            this.strokeRenderer.blendStroke(this.strokesLayer, stroke.blendMode);
        }
    }, this);

        this.refresh(dirtyArea);
}
```

### Step 5: Add a method to blend existing strokes with the canvas

Blend the ```strokesLayer``` object with the current canvas.

In the basic WILL configuration, add a method to refresh the canvas, as follows:

```javascript
refresh: function(dirtyArea) {
    this.canvas.blend(this.strokesLayer, {rect: Module.RectTools.ceil(dirtyArea)});
}
```

### Step 6: Update the initialization

The ```Module.InkDecoder.getStrokeBrush``` method is an abstract method. 
You must implement it because it is used by the ```Module.InkDecoder.decode``` method. 
The ```paint``` parameter should be of type uint32 and represent a reference to the required brush. 
This reference can be, for example, an array index or an ID from a custom scheme. 
It is not required for serialization but can be used when an application uses multiple brushes. 
The implementation provided in the example code is as simple as possible.

The completed code for this part of the tutorial is as follows:

```javascript
var WILL = {
    ...

    init: function(width, height) {...},
    initInkEngine: function(width, height) {...},
    initEvents: function() {...},
    beginStroke: function(e) {...},
    moveStroke: function(e) {...},
    endStroke: function(e) {...},
    buildPath: function(pos) {...},
    drawPath: function() {...},

    redraw: function(dirtyArea) {
        if (!dirtyArea) dirtyArea = this.canvas.bounds;
        dirtyArea = Module.RectTools.ceil(dirtyArea);

        this.strokesLayer.clear(dirtyArea);

        this.strokes.forEach(function(stroke) {
            var affectedArea = Module.RectTools.intersect(stroke.bounds, dirtyArea);

            if (affectedArea) {
                this.strokeRenderer.draw(stroke);
                this.strokeRenderer.blendStroke(this.strokesLayer, stroke.blendMode);
            }
        }, this);

        this.refresh(dirtyArea);
    },

    refresh: function(dirtyArea) {
        this.canvas.blend(this.strokesLayer, {rect: Module.RectTools.ceil(dirtyArea)});
    },

    clear: function() {...},

    load: function(e) {
        var input = e.currentTarget;
        var file = input.files[0];
        var reader = new FileReader();

        reader.onload = function(e) {
            WILL.clear();

            var strokes = Module.InkDecoder.decode(new Uint8Array(e.target.result));
            WILL.strokes.pushArray(strokes);
            WILL.redraw(strokes.bounds);
        };

        reader.readAsArrayBuffer(file);
    },

    save: function() {
        var data = Module.InkEncoder.encode(this.strokes);
        saveAs(data, "export.data", "application/octet-stream");
    }
};

Module.addPostScript(function() {
    Module.InkDecoder.getStrokeBrush = function(paint) {
        return WILL.brush;
    }

    ...
});
```

**Note:** For the sake of clarity, method implementations from earlier in this tutorial are replaced with ... in the example code above.

### View sample

* View complete source code
* View sample

---
---

 