class InkCanvasVector extends InkCanvas {
	constructor(canvas, width, height) {
		super();

		this.canvas = InkCanvas2D.createInstance(canvas, width, height);
		this.strokesLayer = this.canvas.createLayer();
		this.originLayer = this.canvas.createLayer();

		this.strokeRenderer = new StrokeRenderer2D(this.canvas);

		this.strokeRendererOrigin = new StrokeRenderer2D(this.canvas);
		this.strokeRendererOrigin.layer.resize(this.originLayer.width, this.originLayer.height);
	}

	setTool(toolID) {
		super.setTool(toolID);

		if (config.getBrush(toolID) instanceof BrushGL) {
			this.inkCanvasRaster.setTool(this.toolID);
			this.forward = true;
		}
		else
			this.forward = false;
	}
	
	delete() {
		//this.strokeRenderer.delete();
		//this.canvas.delete();		
	}
	
	toImage(rect, mimeType) {
		let canvas = document.createElement("canvas");
		let context = canvas.getContext("2d");		

		canvas.width = rect.width;
		canvas.height = rect.height;
		
		let pixels = this.strokesLayer.readPixels(rect);				

		// Copy the pixels to a 2D canvas
		let imageData = context.createImageData(rect.width, rect.height);
		
		imageData.data.set(pixels);
		context.putImageData(imageData, 0, 0);
		
		if (mimeType == "image/png") {
			return canvas.toDataURL(mimeType);
		} else {
		    var newCanvas = canvas.cloneNode(true);
            var ctx = newCanvas.getContext('2d');
            ctx.fillStyle = "#FFF";
            ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
            ctx.drawImage(canvas, 0, 0);
            return newCanvas.toDataURL(mimeType);
		}		
	}
}
