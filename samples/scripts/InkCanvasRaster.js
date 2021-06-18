class InkCanvasRaster extends InkCanvasRasterRuntime {
	constructor(canvas, width, height) {
		super(canvas, width, height);

		this.strokesLayer = this.canvas.createLayer();

		this.lens = new Lens(this.canvas, {
			refresh: transform => {
				this.canvas.clear();
				this.canvas.blend(this.strokesLayer, {transform: transform});
			},
			abort: this.abort.bind(this)
		});

		this.selection = new SelectionRaster({
			lens: this.lens,
			canvas: this.canvas,
			strokesLayer: this.strokesLayer,
			refresh: this.refresh.bind(this)
		});

		this.selection.connect();
	}

	present(dirtyArea, phase) {
		if (phase == InkBuilder.Phase.END) {
			// this.history.add(this.strokeRenderer.strokeBounds);

			this.strokeRenderer.blendStroke(this.strokesLayer);
		}

		this.canvas.clear();
		this.canvas.blend(this.strokesLayer, {transform: this.transform});

		if (phase == InkBuilder.Phase.UPDATE) {
			if (app.prediction)
				this.canvas.blend(this.strokeRenderer.preliminaryLayer, {mode: this.strokeRenderer.blendMode, transform: this.transform});
			else
				this.canvas.blend(this.strokeRenderer.layer, {mode: this.strokeRenderer.blendMode, transform: this.transform});
		}
	}
}
