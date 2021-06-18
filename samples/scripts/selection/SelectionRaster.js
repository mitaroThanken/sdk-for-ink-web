class SelectionRaster extends Selection {
	constructor(canvasBridge, options) {
		super(canvasBridge.lens, options);

		this.convexHullChainProducer = new ConvexHullChainProducer();

		this.canvasBridge = canvasBridge;

		this.maskLayer = this.canvasBridge.canvas.createLayer();
		this.layer = this.canvasBridge.canvas.createLayer();

		this.canvasSelector = this.canvasBridge.canvas.surface.className;
		this.selectionSelector = ".selection-raster";
		this.importSelector = ".import-image";
	}

	open(stroke) {
		let path = this.convexHullChainProducer.build([stroke.points]);
		let bounds = path.bounds;

		path = path.first;

		super.open(bounds, path);

		this.createRasterSelection(path);
	}

	openRect(pos, bounds, data) {
		super.open(bounds, undefined, pos);

		this.createRasterSelection(data);
		this.refresh();
	}

	openPath(pos, path, data, state) {
		let bounds = Rect.ofPolygon(path);

		super.open(bounds, path, pos, state);

		this.createRasterSelection(data);
		this.refresh();
	}

	createRasterSelection(input) {
		if (input instanceof Uint8ClampedArray || input instanceof Uint8Array)
			this.layer.writePixels(input, this.bounds.transform(this.lens.transform.invert()));
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
		// this.canvasBridge.history.add();

		let modelTransform = this.lens.transform.multiply(this.lastTransform).multiply(this.lens.transform.invert());
		let viewTransform = this.lastTransform.multiply(this.lens.transform.invert());

		this.dirtyArea = this.bounds.transform(viewTransform).intersect(this.layer.bounds).ceil();

		this.maskLayer.blend(this.layer, {mode: BlendMode.COPY, transform: modelTransform});
		this.layer.blend(this.maskLayer, {mode: BlendMode.COPY, rect: this.dirtyArea});

		this.canvasBridge.strokesLayer.blend(this.layer, {rect: this.dirtyArea});
	}

	copy(cut) {
		if (!this.lastTransformArea)
			this.extractSelection();

		let transform = this.lens.transform.invert();
		let path = new InkPath2D(this.path.clone());

		path.transform(transform);
		path = path.first;

		this.clipboard = {
			path: path,
			data: this.layer.readPixels(this.bounds.transform(transform))
		};

		if (this.lastOrigin) {
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
		this.openPath(pos, Object.clone(this.clipboard.path), this.clipboard.data, this.clipboard.state);
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
