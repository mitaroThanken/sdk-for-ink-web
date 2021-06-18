class InkCanvasRasterRuntime extends InkCanvas {
	constructor(canvas, width, height) {
		super();

		this.canvas = InkCanvasGL.createInstance(canvas, width, height);
		this.strokeRenderer = new StrokeRendererGL(this.canvas);
	}

	async init(device, toolID, color) {
		await BrushPalette.configure(this.canvas.ctx);

		await super.init(device, toolID, color);
	}

	getGLContext() {
		return this.canvas.ctx;
	}

	present(dirtyArea, phase) {
		if (phase == InkBuilder.Phase.END) {
			this.strokeRenderer.blendStroke(this.strokesLayer);

			this.canvas.clear();
			this.refresh2D(this.strokeRenderer.strokeBounds);

			return;
		}

		this.refresh(dirtyArea, true);

		if (phase == InkBuilder.Phase.UPDATE)
			this.strokeRenderer.blendUpdatedArea();
	}

	refresh(dirtyArea = this.canvas.bounds, model = false) {
		let modelArea = model ? dirtyArea : this.lens.viewToModel(dirtyArea).floor();
		let viewArea = model ? this.lens.modelToView(dirtyArea).ceil() : dirtyArea;

		this.canvas.clear(viewArea);
		this.canvas.blend(this.strokesLayer, {sourceRect: modelArea, destinationRect: viewArea});
	}
}
