class SelectionVector extends Selection {
	constructor(dataModel, canvasBridge, options) {
		super(canvasBridge.lens, options);

		this.dataModel = dataModel;
		this.canvasBridge = canvasBridge;

		this.canvasTransformer = new CanvasTransformer(canvasBridge.lens, canvasBridge.canvas.width, canvasBridge.canvas.height, canvasBridge.modelSize);
		this.codec = new InkCodec();

		this.strokes = [];

		this.canvasSelector = this.canvasBridge.canvas.surface.className;
		this.selectionSelector = ".selection-vector";
		this.importSelector = ".import-file";
	}

	open(selectorMode, selection, stroke) {
		this.selectorMode = selectorMode;

		if (selectorMode == Selector.Mode.WHOLE_STROKE) {
			this.strokes = this.dataModel.getStrokes(selection.selected);

			super.open(this.dataModel.calcBounds(this.strokes));
		}
		else {
			this.selection = selection;

			super.open(selection.bounds, stroke.spline);

			let contours = selection.contours;
			contours.transform(this.lens.transform);

			this.canvasTransformer.createSelection(contours);
		}
	}

	async openData(strokes, pos) {
		if (strokes.length == 0) return;

		this.selectorMode = Selector.Mode.WHOLE_STROKE;

		let bounds;

		preloader.open("Open file in progress. Please wait...");

		this.strokes = strokes.slice();

		for (let stroke of strokes) {
			if (pos) await this.dataModel.add(stroke);
			bounds = stroke.bounds.union(bounds);
		}

		this.canvasTransformer.draw(this.strokes);

		preloader.close();

		super.open(bounds, undefined, pos);

		if (pos)
			this.canvasTransformer.show();
	}

	beginTransform() {
		if (this.selectorMode == Selector.Mode.WHOLE_STROKE) {
			this.canvasTransformer.draw(this.strokes);
			this.canvasBridge.redraw(this.bounds, this.strokes);
		}
		else {
			this.split();

			this.canvasTransformer.extractSelection(this.canvasBridge.strokesLayer);
			this.canvasBridge.refresh();
		}

		this.canvasTransformer.show();
	}

	transform() {
		this.canvasTransformer.refresh(this.lastTransform, this.dirtyArea);
	}

	async split() {
		let dirtyArea = await this.dataModel.update(this.selection);
		dirtyArea = dirtyArea.transform(this.lens.transform);

		this.strokes = this.dataModel.getStrokes(this.selection.selected);
		delete this.selection;

		if (this.selectorMode == Selector.Mode.PARTIAL_INCLUSIVE)
			this.bounds = this.dataModel.calcBounds(this.strokes);

		// recover split area
		this.canvasBridge.redraw(dirtyArea, this.strokes);

		if (this.complete)
			this.complete();

		return dirtyArea;
	}

	wait() {
		return new Promise((resolve, reject) => {
			this.complete = resolve;
		});
	}

	async completeTransform() {
		let dirtyArea = this.bounds.transform(this.lastTransform).ceil();

		preloader.open(dirtyArea);

		if (this.selection) {
			preloader.setMessage("Transform in progress (split in progress) - please wait...");

			await this.wait();
			delete this.complete;

			if (this.selectorMode == Selector.Mode.PARTIAL_INCLUSIVE)
				dirtyArea = this.bounds.transform(this.lastTransform).ceil();
		}

		preloader.setMessage("Transform in progress - please wait...");

		let modelTransform = this.lens.transform.multiply(this.lastTransform).multiply(this.lens.transform.invert());

		await this.dataModel.transform(modelTransform, ...this.strokes);

		this.canvasBridge.redraw(dirtyArea);

		preloader.close();
	}

	async changeStrokesColor(color) {
		let dirtyArea = this.selection ? await this.split() : this.dirtyArea || this.bounds;

		this.strokes.forEach(stroke => (stroke.color = color));

		this.canvasTransformer.draw(this.strokes);
		this.canvasTransformer.refresh(this.lastTransform);

		if (!this.lastTransform) {
			this.lastTransform = new Matrix();
			this.canvasTransformer.show();
		}
	}

	async copy(cut) {
		let strokes;

		await this.close(async () => {
			if (this.selection) {
				let dirtyArea = this.bounds.transform(this.lastTransform).ceil();

				preloader.open(dirtyArea, "Copy in progress - please wait...");

				if (cut) {
					await this.split();
					strokes = this.strokes.clone();
				}
				else
					strokes = await this.cloneSelectedStrokes();

				preloader.close();
			}
			else
				strokes = this.strokes.clone();

			if (cut)
				await this.delete();

			strokes.bounds = this.bounds;
		});

		delete this.clipboard;
		if (strokes.length > 0) this.clipboard = strokes;
	}

	async cloneSelectedStrokes() {
		let {intersected, selected} = this.selection;

		let rebuild = [];
		let cache = {};

		for (let strokeID in intersected) {
			let stroke = this.dataModel.inkModel.getStroke(strokeID);
			let strokes = stroke.split(intersected[strokeID]);

			rebuild.push(...strokes);
			strokes.forEach(stroke => cache[stroke.id] = stroke);
		}

		if (rebuild.length > 0) {
			let settings = {
				keepAllData: [PipelineStage.SPLINE_INTERPOLATOR, PipelineStage.BRUSH_APPLIER],
				keepSplineParameters: true
			};

			await app.inkStorage.importBridge.build(rebuild, settings);
		}

		return selected.map(strokeID => cache[strokeID] || this.dataModel.inkModel.getStroke(strokeID).clone());
	}

	async paste(pos) {
		let dirtyArea = this.clipboard.bounds;
		let offsetX = pos.x - dirtyArea.center.x;
		let offsetY = pos.y - dirtyArea.center.y;

		dirtyArea = new Rect(dirtyArea.x + offsetX, dirtyArea.y + offsetY, dirtyArea.width, dirtyArea.height);

		preloader.open(dirtyArea, "Paste in progress - please wait...");
		await app.sleep(1600);

		let strokes = [];

		for (let i = 0; i < this.clipboard.length; i++) {
			strokes.push(this.clipboard[i].clone());

			preloader.setProgress(Math.round(100 * ((i+1) / this.clipboard.length)));

			if (i % 50 == 0)
				await app.sleep(16);
		}

		preloader.setProgress(100);
		await app.sleep(16);

		this.openData(strokes, pos);

		preloader.close();
	}

	async delete() {
		if (this.selection)
			preloader.open(this.bounds, "Delete in progress - please wait...");

		let dirtyArea = this.selection ? await this.split() : this.dirtyArea || this.bounds;

		await this.dataModel.remove(...this.strokes);
		this.strokes.clear();

		this.canvasBridge.redraw(dirtyArea);

		await this.close();
		preloader.close();
	}

	export() {
		this.close(async () => {
			let strokes = this.strokes;

			if (!this.canvasBridge.lens.transform.isIdentity) {
				preloader.open("Export in progress - please wait...");

				// strokes = this.strokes.map(stroke => stroke.clone());
				// strokes.forEach(stroke => stroke.transform(this.canvasBridge.lens.transform));

				strokes = [];

				for (let i = 0; i < this.strokes.length; i++) {
					let stroke = this.strokes[i].clone();
					stroke.transform(this.canvasBridge.lens.transform);

					strokes.push(stroke);

					preloader.setProgress(Math.round(100 * ((i+1) / this.strokes.length)));

					if (i % 10 == 0)
						await app.sleep(16);
				}

				preloader.close();
			}

			let data = await this.codec.encodeInkData(strokes);

			if (window.showSaveFilePicker)
				await app.inkStorage.saveFilePicker(data, "INK");
			else
				fsx.saveAs(data, "selection.ink", "application/vnd.google.protobuf");
		});
	}

	async import(input, pos) {
		let strokes = this.codec.decodeInkData(input);
		let brushes = this.extractBrushes(strokes);

		preloader.open("Import in progress - please wait...");
		await app.inkStorage.pipeline(strokes, brushes);
		preloader.close();

		this.openData(strokes, pos);
	}

	extractBrushes(strokes) {
		let brushes = {};
		strokes.forEach(stroke => (brushes[stroke.brush.name] = stroke.brush));
		return Object.values(brushes);
	}

	reset() {
		super.reset();

		delete this.selection;

		this.strokes.clear();
		this.canvasTransformer.hide();
	}
}
