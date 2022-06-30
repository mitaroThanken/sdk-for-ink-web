class InkCanvasVector extends InkCanvas {
	constructor(canvas, width, height) {
		super();

		this.canvas = InkCanvas2D.createInstance(canvas, width, height);
		this.strokesLayer = this.canvas.createLayer();
		this.originLayer = this.canvas.createLayer();

		this.strokeRenderer = new StrokeRenderer2D(this.canvas);
		this.strokeRendererOrigin = new StrokeRenderer2D(this.canvas, {width: this.originLayer.width, height: this.originLayer.height});

		this.lens = new Lens(this.canvas, {
			refresh: transform => {
				this.canvas.clear();
				this.canvas.blend(this.originLayer, {transform});

				layout.updatePaper(transform);
			},
			redraw: utils.debounce(transform => {
				this.preventOriginRedraw = true;

				this.strokeRenderer.setTransform(transform);
				this.redraw();

				this.preventOriginRedraw = false;
			}, 300),
			abort: this.abort.bind(this)
		});

		this.lens.modelBounds = this.originLayer.bounds;
		layout.setPaperSize(this.originLayer.width, this.originLayer.height);

		this.selection = new SelectionVector(this.dataModel, {
			modelSize: this.originLayer.bounds,
			lens: this.lens,
			canvas: this.canvas,
			strokesLayer: this.strokesLayer,
			refresh: this.refresh.bind(this),
			redraw: this.redraw.bind(this)
		});

		this.selection.connect();
	}

	async setTool(toolID) {
		super.setTool(toolID);

		if (app.config.getBrush(toolID) instanceof BrushGL) {
			await this.activateRasterCanvas();

			this.inkCanvasRaster.setTool(this.toolID);
		}
		else
			this.deactivateRasterCanvas();
	}

	setColor(color) {
		super.setColor(color);

		if (this.inkCanvasRaster) this.inkCanvasRaster.setColor(color);
	}

	async allocateRasterCanvas() {
		protector.open();

		let canvas = document.querySelector("#raster-runtime");

		this.inkCanvasRaster = new InkCanvasRasterRuntime(canvas);

		this.inkCanvasRaster.strokesLayer = this.strokesLayer;

		this.inkCanvasRaster.lens = this.lens;
		// this.inkCanvasRaster.history = this.history;

		this.inkCanvasRaster.refresh2D = (dirtyArea) => this.refresh(dirtyArea);

		await this.inkCanvasRaster.init(this.builder.device, this.toolID, this.color);

		protector.close();
	}

	async getGLContext() {
		if (!this.inkCanvasRaster) await this.allocateRasterCanvas();

		return this.inkCanvasRaster.canvas.ctx;
	}

	async activateRasterCanvas() {
		if (!this.inkCanvasRaster) await this.allocateRasterCanvas();
		if (this.inkCanvasRaster.canvas.surface.style.display == "") return;

		InputListener.close(this);
		InputListener.open(this.inkCanvasRaster);

		this.inkCanvasRaster.canvas.surface.style.display = "";
	}

	deactivateRasterCanvas() {
		if (!this.inkCanvasRaster || this.inkCanvasRaster.canvas.surface.style.display == "none") return;

		InputListener.close(this.inkCanvasRaster);
		InputListener.open(this);

		this.inkCanvasRaster.canvas.surface.style.display = "none";
	}
}
