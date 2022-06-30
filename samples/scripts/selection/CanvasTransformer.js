class CanvasTransformer extends CanvasBubble {
	constructor(lens, width, height, modelSize) {
		super(".layer-transforms", lens, width, height);

		this.modelSize = modelSize;

		this.canvas = InkCanvas2D.createInstance(this.surface, width, height);
		this.originLayer = this.canvas.createLayer(modelSize);
		this.maskLayer = this.canvas.createLayer(modelSize);

		this.strokeRenderer = new StrokeRenderer2D(this.canvas, modelSize);
	}

	draw(strokes) {
		this.canvas.clear();
		this.originLayer.clear();

		if (!this.modelSize)
			this.strokeRenderer.setTransform(this.transform);

		this.strokeRenderer.blendStrokes(strokes, this.originLayer);

		this.selection = false;
	}

	refresh(transform, dirtyArea) {
		if (this.selection) {
			this.refreshSelection(transform, dirtyArea);
			return;
		}

		if (this.modelSize) {
			if (transform)
				transform = this.transform.multiply(transform);
			else
				transform = this.transform;
		}

		this.canvas.clear(dirtyArea);
		this.canvas.blend(this.originLayer, {transform});
	}

	createSelection(contours) {
		this.selection = true;

		this.originLayer.clear();
		this.maskLayer.clear();

		this.maskLayer.fill(contours, Color.WHITE);
	}

	extractSelection(strokesLayer) {
		this.originLayer.blend(strokesLayer, {mode: BlendMode.NONE});
		this.originLayer.blend(this.maskLayer, {mode: BlendMode.DESTINATION_IN});

		// cutOutSelection
		strokesLayer.blend(this.maskLayer, {mode: BlendMode.DESTINATION_OUT});
	}

	refreshSelection(transform, dirtyArea) {
		this.canvas.clear(dirtyArea);
		this.canvas.blend(this.originLayer, {transform});
	}

	hide() {
		super.hide();

		this.reset();
	}

	reset() {
		this.selection = false;
	}
}
