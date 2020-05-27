# Tutorial 5: Working with rasters

In this tutorial, you will learn how to mask layers and manipulate pixels behind the mask. 
The tutorial is divided into the following parts:

* [Part 1: Displaying raster images](#part-1-displaying-raster-images)
* [Part 2: Creating image masks](#part-2-creating-image-masks)

Each part builds on the previous part, extending and improving its functionality.

## Prerequisites:

This tutorial continues from the following:

* Part 1, Part 2, and Part 3 of Tutorial 1: Drawing with pointing devices
* Part 1 of Tutorial 4: Selecting strokes

## Source code
You can find the sample project in the following location:

```HTML and JavaScript: /web/tutorials/Sample5```

---
---
## Part 1: Displaying raster images

Although the WILL SDK *Rasterizer* module is not a general-purpose 2D drawing engine, it can draw raster images. 
In this tutorial, you will display and mask images using the functionality provided in the SDK.

In Part 1 of this tutorial, you will load and display a raster image. 
Loading an image involves reading its pixels and adding them in a texture.

### Step 1: Create a layer to hold the raster image

Create a layer for an image. 
For the dimensions of the layer, use the dimensions of the image. 
The ```texture``` property is used to access the texture.

The ```Module.GLTools``` library is a set of useful tools for working with textures. 
Fill the texture with pixel data using the ```Module.GLTools.prepareTexture``` method, as described in Part 5 of Tutorial 1: Drawing with pointing devices.

Use the ```blend``` method to copy the image data over the ink canvas.

```javascript
var WILL = {
    backgroundColor: Module.Color.from(190, 143, 1),

    init: function(width, height) {
        this.initInkEngine(width, height);
    },

    initInkEngine: function(width, height) {
        this.canvas = new Module.InkCanvas(document.getElementById("canvas"), width, height);
        this.canvas.clear(this.backgroundColor);

        this.initImageLayer();
    },

    initImageLayer: function() {
        var url = location.toString();
        url = url.substring(0, url.lastIndexOf("/")) + "/image.png";

        this.imageLayer = this.canvas.createLayer({width: 750, height: 600});

        Module.GLTools.prepareTexture(
            this.imageLayer.texture,
            url,
            function(texture) {
                this.canvas.blend(this.imageLayer, {mode: Module.BlendMode.NONE});
            },
            this
        );
    }
};

Module.addPostScript(function() {...});
```
**Note:** For the sake of clarity, method implementations from earlier tutorials are replaced with ... in the example code above.

### View sample
* View sample

---
---
## Part 2: Creating image masks

You want to mask a part of the image. 
To do this, you need a selection tool to define the area you want to extract. 
This tutorial builds on the stroke selection tool that you built in Part 1 of Tutorial 4: Selecting strokes.

In Part 2 of this tutorial, you will learn how to select an area of an image and mask it.

### Step 1: Initiate the image layer

In Part 1 of this tutorial, you created a layer for an image with a predefined width and height.

In this part, use a different approach. 
When you load an image, you do not know the dimensions of the image at first. 
Instead, create a layer only when you have determined the dimensions of the image.

### Step 2: Select a region of the canvas

When a new selection begins, recover the canvas to the initial state. 
This step introduces the blend mode ```MULTIPLY_NO_ALPHA```.

The code for these steps is as follows:

```javascript
var WILL = {
    color: Module.Color.from(0, 151, 212),
    backgroundColor: Module.Color.from(190, 143, 1),

    strokeWidth: 1.25,

    init: function(width, height) {...},
    initInkEngine: function(width, height) {
        ...

        this.maskLayer = this.canvas.createLayer();
        this.initImageLayer();

        this.brush = new Module.DirectBrush();

        this.pathBuilder = new Module.SpeedPathBuilder();
        this.smoothener = new Module.MultiChannelSmoothener(this.pathBuilder.stride);

        this.strokeRenderer = new Module.StrokeRenderer(this.canvas, this.canvas);
        this.strokeRenderer.configure({brush: this.brush, color: this.color, width: this.strokeWidth});
    },

    initImageLayer: function() {
        var url = location.toString();
        url = url.substring(0, url.lastIndexOf("/")) + "/image.png";

        Module.GLTools.prepareTexture(
            Module.GLTools.createTexture(GLctx.CLAMP_TO_EDGE, GLctx.LINEAR),
            url,
            function(texture) {
                this.imageLayer = this.canvas.createLayer({texture: texture, ownGlResources: true});
                this.canvas.blend(this.imageLayer, {mode: Module.BlendMode.NONE});
            },
            this
        );
    },

    initEvents: function() {...},
    beginStroke: function(e) {...},
    moveStroke: function(e) {...},
    endStroke: function(e) {...},
    buildPath: function(pos) {...},
    drawPath: function() {...},

    select: function() {
        this.maskLayer.clear(Module.Color.from(0, 0, 0));
        this.maskLayer.fillPath(this.path, Module.Color.from(255, 255, 255), true);

        this.clear();
        this.canvas.blend(this.maskLayer, {mode: Module.BlendMode.MULTIPLY_NO_ALPHA});
    },

    clear: function() {
        this.canvas.clear(this.backgroundColor)
        this.canvas.blend(this.imageLayer, {mode: Module.BlendMode.NONE});
    }
};

Module.addPostScript(function() {...});
```

The ```Module.GLTools.createTexture``` method creates a new, completed texture. 
This texture is accessible in callback, and you can use the ```createLayer``` method to define a layer with predefined data. 
```ownGlResources``` parameter tells the layer who is responsible for the memory management of this texture. 
You can give this responsibility to the ink engine when the texture does not have any other purpose.

When your selection tool defines the area, you call the ```fillPath``` method with the whole path from the path builder. 
The key step here is to draw the mask layer over the image layer using the ```MULTIPLY_NO_ALPHA``` blend mode. 
This will cut out the part of the image closed by the path.

**Note:** For the sake of clarity, method implementations from earlier in this tutorial are replaced with ... in the example code above.

### View sample
* View complete source code
* View sample

---
---
