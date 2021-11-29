class SelectionRaster extends Selection {
	constructor(canvasBridge, options) {
		super(canvasBridge.lens, options);

		this.canvasBridge = canvasBridge;

		this.maskLayer = this.canvasBridge.canvas.createLayer();
		this.layer = this.canvasBridge.canvas.createLayer();

		this.canvasSelector = this.canvasBridge.canvas.surface.className;
		this.selectionSelector = ".selection-raster";
		this.importSelector = ".import-image";
	}

	open(stroke) {
		let polygons = Poly.simplify(stroke.spline);
		if (polygons.length == 0) return;

		super.open(stroke.bounds, stroke.spline);

		this.createRasterSelection(polygons);
	}

	openRect(pos, bounds, data) {
		super.open(bounds, undefined, pos);

		this.createRasterSelection(data);
		this.refresh();
	}

	openPath(pos, path, data, state) {
		super.open(path.bounds, path, pos, state);

		this.createRasterSelection(data);
		this.refresh();
	}

	createRasterSelection(input) {
		if (input instanceof ImageData)
			this.layer.putImageData(input);
		else {
			if (this.type == Selection.Type.PATH) {
				let dirtyArea = this.maskLayer.fill(input, Color.WHITE, true);
				// this.canvasBridge.canvas.ctx.flush();

				if (!dirtyArea)
					this.close();
			}
			else {
				let viewArea = this.bounds.transform(this.lens.transform.invert()).floor();

				this.layer.blend(input, {sourceRect: input.bounds, destinationRect: viewArea});
			}
		}
	}

	refresh() {
		let viewTransform = this.lens.transform.multiply(this.lastTransform);

		this.canvasBridge.refresh(this.dirtyArea);
		this.canvasBridge.canvas.blend(this.layer, {transform: viewTransform});
	}

	extractSelection() {
		this.layer.blend(this.canvasBridge.strokesLayer, {mode: BlendMode.NONE});
		this.layer.blend(this.maskLayer, {mode: BlendMode.DESTINATION_IN});
	}

	cutOutSelection() {
		this.canvasBridge.strokesLayer.blend(this.maskLayer, {mode: BlendMode.DESTINATION_OUT});
	}

	beginTransform() {
		// this.canvasBridge.history.add();

		this.extractSelection();
		this.cutOutSelection();
	}

	transform() {
		this.refresh();
	}

	completeTransform() {
		let modelTransform = this.lens.transform.multiply(this.lastTransform).multiply(this.lens.transform.invert());
		let viewTransform = this.lastTransform.multiply(this.lens.transform.invert());

		this.dirtyArea = this.bounds.transform(viewTransform).intersect(this.layer.bounds);

		if (this.dirtyArea)
			this.dirtyArea = this.dirtyArea.ceil();
		else {
			console.warn("view transform out of bounds", this.bounds.transform(viewTransform).toString())
			return;
		}

		// this.canvasBridge.history.add();

		this.maskLayer.blend(this.layer, {mode: BlendMode.COPY, transform: modelTransform});
		this.layer.blend(this.maskLayer, {mode: BlendMode.COPY, rect: this.dirtyArea});

		this.canvasBridge.strokesLayer.blend(this.layer, {rect: this.dirtyArea});
	}

	copy(cut) {
		if (!this.lastTransformArea)
			this.extractSelection();

		this.clipboard = {
			path: this.selector,
			data: this.layer.getImageData(this.selector.bounds)
		};

		if (this.lastOrigin) {
			let transform = this.lens.transform.invert();
			let modelTransform = this.lens.transform.multiply(this.lastTransform).multiply(transform);

			this.clipboard.state = {
				origin: this.lastOrigin.transform(transform),
				transform: modelTransform
			};
		}

		if (cut)
			this.delete();
		else
			this.close();
	}

	paste(pos) {
		this.openPath(pos, this.clipboard.path, this.clipboard.data, this.clipboard.state);
	}

	delete() {
		// this.canvasBridge.history.add();

		this.layer.clear();
		this.canvasBridge.strokesLayer.blend(this.maskLayer, {mode: BlendMode.DESTINATION_OUT});

		this.canvasBridge.refresh(this.dirtyArea || this.bounds);

		this.close();
	}

	async export() {
		if (!this.lastTransformArea)
			this.extractSelection();

		this.close(async () => {
			let data = await this.layer.toBlob(this.dirtyArea || this.bounds);
			fsx.saveAs(data, "selection.png", "image/png");
		});
	}

	async import(input, pos) {
		let image = await fsx.loadImage(input);
		let bounds = new Rect(0, 0, image.width, image.height);
		let layer = this.canvasBridge.canvas.createLayer({width: image.width, height: image.height});

		layer.fillTexture(image);

		this.openRect(pos, bounds, layer);
	}

	reset() {
		super.reset();

		this.layer.clear();
		this.maskLayer.clear();
	}
}
