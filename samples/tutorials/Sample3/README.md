# Tutorial 3: Erasing strokes

In this tutorial, you will learn how to locate strokes and erase both whole strokes and parts of strokes. 
The tutorial is divided into the following parts:

* [Part 1: Creating an eraser](#part-1-creating-an-eraser)
* [Part 2: Erasing parts of strokes](#part-2-erasing-parts-of-strokes)

Each part builds on the previous part, extending and improving its functionality.

## Prerequisites
This tutorial continues on from Part 2 of Tutorial 2: Encoding and decoding strokes.

## Source code
You can find the sample project in the following location:

HTML and JavaScript: /web/tutorials/Sample3

---
---
## Part 1: Creating an eraser

In this tutorial, you will extend your WILL configuration to create tools that allow you to erase entire strokes or parts of strokes.

In Part 1 of this tutorial, you will create an eraser tool. This tutorial builds on the concept of binary serialization that is explained in Part 2 of Tutorial 2: Encoding and decoding strokes.

### Step 1: Update the ink engine method to initialize the path builder

Add the following code to the ```initInkEngine``` method:

```javascript
initInkEngine: function(width, height) {
    ...

    this.brush = new Module.DirectBrush();

    this.pathBuilder = new Module.SpeedPathBuilder();
    this.pathBuilder.setNormalizationConfig(720, 3900);
    this.pathBuilder.setPropertyConfig(Module.PropertyName.Width, 8, 112, 4, 4, Module.PropertyFunction.Power, 1, false);

    ...
}
```

### Step 2: Create an ```erase``` method to update the screen

Create a new ```erase``` method to remove the affected strokes from the screen, as follows:

```javascript
erase: function() {
    this.intersector.setTargetAsStroke(this.pathPart, NaN);

    var dirtyArea = null;
    var strokesToRemove = new Array();

    this.strokes.forEach(function(stroke) {
        if (this.intersector.isIntersectingTarget(stroke)) {
            dirtyArea = Module.RectTools.union(dirtyArea, stroke.bounds);
            strokesToRemove.push(stroke);
        }
    }, this);

    strokesToRemove.forEach(function(stroke) {
        this.strokes.remove(stroke);
    }, this);

    if (dirtyArea)
        this.redraw(dirtyArea);
},
```

The eraser needs only a ```Module.PathBuilder``` instance to work correctly. 
You might notice that the ```erase``` method does not use a brush. 
It does not use a brush because the eraser does not draw on the layer. 
Instead, it modifies the stroke model. 
The ```brush``` object is used only to preload the WILL image.

When path building completes, you want to determine if there is an existing stroke underneath the pointer. 
To determine this, you can use an instance of the *Module.Intersector* class. 
This instance uses two algorithms to find data subsets. 
In this example, use the ```setTargetAsStroke``` method. 
This method iterates through the stroke model and determines if an intersection occurs.

If the algorithm finds an intersection, the stroke is marked for deletion. 
The ```isIntersectingTarget``` method uses the prepared stroke rect and its segments for this operation. 
If your eraser stroke removes at least one existing stroke, remove it from the model and redraw its rect.

In step 3, you will replace the ```strokeRenderer.draw()``` call with an ```erase()``` call. 
This converts the existing path builder to the eraser defined above.

### Step 3: Update the begin, move, and end stroke methods to call the eraser

Replace the ```drawPath()``` calls with calls to the eraser. 
To do this, add the following code to the ```beginStroke```, ```moveStroke```, and ```endStroke``` methods:

```javascript
beginStroke: function(e) {
    ...

    this.erase({x: e.clientX, y: e.clientY});
}

moveStroke: function(e) {
    ...

    if (WILL.frameID != WILL.canvas.frameID) {
        var self = this;

        WILL.frameID = WILL.canvas.requestAnimationFrame(function() {
            ...

            self.erase();

            ...
        }, true);
    }
}

endStroke: function(e) {
    ...

    this.erase({x: e.clientX, y: e.clientY});

    ...
}
```
The complete code for this part of the tutorial is as follows:

```javascript
var WILL = {
    ...

    init: function(width, height) {...},

    initInkEngine: function(width, height) {
        ...

        this.brush = new Module.DirectBrush();

        this.pathBuilder = new Module.SpeedPathBuilder();
        this.pathBuilder.setNormalizationConfig(720, 3900);
        this.pathBuilder.setPropertyConfig(Module.PropertyName.Width, 8, 112, 4, 4, Module.PropertyFunction.Power, 1, false);

        ...

        this.intersector = new Module.Intersector();
    },

    initEvents: function() {...},

    beginStroke: function(e) {
        ...

        this.erase({x: e.clientX, y: e.clientY});
    },

    moveStroke: function(e) {
        ...

        if (WILL.frameID != WILL.canvas.frameID) {
            var self = this;

            WILL.frameID = WILL.canvas.requestAnimationFrame(function() {
                ...

                self.erase();

                ...
            }, true);
        }
    },

    endStroke: function(e) {
        ...

        this.erase({x: e.clientX, y: e.clientY});

        ...
    },

    buildPath: function(pos) {...},

    erase: function() {
        var dirtyArea = null;
        var strokesToRemove = new Array();

        this.intersector.setTargetAsStroke(this.pathPart, NaN);

        this.strokes.forEach(function(stroke) {
            if (this.intersector.isIntersectingTarget(stroke)) {
                dirtyArea = Module.RectTools.union(dirtyArea, stroke.bounds);
                strokesToRemove.push(stroke);
            }
        }, this);

        strokesToRemove.forEach(function(stroke) {
            this.strokes.remove(stroke);
        }, this);

        if (dirtyArea)
            this.redraw(dirtyArea);
    },

    redraw: function(dirtyArea) {...},
    refresh: function(dirtyArea) {...},
    clear: function() {...},
    restore: function(buffer) {...}
};

Module.addPostScript(function() {...});
```
**Note:** For the sake of clarity, method implementations from earlier tutorials are replaced with ... in the example code above.

### View sample

* View complete source code
* View sample

---
---
## Part 2: Erasing parts of strokes

Instead of removing entire strokes, you might want to remove only parts of them.

In Part 1 of this tutorial, you created an eraser that completely deleted any stroke that it touched. 
In Part 2, you will modify the eraser so that it removes only the parts of a stroke that it touches directly.

### Step 1: Change the erase method to erase substrokes

Update the ```erase``` method to erase the appropriate substrokes.

Use the ```intersectWithTarget``` method to generate an array of intervals. 
Each interval of the path is either completely inside or completely outside the intersection target.

Remove the original stroke and create new strokes for every interval that is outside the intersection target.

Update the stroke model with the intersections that were found and redraw the modified part on the canvas.

Update the ```erase``` method as follows:

```javascript
var WILL = {
    ...

    erase: function() {
        var dirtyArea = null;
        var strokesToRemove = new Array();

        this.intersector.setTargetAsStroke(this.pathPart, NaN);

        this.strokes.forEach(function(stroke) {
            var intervals = this.intersector.intersectWithTarget(stroke);
            var split = stroke.split(intervals, this.intersector.targetType);

            if (split.intersect) {
                dirtyArea = Module.RectTools.union(dirtyArea, split.bounds);
                strokesToRemove.push({stroke: stroke, replaceWith: split.strokes});
            }
        }, this);

        strokesToRemove.forEach(function(strokeToRemove) {
            this.strokes.replace(strokeToRemove.stroke, strokeToRemove.replaceWith);
        }, this);

        if (dirtyArea)
            this.redraw(dirtyArea);
    },

    ...
};

Module.addPostScript(function() {...});
```

Compared with Part 1 of this tutorial, this part modifies the erasing method. 
Instead of checking for intersections with the ```isIntersectingTarget``` method, you use the ```intersectWithTarget``` method. 
The parameters are the same, but the result is an instance of the *Module.VectorInterval* class. 
Every element of this vector is an object of type *Module.Interval*. 
The interval indicates whether it is inside or outside of its target.

You create a substroke for each interval, preserve intervals that are outside the intersection, and delete intervals that are inside the intersection. 
The *stroke.subStroke* method creates new strokes from the provided intervals. 
When processing completes, update the model by removing the affected stroke and replacing it with the new substrokes. 
This creates holes in the target stroke and these parts disappear. 
You extend the ```dirtyArea``` object with their rects. 
For more information about substrokes, see the relevant parts of the documentation for *Module.Stroke*.

### View sample

* View complete source code
* View sample

---
---
