# Tutorial 6: Collaborating in real time

In this tutorial, you will learn how to draw, erase, and select strokes over the network. 
This tutorial is divided into the following parts:

* [Part 1: Composing strokes](#part-1-composing-strokes)
* [Part 2: Erasing strokes](#part-2-erasing-strokes)
* [Part 3: Erasing parts of strokes](#part-3-erasing-parts-of-strokes)
* [Part 4: Selecting strokes](#part-4-selecting-strokes)
* [Part 5: Selecting parts of strokes](#part-5-selecting-parts-of-strokes)
* [Part 6: Composing strokes with latency](#part-6-composing-strokes-with-latency)

Each part builds on the previous part, extending and improving its functionality.

**Note:** This tutorial is simplified and does not cover network communication. 
The parts demonstrate how to encode data when sending and how to decode data when receiving. 
Parts 1 to 5 ignore latency and demonstrate sending and receiving data only. 
Drawing with latency is demonstrated in Part 6. 
This tutorial does not cover conflict detection and resolution.

## Prerequisites

This tutorial continues from the following:
* Part 1, Part 2, and Part 3 of Tutorial 1: Drawing with pointing devices
* Tutorial 3: Erasing strokes
* Tutorial 4: Selecting strokes

## Source code

You can find the sample project in the following location:

```HTML and JavaScript: /web/tutorials/Sample6```

---
---
## Part 1: Composing strokes

WILL allows multiple users to collaborate on a document in real time. 
In this tutorial, you will learn how to configure a document that multiple users can work on over the network.

In Tutorial 1: Drawing with pointing devices, you defined the stroke composition process. 
In Part 1 of this tutorial, you will update that process to enable multiple stroke creators and to transfer stroke data over the network.

### Step 1: Update the ink engine to allow for multiple stroke creators

Update the ink engine initialization to initialize the ```client``` object. 
Use the user ID of the client to create an instance of the ```Writer``` class, which identifies the stroke creator (you will create this class in step 5).

```javascript
initInkEngine: function(width, height) {
    ...

    client.init();

    this.writer = new Writer(client.id);
    client.writers[client.id] = this.writer;

    this.clearCanvas();
},
```

### Step 2: Extend the stroke composition methods to package and send the data

In the ink engine initalization, extend the stroke composition process to package the stroke data and send it over the network.

The ```client``` object acts as router between the local canvas and the remote side, and the ```server``` object emulates the server behavior. 
When communication with the server finishes, users can begin collaboration.

**Note:** The ```server``` object does not pretend to be a real communication point, but it displays some of the collaboration problems that appear in this process. 
This object is for illustrative purposes only and its implementation is not covered in this tutorial.

```javascript
beginStroke: function(e) {
    ...

    client.encoder.encodeComposeStyle(this.writer.strokeRenderer);
    client.send();
},

endStroke: function(e) {
    ...

    client.encoder.encodeAdd([{
        brush: this.brush,
        path: this.path,
        width: this.writer.strokeRenderer.width,
        color: this.writer.strokeRenderer.color,
        ts: 0, tf: 1, randomSeed: 0,
        blendMode: this.writer.strokeRenderer.blendMode
    }]);
    client.send();
},

drawPath: function() {
    this.writer.compose(this.pathPart, this.writer.inputPhase == Module.InputPhase.End);
},
```

### Step 3: Update the canvas clearing process

Clearing the canvas is not a stroke operation. 
Implement it separately.

In this example, there are two methods: ```clear``` and ```clearCanvas```. 
The ```clearCanvas``` method clears the local drawing surface immediately. 
The ```clear``` method sends a command to the server that enters the server-controlled command chain and clears the drawing surface for all collaborators.

Define the two methods as follows:

```javascript
clear: function() {
    parent.server.clear();
},

clearCanvas: function() {
    this.strokes = new Array();

    this.strokesLayer.clear(this.backgroundColor);
    this.canvas.clear(this.backgroundColor);
}
```
The complete sample code for the ink engine configuration (steps 1-3) is as follows:

```javascript
var WILL = {
    backgroundColor: Module.Color.WHITE,
    strokes: new Array(),

    init: function(width, height) {...},
    initInkEngine: function(width, height) {...},
    initEvents: function() {...},

    beginStroke: function(e) {
        ...

        client.encoder.encodeComposeStyle(this.writer.strokeRenderer);
        client.send();
    },

    moveStroke: function(e) {...},

    endStroke: function(e) {
        ...

        client.encoder.encodeAdd([{
            brush: this.brush,
            path: this.path,
            width: this.writer.strokeRenderer.width,
            color: this.writer.strokeRenderer.color,
            ts: 0, tf: 1, randomSeed: 0,
            blendMode: this.writer.strokeRenderer.blendMode
        }]);
        client.send();
    },

    buildPath: function(pos) {...},

    drawPath: function() {
        this.writer.compose(this.pathPart, this.writer.inputPhase == Module.InputPhase.End);
    },

    refresh: function(dirtyArea) {
        if (!dirtyArea) dirtyArea = this.canvas.bounds;
        dirtyArea = Module.RectTools.ceil(dirtyArea);

        this.canvas.clear(dirtyArea, this.backgroundColor);
        this.canvas.blend(this.strokesLayer, {rect: dirtyArea});
    },

    clear: function() {
        parent.server.clear();
    },

    clearCanvas: function() {
        this.strokes = new Array();

        this.strokesLayer.clear(this.backgroundColor);
        this.canvas.clear(this.backgroundColor);
    }
};
```

### Step 4: Initialize the environment

Initalize the environment and implement the ```Module.InkDecoder.getStrokeBrush``` method. 
This is an abstract method of the ```Module.InkDecoder``` class and is used from the ```Module.PathOperationDecoder``` class when a stroke brush is required.

To initialize the environment, add the following code:

```javascript
var env = {
    width: top.document.getElementById(window.name).scrollWidth,
    height: top.document.getElementById(window.name).scrollHeight
};

Module.addPostScript(function() {
    Module.InkDecoder.getStrokeBrush = function(paint, writer) {
        return WILL.brush;
    }

    WILL.init(env.width, env.height);
});
```

**Note:** The ```paint``` parameter of the ```Module.InkDecoder.getStrokeBrush``` method is related to the ```Module.BrushEncoder``` and ```Module.BrushDecoder``` classes. 
These classes are not covered in this tutorial.

### Step 5: Define a Writer constructor to identify stroke creators

The person who creates a stroke is represented by an instance of the ```Writer``` class. 
For collaborative composition, you need a list of all users that participate in the collaboration (that is, multiple instances of the ```Writer``` class).

Define a constructor called ```Writer``` that will identify the user who created a stroke, as follows:

```javascript
function Writer(id) {
    this.id = id;

    this.strokeRenderer = new Module.StrokeRenderer(WILL.canvas);
    this.strokeRenderer.configure({brush: WILL.brush, color: ((id == 0)?Module.Color.BLUE:Module.Color.GREEN)});
}

Writer.prototype.refresh = function() {
    if (this.id == client.id && this.inputPhase == Module.InputPhase.Move)
        this.strokeRenderer.drawPreliminary(WILL.preliminaryPathPart);

    WILL.canvas.clear(this.strokeRenderer.updatedArea, WILL.backgroundColor);
    WILL.canvas.blend(WILL.strokesLayer, {rect: this.strokeRenderer.updatedArea});

    this.strokeRenderer.blendUpdatedArea();
}

Writer.prototype.compose = function(path, endStroke) {
    if (path.points.length == 0)
        return;

    this.strokeRenderer.draw(path, endStroke, this.id != client.id);

    if (this.id == client.id) {
        if (this.strokeRenderer.updatedArea)
            this.refresh();

        if (endStroke)
            delete this.inputPhase;

        client.encoder.encodeComposePathPart(path, this.strokeRenderer.color, true, false, endStroke);
        client.send();
    }
}

Writer.prototype.abort = function() {
    var dirtyArea = Module.RectTools.union(this.strokeRenderer.strokeBounds, this.strokeRenderer.preliminaryDirtyArea);

    this.strokeRenderer.abort();
    delete this.inputPhase;

    WILL.refresh(dirtyArea);

    if (this.id == client.id) {
        client.encoder.encodeComposeAbort();
        client.send();
    }
}
```

### Step 6: Send the data through the network

You learned how to compose strokes in Tutorial 1: Drawing with pointing devices. 
In a collaborative scenario, when a composition event occurs, you should send this data through the network. 
In this example, the ```client``` object routes data packages as follows:

```javascript
var client = {
    name: window.name,
    writers: [],

    init: function() {
        this.id = parent.server.getSessionID(this.name);

        this.encoder = new Module.PathOperationEncoder();
        this.decoder = new Module.PathOperationDecoder(Module.PathOperationDecoder.getPathOperationDecoderCallbacksHandler(this.callbacksHandlerImplementation));
    },

    send: function(compose) {
        parent.server.recieve(this.id, Module.readBytes(this.encoder.getBytes()), compose);
        this.encoder.reset();
    },

    recieve: function(sender, data) {
        var writer = this.writers[sender];

        if (!writer) {
            writer = new Writer(sender);
            this.writers[sender] = writer;
        }

        Module.writeBytes(data, function(int64Ptr) {
            this.decoder.decode(writer, int64Ptr);
        }, this);
    },

    callbacksHandlerImplementation: {
        onComposeStyle: function(writer, style) {
            if (writer.id == client.id) return;
            writer.strokeRenderer.configure(style);
        },

        onComposePathPart: function(writer, path, endStroke) {
            if (writer.id == client.id) return;

            writer.compose(path, endStroke);
            writer.refresh();
        },

        onComposeAbort: function(writer) {
            if (writer.id == client.id) return;
            writer.abort();
        },

        onAdd: function(writer, strokes) {
            strokes.forEach(function(stroke) {
                WILL.strokes.push(stroke);
                writer.strokeRenderer.blendStroke(WILL.strokesLayer, stroke.blendMode);
            }, this);

            WILL.refresh();
        },

        onRemove: function(writer, group) {},

        onUpdateColor: function(writer, group, color) {},

        onUpdateBlendMode: function(writer, group, blendMode) {},

        onSplit: function(writer, splits) {},

        onTransform: function(writer, group, mat) {}
    }
};
```

The ```client``` object handles network communication.
In its ```init``` method, it makes a handshake with the server.

The ```encoder``` object is an instance of the *Module.PathOperationEncoder* class. 
It is responsible for data encoding.

The ```decoder``` object is an instance of the *Module.PathOperationDecoder* class. 
It is responsible for data decoding.

The first argument of the ```decoder``` object's constructor is an implementation of the *Module.PathOperationDecoderCallbacksHandlerInterface* interface. 
The *Module.PathOperationDecoder.getPathOperationDecoderCallbacksHandler* method converts the implementation to a typed instance. 
You should implement all methods of the interface.

The ```send``` function reads bytes from the encoder and sends data over the network. 
At the end of this method, reset it because you need to start a new encoding process on the next encode.

The ```receive``` function processes remote data. 
When a new collaborator accesses the canvas, a new instance of the ```Writer``` class is created for that collaborator. 
This object is the user that all callback functions receive as a first parameter.

The ```callbacksHandlerImplementation``` method contains the implementation needed for the callback handler. 
This example demonstrates the implementation needed for composition only.

The ```encodeComposeStyle``` method adds configuration to the encoder. 
The ```onComposeStyle``` method configures the remote user's instance of the ```strokeRenderer``` class.

The ```encodeComposePathPart``` method adds a path part to the encoder and the ```onComposePathPart``` method processes the input from a remote user.

The ```encodeComposeAbort``` method adds an abort operation and the ```onComposeAbort``` method aborts remote user input for the current stroke.

The ```encodeAdd``` method adds a completed stroke path to the encoder and the ```onAdd``` method receives new strokes and the results of composition.

The ```getBytes``` call in the ```send``` method reads encoded data and resets the encoder to be ready for the next addition.

The ```WILL.refresh``` method applies changes to the canvas.

Conflict detection and conflict resolution are not applicable in this example because latency is ignored. 
In a real application, the correct appliance of completed strokes is very important. 
In Part 6 of this tutorial, you will have the opportunity to create conflict and resolve it.

**Note:** For the sake of clarity, method implementations from earlier in this tutorial are replaced with ... in the example code above.

### View sample

* View complete source code
* View sample

---
---
## Part 2: Erasing strokes

In Part 1 of this tutorial, you enabled multiple users to create strokes on a single canvas. 
In Part 2, you will learn how to load data from a file, restore the data over the canvas of all collaborators, and erase strokes over the network. 
Erasing strokes is explained in detail in Part 1 of Tutorial 3: Erasing strokes.

### Step 1: Add calls to an ```erase``` method to allow users to erase strokes

In the WILL configuration, edit the ```beginStroke```, ```moveStroke```, and ```endStroke``` methods to call a new method called erase, which you will define in the next step.

Edit the methods as follows:

```javascript
beginStroke: function(e) {
    ...

    this.erase();
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

    this.erase();

    ...
},
```

### Step 2: Define the erase method to erase strokes

In the WILL configuration, define the ```erase``` method as follows:

```javascript
erase: function() {
    var group = new Array();

    this.writer.intersector.setTargetAsStroke(this.pathPart, NaN);

    this.strokes.forEach(function(stroke) {
        if (this.writer.intersector.isIntersectingTarget(stroke))
            group.push(this.strokes.indexOf(stroke));
    }, this);

    if (group.length > 0) {
        client.encoder.encodeRemove(group.toUint32Array());
        client.send();
    }
}
```

Note the ```group.delete()``` call at the end of the ```erase``` method. 
This structure works directly with HEAP, so you must release this memory manually.

### Step 3: Define a redraw method to update the canvas

In the WILL configuration, define the ```redraw``` method as follows:

```javascript
redraw: function(dirtyArea) {
    if (!dirtyArea) dirtyArea = this.canvas.bounds;
    dirtyArea = Module.RectTools.ceil(dirtyArea);

    this.strokesLayer.clear(dirtyArea);

    this.strokes.forEach(function(stroke) {
        var affectedArea = Module.RectTools.intersect(stroke.bounds, dirtyArea);

        if (affectedArea) {
            this.writer.strokeRenderer.draw(stroke);
            this.writer.strokeRenderer.blendStroke(this.strokesLayer, stroke.blendMode);
        }
    }, this);

    this.refresh(dirtyArea);
}
```

### Step 4: Update the refresh method

In the WILL configuration, update the ```refresh``` method as follows:

```javascript
refresh: function(dirtyArea) {
    if (!dirtyArea) dirtyArea = this.canvas.bounds;
    dirtyArea = Module.RectTools.ceil(dirtyArea);

    if (this.inputPhase && this.inputPhase == Module.InputPhase.Move) {
        this.writer.strokeRenderer.drawPreliminary(this.preliminaryPathPart);

        this.canvas.clear(dirtyArea, this.backgroundColor);
        this.canvas.blend(this.strokesLayer, {rect: dirtyArea});
    }

    this.canvas.clear(dirtyArea, this.backgroundColor);
    this.canvas.blend(this.strokesLayer, {rect: dirtyArea});
},
```

### Step 5: Define a restore method to restore loaded data

In the WILL configuration, define the ```restore``` method as follows:

```javascript
restore: function(fileBuffer) {
    var strokes = Module.InkDecoder.decode(new Uint8Array(fileBuffer));

    client.encoder.encodeAdd(strokes);
    client.send();
}
```

### Step 6: Edit the ```Writer``` constructor to restore loaded data

The ```Writer``` constructor in this example is as simple as possible because it is used only when restoring loaded data. 

Edit the constructor as follows:

```javascript
function Writer(id) {
    this.id = id;

    this.strokeRenderer = new Module.StrokeRenderer(WILL.canvas);
    this.strokeRenderer.configure({brush: WILL.brush, color: Module.Color.BLACK});

    this.intersector = new Module.Intersector();
}
```

### Step 7: Confirm the configuration of the ```client``` object

In Part 1 of this tutorial, you defined the ```client``` object. 
In this part of the tutorial, this object includes the ```onAdd``` and ```onRemove``` events only. 
Other events are discussed in later parts of this tutorial.

The relevant parts are as follows:

```javascript
var client = {
    ...

    init: function() {...},
    send: function(compose) {...},
    recieve: function(sender, data) {...},

    callbacksHandlerImplementation: {
        ...

        onAdd: function(writer, strokes) {
            WILL.strokes.pushArray(strokes);
            WILL.redraw(strokes.bounds);
        },

        onRemove: function(writer, group) {
            var strokesToRemove = new Array();
            var dirtyArea;

            group.forEach(function(strokeIDX) {
                var stroke = WILL.strokes[strokeIDX];

                dirtyArea = Module.RectTools.union(dirtyArea, stroke.bounds);
                strokesToRemove.push(stroke);
            }, this);

            strokesToRemove.forEach(function(stroke) {
                WILL.strokes.remove(stroke);
            }, this);

            if (dirtyArea)
                WILL.redraw(dirtyArea);
        },

        ...
    }
};
```

### Step 8: Initialize the collaborative canvas

Initialize the canvas as follows:

```javascript
...

Module.addPostScript(function() {
    Module.InkDecoder.getStrokeBrush = function(paint, writer) {
        return WILL.brush;
    }

    WILL.init(env.width, env.height);

    if (client.id == 0) {
        var url = location.toString();
        url = url.substring(0, url.lastIndexOf("/")) + "/ship.data";

        var request = new XMLHttpRequest();

        request.onreadystatechange = function() {
             if (this.readyState == this.DONE)
                WILL.restore(this.response);
        };

        request.open("GET", url, true);
        request.responseType = "arraybuffer";
        request.send();
    }
});
```

After the ink engine initializes, one collaborator loads the WILL file with predefined data. 
When the data is loaded, it is decoded and stored in the ```strokes``` array. 
The ```encodeAdd``` function in the ```restore``` method encodes this data to transmit it over the network to all other collaborators.

The ```onAdd``` event in the ```client```` object (which you defined in Part 1 of this tutorial) fires when another user receives that data. 
The event adds the transmitted strokes to the model and redraws the data.

This example demonstrates the erasing of a stroke. 
In the ```erase``` method, you use the *Module.Intersector* class to detect if there is an intersection between the input and an existing stroke. 
If an intersection is available, you can find the index in the ```strokes``` array. 
The indexes of found strokes are stored in the Uint32Array with the name ```group``` (notice array convertion ```group.toUint32Array()```). 
If one or more strokes are found, you encode them with the ```encodeRemove``` method of the encoder.

The ```onRemove``` event fires from the remote site and deletes the relevant strokes in the canvas of all collaborators, including the user who erased the stroke.

This part of the tutorial demonstrates the finding and removing of strokes in a collaborative working scenario. 
For this tutorial, you use local indexes to reference strokes. 
In a real collaboration, local indexes could be unsafe. 
Instead, you could use identifiers with a custom scheme to differentiate between them.

**Note:** For the sake of clarity, method implementations from earlier in this tutorial are replaced with ... in the example code above.

### View sample

* View complete source code
* View sample

---
---
## Part 3: Erasing parts of strokes

This part of the tutorial builds on the erasing of stroke parts from Part 2 of Tutorial 3: Erasing strokes and the restoration of data from Part 2 of this tutorial. 
In Part 2 of this tutorial, you enabled collaborative users to erase entire strokes. 
In Part 3, you will update the code to erase parts of strokes instead of entire strokes.

### Step 1: Update the eraser to erase parts of strokes

Update the ```erase``` method to allow users to erase parts of strokes, as follows:

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

    erase: function() {
        var result = new Array;

        this.writer.intersector.setTargetAsStroke(this.pathPart, NaN);

        this.strokes.forEach(function(stroke) {
            var intervals = this.writer.intersector.intersectWithTarget(stroke);
            var split = stroke.split(intervals, this.writer.intersector.targetType);

            if (split.intersect) {
                split.id = this.strokes.indexOf(stroke);
                result.push(split);
            }
        }, this);

        if (result.length > 0) {
            client.encoder.encodeSplit(result);
            client.send();
        }
    },

    redraw: function(dirtyArea) {...},
    refresh: function(dirtyArea) {...},
    clear: function() {...},
    clearCanvas: function() {...},
    restore: function(fileBuffer) {...}
};
```
The initialization process and writer definition are unchanged from Part 2 of this tutorial, but the WILL ```erase``` method is different.

The *Module.Intersector* class is used again to determine if intersections exist between the existing strokes and the input.

### Step 2: Modify the stroke model when an intersection is found

The *Module.Split* object is the result of the ```stroke.split(...)``` call. 
You need an identifer to reference the split stroke. 
As in previous tutorial parts, use the local index for this purpose. 
The ```encodeSplit``` method of the encoder expects an array of splits, and each split needs the id property.

When the ```onSplit``` event fires, the collaborator uses data from the split to modify their own stroke model. 
When strokes are found from the split, redraw the data.

Modify the ```client``` object as follows:

```javascript
var client = {
    ...

    init: function() {...},
    send: function(compose) {...},
    recieve: function(sender, data) {...},

    callbacksHandlerImplementation: {
        ...

        onAdd: function(writer, strokes) {...},

        ...

        onSplit: function(writer, splits) {
            var strokesToRemove = new Array();

            splits.forEach(function(split) {
                var stroke = WILL.strokes[split.id];
                var replaceWith = new Array();

                split.intervals.forEach(function(interval) {
                    var subStroke = stroke.subStroke(interval.fromIndex, interval.toIndex, interval.fromTValue, interval.toTValue);
                    replaceWith.push(subStroke);
                }, this);

                strokesToRemove.push({stroke: stroke, replaceWith: replaceWith});
            }, this);

            strokesToRemove.forEach(function(strokeToRemove) {
                WILL.strokes.replace(strokeToRemove.stroke, strokeToRemove.replaceWith);
            }, this);

            if (strokesToRemove.length > 0)
                WILL.redraw(splits.affectedArea);
        },

        ...
    }
};
```

**Note:** Conflicts can arise from modifying strokes in this way. 
Apply conflict detection and conflict resolution algorithms to smooth the erasing of stroke parts.

For the sake of clarity, method implementations from earlier in this tutorial are replaced with ... in the example code above.

### View sample

* View complete source code
* View sample

---
---
## Part 4: Selecting strokes

In previous parts of this tutorial, you learned how to load data from files, restore over the canvases of all collaborators, and erase strokes over the network. 
This part of the tutorial builds on the selection of strokes from Part 1 of Tutorial 4: Selecting strokes and the restoration of data from Part 2 of this tutorial.

In Part 4 of this tutorial, you will learn how to select strokes over the network.

### Step 1: Implement a tool to select strokes

The initialization process is unchanged from earlier parts of this tutorial.

Define a ```select``` method to select strokes as follows:

```javascript
var WILL = {
    color: Module.Color.from(0, 151, 212),
    backgroundColor: Module.Color.WHITE,

    strokes: new Array(),
    strokeWidth: 1.25,

    selection: {
        strokes: new Array(),

        show: function(color) {
            var dirtyArea = null;

            this.strokes.forEach(function(stroke) {
                stroke.color = color;
                dirtyArea = Module.RectTools.union(dirtyArea, stroke.bounds);
            });

            WILL.redraw(dirtyArea);
        }
    },

    init: function(width, height) {...},
    initInkEngine: function(width, height) {...},
    initEvents: function() {...},

    beginStroke: function(e) {...},
    moveStroke: function(e) {...},

    endStroke: function(e) {
        ...

        this.refresh(this.writer.strokeRenderer.strokeBounds);
        this.select();

        delete this.inputPhase;
    },

    buildPath: function(pos) {...},

    drawPath: function() {
        this.writer.strokeRenderer.draw(this.pathPart, this.inputPhase == Module.InputPhase.End);

        if (this.inputPhase == Module.InputPhase.End)
            this.refresh(this.writer.strokeRenderer.strokeBounds);
        else if (this.writer.strokeRenderer.updatedArea)
            this.refresh(this.writer.strokeRenderer.updatedArea);
    },

    select: function() {
        var group = new Array();

        this.writer.intersector.setTargetAsClosedPath(this.path);

        this.strokes.forEach(function(stroke) {
            if (this.writer.intersector.isIntersectingTarget(stroke))
                group.push(this.strokes.indexOf(stroke));
        }, this);

        if (group.length > 0) {
            client.encoder.encodeUpdateColor(group.toUint32Array(), this.writer.color);
            client.send();
        }
    },

    redraw: function(dirtyArea) {...},

    refresh: function(dirtyArea) {
        if (!dirtyArea) dirtyArea = this.canvas.bounds;
        dirtyArea = Module.RectTools.ceil(dirtyArea);

        if (this.inputPhase && this.inputPhase == Module.InputPhase.Move) {
            this.writer.strokeRenderer.drawPreliminary(this.preliminaryPathPart);

            this.canvas.clear(dirtyArea, this.backgroundColor);
            this.canvas.blend(this.strokesLayer, {rect: dirtyArea});

            this.writer.strokeRenderer.blendUpdatedArea();
        }
        else {
            this.canvas.clear(dirtyArea, this.backgroundColor);
            this.canvas.blend(this.strokesLayer, {rect: dirtyArea});
        }
    },

    clear: function() {...},
    clearCanvas: function() {...},
    restore: function(fileBuffer) {...}
};
```

The ```WILL.select``` method demonstrates the collection of selection data. 
The indexes of found strokes are stored in the Uint32Array with the name ```group``` (notice array convertion ```group.toUint32Array()```). 
When the selector finds strokes, it encodes them using the ```encodeUpdateColor``` method of the encoder. 
When the data encoding finishes, the ```group.delete()``` method releases the memory occupied by the ```group``` instance.

### Step 2: Create a lasso tool to select parts of the canvas

To draw a lasso on the canvas, you need an instance of the *Module.StrokeRenderer* class.

Create this instance in the ```Writer``` constructor as follows:

```javascript
function Writer(id) {
    this.id = id;
    this.color = (id == 0)?Module.Color.RED:Module.Color.GREEN;

    this.strokeRenderer = new Module.StrokeRenderer(WILL.canvas);
    this.strokeRenderer.configure({brush: WILL.brush, color: WILL.color, width: WILL.strokeWidth});

    this.intersector = new Module.Intersector();
}
```

### Step 3: Redraw the canvas for all collaborators

When the ```onUpdateColor``` event fires from the remote site, update the strokes in the models of all collaborators (including the user who made the change) and redraw the affected areas.

In the ```client``` object, edit the ```callbacksHandlerImplementation``` as follows:

```javascript
var client = {
    ...

    init: function() {...},
    send: function(compose) {...},
    recieve: function(sender, data) {...},

    callbacksHandlerImplementation: {
        ...

        onAdd: function(writer, strokes) {...},

        ...

        onUpdateColor: function(writer, group, color) {
            WILL.selection.strokes = new Array();

            group.forEach(function(strokeIDX) {
                var stroke = WILL.strokes[strokeIDX];
                WILL.selection.strokes.push(stroke);
            });

            WILL.selection.show(color);
        },

        ...
    }
};
```

This example demonstrates the update of stroke properties. 
In a real application, ensure that any updated strokes remain available in your model.

**Note:** For the sake of clarity, method implementations from earlier in this tutorial are replaced with ... in the example code above.

### View sample

* View complete source code
* View sample

---
---
## Part 5: Selecting parts of strokes

This part of the tutorial builds on the selecting of stroke parts from Part 2 of Tutorial 4: Selecting strokes and the restoration of data from Part 2 of this tutorial. 
In Part 4 of this tutorial, you enabled collaborative users to select entire strokes. 
In Part 5, you will update the code to select parts of strokes instead of entire strokes.

### Step 1: Update the select tool to enable selection of parts of strokes

The initialization process and writer definition are unchanged from Part 4 of this tutorial, but the WILL ```select``` method is different.

With the previous impementation, you could only select an entire stroke. 
To select a part of a stroke, you must first split the stroke. 
When the stroke is split, select the new substrokes that are marked as ```selected``` in the *Module.Split* result of the intersection.

Update the ```select``` method to enable the selection of parts of strokes, as follows:

```javascript
var WILL = {
    ...

    selection: {...},
    init: function(width, height) {...},
    initInkEngine: function(width, height) {...},
    initEvents: function() {...},
    beginStroke: function(e) {...},
    moveStroke: function(e) {...},
    endStroke: function(e) {...},
    buildPath: function(pos) {...},
    drawPath: function() {...},

    select: function() {
        var result = new Array();
        var group = new Array();
        var offset = 0;

        this.writer.intersector.setTargetAsClosedPath(this.path);

        this.strokes.forEach(function(stroke) {
            var intervals = this.writer.intersector.intersectWithTarget(stroke);
            var split = stroke.split(intervals, this.writer.intersector.targetType);

            if (split.intersect) {
                split.id = this.strokes.indexOf(stroke);

                split.strokes.forEach(function(subStroke, i) {
                    if (split.selected.contains(subStroke))
                        group.push(offset + split.id + i);
                }, this);

                result.push(split);
                offset += split.strokes.length - 1;
            }
        }, this);

        if (result.length > 0) {
            client.encoder.encodeSplit(result);
            client.addOperation();

            if (group.length > 0) {
                client.encoder.encodeUpdateColor(group.toUint32Array(), this.writer.color);
                client.addOperation();
            }

            client.send();
        }
    },

    redraw: function(dirtyArea) {...},
    refresh: function(dirtyArea) {...},
    clear: function() {...},
    clearCanvas: function() {...},
    restore: function(fileBuffer) {...}
};
```

### Step 2: Update the client to store the steps of this operation

Because this is a composite operation, create a thorough record of the steps.

Update the ```client``` object to add the ```transaction``` array. 
This array will store the steps of the composite operation. 
The ```addOperation``` method adds the encoded data from the current step to the array.

When a transaction is found, the ```send``` method sends it to the server. 
The ```receive``` method, when the ```transaction``` array is received, decodes all operation steps in the correct order. 
The correct events fire in succession and ensure that updates to the stroke model do not conflict with the actions of other collaborators.

When the ```onSplit``` event of the first operation fires, the completed second operation starts and the ```onUpdateColor``` event fires. 
As you work with local indexes, the ```transaction``` array ensures that the correct stroke is referenced.

Update the ```client``` object as follows:

```javascript
var client = {
    ...
    transaction: new Array(),

    init: function() {...},

    addOperation: function() {
        this.transaction.push(Module.readBytes(this.encoder.getBytes()));
        this.encoder.reset();
    },

    send: function(compose) {
        if (this.transaction.length > 0) {
            parent.server.recieve(this.id, this.transaction, false);
            this.transaction = new Array();
        }
        else {
            parent.server.recieve(this.id, Module.readBytes(this.encoder.getBytes()), compose);
            this.encoder.reset();
        }
    },

    recieve: function(sender, data) {
        ...

        if (data.constructor.name == "Array") {
            data.forEach(function(item) {
                Module.writeBytes(item, function(int64Ptr) {
                    this.decoder.decode(writer, int64Ptr);
                }, this);
            }, this);
        }
        else {
            Module.writeBytes(data, function(int64Ptr) {
                this.decoder.decode(writer, int64Ptr);
            }, this);
        }
    },

    callbacksHandlerImplementation: {
        ...

        onAdd: function(writer, strokes) {
            WILL.strokes.pushArray(strokes);
            WILL.redraw(strokes.bounds);
        },

        ...

        onUpdateColor: function(writer, group, color) {...},

        ...

        onSplit: function(writer, splits) {
            var strokesToRemove = new Array();

            splits.forEach(function(split) {
                var stroke = WILL.strokes[split.id];
                var replaceWith = new Array();

                split.intervals.forEach(function(interval, i) {
                    var subStroke = stroke.subStroke(interval.fromIndex, interval.toIndex, interval.fromTValue, interval.toTValue);
                    replaceWith.push(subStroke);
                }, this);

                strokesToRemove.push({stroke: stroke, replaceWith: replaceWith});
            }, this);

            strokesToRemove.forEach(function(strokeToRemove) {
                WILL.strokes.replace(strokeToRemove.stroke, strokeToRemove.replaceWith);
            }, this);

            if (strokesToRemove.length > 0)
                WILL.redraw(splits.affectedArea);
        },

        ...
    }
};
```

With this part of the tutorial, you have finished exploring the major stroke operations. 
In the examples so far, all operations happen instantly. 
In Part 6 of this tutorial, you will process composition operations with simulated latency.

**Note:** For the sake of clarity, method implementations from earlier in this tutorial are replaced with ... in the example code above.

### View sample

* View complete source code
* View sample

---
---
## Part 6: Composing strokes with latency

This part builds on the composition of strokes from Part 1 of this tutorial. 
The example is similar, but operations occur with some delay in this part.

In a real scenario, this latency depends on the network and is related with its bandwith. 
Composition happens instantly on the user's canvas, but the stroke enters the stroke model only when the server confirms it.

In Part 6 of this tutorial, you will enable multiple stroke creators and transfer stroke data over the network with simulated latency.

### Step 1: Update the stroke composition process to track active users

The initialization process and writer definition are unchanged from Part 1 of this tutorial.

Update the WILL configuration as follows:

```javascript
var WILL = {
    ...
    activeWriters: new Array(),

    init: function(width, height) {...},
    initInkEngine: function(width, height) {...},
    initEvents: function() {...},

    beginStroke: function(e) {
        ...

        client.encoder.encodeComposeStyle(this.writer.strokeRenderer);
        client.send();

        this.activeWriters.add(this.writer);

        ...
    },

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
                this.writer.strokeRenderer.draw(stroke);
                this.writer.strokeRenderer.blendStroke(this.strokesLayer, stroke.blendMode);
            }
        }, this);

        this.refresh(dirtyArea);
    },

    refresh: function (dirtyArea, redraw) {
        if (this.activeWriters.length == 0) {
            if (redraw)
                this.redraw(dirtyArea);
            else
                this.refreshCanvas(dirtyArea);

            return;
        }

        if (this.activeArea)
            this.activeArea = Module.RectTools.union(this.activeArea, dirtyArea);
        else
            this.activeArea = dirtyArea || this.viewArea;

        if (redraw)
            this.activeArea.redraw = true;

        if (!this.refreshTimeoutID) {
            this.refreshTimeoutID = setTimeout(function() {
                var activeArea = WILL.activeArea;
                delete WILL.activeArea;

                if (activeArea.redraw)
                    WILL.redraw(activeArea);
                else
                    WILL.refreshCanvas(activeArea);

                delete WILL.refreshTimeoutID;
                if (WILL.activeArea) WILL.refresh(WILL.activeArea);
            }, 16);
        }
    },

    refreshCanvas: function(dirtyArea) {
        if (!dirtyArea) dirtyArea = this.canvas.bounds;
        dirtyArea = Module.RectTools.ceil(dirtyArea);

        if (this.activeWriters.length > 0) {
            if (this.writer.inputPhase && this.writer.inputPhase == Module.InputPhase.Move)
                this.writer.strokeRenderer.drawPreliminary(this.preliminaryPathPart);

            this.canvas.clear(dirtyArea, this.backgroundColor);
            this.canvas.blend(this.strokesLayer, {rect: dirtyArea});

            this.activeWriters.forEach(function(writer) {
                writer.strokeRenderer.updatedArea = dirtyArea;
                writer.strokeRenderer.blendUpdatedArea();

                writer.unconfirmedStrokesData.forEach(function(data) {
                    this.canvas.blend(data.layer, {mode: data.blendMode, rect: dirtyArea});
                }, this);
            }, this);
        }
        else {
            this.canvas.clear(dirtyArea, this.backgroundColor);
            this.canvas.blend(this.strokesLayer, {rect: dirtyArea});
        }
    },

    clearCanvas: function() {...},
    restore: function(fileBuffer) {...}
};
```

WILL defines the ```activeWriters``` property, which is an array that contains all users who collaborate on the canvas. 
In this example, the incoming writer is stored as an element in the ```activeWriters``` array.

In the ```beginStroke``` method, the writer becomes active. 
However, the writer is not removed from the ```activeWriters``` array in the ```endStroke``` method. 
A writer becomes inactive only when the stroke is confirmed. 
This confirmation occurs when the ```onAdd``` event fires. 
When the server confirms a stroke, the stroke data is removed from the ```unconfirmedStrokesData``` array (which you will create in step 2). 
If there are no more elements in that array, and if the active writer is the current user and does not create additional strokes, the writer is removed from the ```activeWriters``` array.

When a user writes to the canvas, you need to refresh the canvas. 
The ```refresh``` method in this example is more complicated than the ```refresh``` method in Part 1. 
Here, the method defines an ```activeArea``` variable that contains all affected areas from the ```strokeRenderer``` instances of all active writers. 
A benefit of this method is that it gathers the combined input from all active writers. 
This minimises interaction with the canvas.

The ```refreshCanvas``` method refreshes data instantly and is called from the ```refresh``` method. 
The ```refreshCanvas``` method is extended with a loop through all active writers whose current input is to be displayed. 
It also reads all strokes that are finished but not confirmed, because their data does not yet exist in the ```strokesLayer``` layer.

### Step 2: Define an array to store unconfirmed stroke data

Define an ```unconfirmedStrokesData``` variable in the ```Writer``` constructor. 
This variable must contain all layers, stroke bounds, and the blend mode from the ```strokeRenderer``` constructor when a user completes a stroke locally.

Update the ```Writer``` constructor as follows:

```javascript
function Writer(id) {
    ...

    this.unconfirmedStrokesData = new Array();

    ...
}

Writer.prototype.compose = function(path, endStroke) {
    if (path.points.length == 0)
        return;

    this.strokeRenderer.draw(path, endStroke, this.id != client.id);

    if (endStroke) {
        this.unconfirmedStrokesData.push({layer: this.strokeRenderer.layer, strokeBounds: this.strokeRenderer.strokeBounds, blendMode: this.strokeRenderer.blendMode});
        this.strokeRenderer.layer = WILL.canvas.createLayer();

        delete this.inputPhase;
    }

    if (this.strokeRenderer.updatedArea)
        WILL.refresh(this.strokeRenderer.updatedArea);

    if (this.id == client.id) {
        client.encoder.encodeComposePathPart(path, this.strokeRenderer.color, true, false, endStroke);
        client.send(true);
    }
}

Writer.prototype.abort = function() {
    ...

    WILL.activeWriters.remove(this);

    ...
}
```

### Step 3: Update the client to use the list of active writers

Update the ```client``` object to use the list of active writers as follows:

```javascript
var client = {
    ...

    init: function() {...},
    send: function(compose) {...},
    recieve: function(sender, data) {...},

    callbacksHandlerImplementation: {
        onComposeStyle: function(writer, style) {...},

        onComposePathPart: function(writer, path, endStroke) {
            if (writer.id == client.id) return;

            WILL.activeWriters.add(writer);
            writer.compose(path, endStroke);
        },

        onComposeAbort: function(writer) {...},

        onAdd: function(writer, strokes) {
            strokes.forEach(function(stroke) {
                WILL.strokes.push(stroke);

                var data = writer.unconfirmedStrokesData.shift();
                WILL.strokesLayer.blend(data.layer, {mode: data.blendMode, rect: data.strokeBounds});

                if (writer.unconfirmedStrokesData.length == 0 && !writer.inputPhase)
                    WILL.activeWriters.remove(writer);

                data.layer.delete();

                WILL.refresh(data.strokeBounds, false);
            }, this);
        },

        ...
    }
};
```

At the end of the ```onAdd``` event, the unconfirmed layer is deleted. 
Its memory is found in HEAP. 
Release this memory manually.

**Note:* For the sake of clarity, method implementations from earlier in this tutorial are replaced with ... in the example code above.

### View sample

* View complete source code
* View sample

---
---
