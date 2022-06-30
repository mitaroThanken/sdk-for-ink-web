class InkCanvas extends InkController {
	constructor() {
		super();

		let queue = Promise.resolve();
		let queueLength = 0;

		this.builder = new InkBuilder();

		this.builder.onComplete = (pathPart) => {
			if (this.intersector) {
				let eraser = app.config.tools[this.toolID];

				if (eraser.blendMode != BlendMode.DESTINATION_OUT) {
					pathPart = {
						phase: pathPart.phase,
						added: pathPart.added ? pathPart.added.clone() : pathPart.added
					}
				}

				pathPart.toolID = this.toolID;
				pathPart.intersector = this.intersector;

				if (queueLength == 0)
					InputListener.stop();

				queueLength++;

				queue = queue.then(this.erase.bind(this, pathPart)).then(() => {
					queueLength--;

					if (queueLength == 0)
						InputListener.start();
				});
			}
			else if (this.selector)
				this.select(pathPart);
			else
				this.draw(pathPart);
		};

		this.dataModel = app.model;

		Object.defineProperty(this, "strokes", {get: () => this.dataModel.inkModel.content, enumerable: true});
		Object.defineProperty(this, "transform", {get: () => this.lens.transform, set: value => (this.lens.transform = value), enumerable: true});
	}

	init(device, toolID, color) {
		this.builder.device = device;

		this.setTool(toolID);
		this.setColor(color);
	}

	setTool(toolID) {
		this.toolID = toolID;

		this.intersector = app.config.tools[toolID].intersector;
		this.selector = app.config.tools[toolID].selector;
		/*
		if (this.toolID == "basic") {
			this.device = this.builder.device;
			this.builder.device = null;
		}
		else
			this.builder.device = this.device;
		*/
	}

	setColor(color) {
		this.color = color;
	}

	registerInputProvider(pointerID, isPrimary) {
		if (Array.isArray(pointerID)) {
			// multi-touch should handle all changedTouches and to assign builders for each other
			if (isNaN(this.builder.pointerID))
				this.builder.pointerID = pointerID.first;
		}
		else {
			if (isPrimary)
				this.builder.pointerID = pointerID;
		}
	}

	getInkBuilder(pointerID) {
		if (Array.isArray(pointerID)) {
			if (pointerID.length > 0 && !pointerID.includes(this.builder.pointerID)) return undefined;
			return this.builder;
		}
		else
			return (this.builder.pointerID == pointerID) ? this.builder : undefined;
	}

	reset(sensorPoint) {
		let options = app.config.getOptions(sensorPoint, this.toolID, this.color);

		this.builder.configure(options.inkBulder);
		this.strokeRenderer.configure(options.strokeRenderer);

		if (this.intersector) {
			this.intersector.reset(this.dataModel.manipulationsContext);

			this.builder.pathProducer.prediction = false;
		}
		else
			this.builder.pathProducer.prediction = app.prediction;

		if (this.selector)
			this.selector.reset(this.dataModel.manipulationsContext);
	}

	begin(sensorPoint) {
		this.reset(sensorPoint);

		this.builder.add(sensorPoint);
		this.builder.build();
	}

	move(sensorPoint, prediction, e) {
		if (app.downsampling && this.requested) {
			this.builder.ignore(sensorPoint);
			return;
		}

		this.builder.add(sensorPoint, app.pointerPrediction ? prediction : undefined);

		if (!this.requested) {
			this.requested = true;

			this.builder.build();

			requestAnimationFrame(() => (this.requested = false));
		}
	}

	end(sensorPoint) {
		this.builder.add(sensorPoint);
		this.builder.build();
	}

	draw(pathPart) {
		this.drawPath(pathPart);

		if (pathPart.phase == InkBuilder.Phase.END) {
			if (this.strokeRenderer) {
				let stroke = this.strokeRenderer.toStroke(this.builder);
				this.dataModel.add(stroke);

				this.drawOrigin(stroke);
			}
		}
	}

	drawPath(pathPart) {
		this.strokeRenderer.draw(pathPart.added, pathPart.phase == InkBuilder.Phase.END);

		if (pathPart.phase == InkBuilder.Phase.UPDATE) {
			this.strokeRenderer.drawPreliminary(pathPart.predicted);

			let dirtyArea = this.canvas.bounds.intersect(this.strokeRenderer.updatedArea);

			if (dirtyArea)
				this.present(dirtyArea, pathPart.phase);
		}
		else if (pathPart.phase == InkBuilder.Phase.END) {
			if (!this.strokeRenderer.strokeBounds) return;
			if (this.selector || this.intersector || this.toolID == "selector") return;

			let dirtyArea = this.canvas.bounds.intersect(this.strokeRenderer.strokeBounds.union(this.strokeRenderer.updatedArea));

			if (dirtyArea)
				this.present(dirtyArea, pathPart.phase);
		}
	}

	present(dirtyArea, phase) {
		if (phase == InkBuilder.Phase.END)
			this.strokeRenderer.blendStroke(this.strokesLayer);

		this.canvas.clear(dirtyArea);
		this.canvas.blend(this.strokesLayer, {rect: dirtyArea});

		if (phase == InkBuilder.Phase.UPDATE)
			this.strokeRenderer.blendUpdatedArea();
	}

	async erase(pathPart) {
		let eraser = app.config.tools[pathPart.toolID];

		if (eraser.blendMode == BlendMode.DESTINATION_OUT) {
			this.drawPath(pathPart);

			if (pathPart.phase == InkBuilder.Phase.END) {
				let stroke = this.strokeRenderer.toStroke(this.builder);

				if (pathPart.intersector.splitPointsProducer)
					preloader.delay(1500, stroke.bounds, "Erase in progress (intersect). Please wait...");
				else
					await protector.open(true);

				let intersection = await pathPart.intersector.intersect(stroke);

				preloader.clearDelay();
				preloader.setMessage("Erase in progress (split). Please wait...");

				let dirtyArea = await this.dataModel.update(intersection);

				if (dirtyArea) {
					if (sample == 3)
						dirtyArea = stroke.bounds.union(dirtyArea);

					dirtyArea.model = true;
					this.redraw(dirtyArea);
				}

				if (pathPart.intersector.splitPointsProducer)
					preloader.close();
				else
					protector.close();
			}
		}
		// instant
		else {
			if (!pathPart.added)
				return;

			let interpolatedSpline = pathPart.added;
			let intersection = await pathPart.intersector.intersect(interpolatedSpline, app.config.tools[this.toolID].brush);

			if (intersection.length > 0) {
				let dirtyArea = await this.dataModel.update(intersection);
				dirtyArea.model = true;

				this.redraw(dirtyArea);
			}
		}
	}

	async select(pathPart) {
		this.drawPath(pathPart);

		if (pathPart.phase == InkBuilder.Phase.END) {
			let stroke = this.strokeRenderer.toStroke(this.builder);

			if (this.selection instanceof SelectionVector) {
				await protector.open(true);

				let selection = this.selector.select(stroke);

				if (selection.length > 0)
					this.selection.open(this.selector.mode, selection, stroke);
				else
					console.warn("data not found");

				protector.close();
			}
			else
				this.selection.open(stroke);

			this.refresh(this.lens.modelToView(stroke.bounds));
		}
	}

	abort() {
		if (!this.builder.phase) return;

		let dirtyArea;

		if (this.strokeRenderer.strokeBounds)
			dirtyArea = this.strokeRenderer.strokeBounds.union(this.strokeRenderer.updatedArea);

		this.strokeRenderer.abort();
		this.builder.abort();

		if (dirtyArea)
			this.refresh(dirtyArea, true);
	}

	resize(reason) {
		let wrapper = document.querySelector(".Wrapper");
		let width = wrapper.offsetWidth;
		let height = wrapper.offsetHeight;

		this.canvas.resize(width, height);
		this.resizeStack(width, height);

		this.lens.focus();

		if (reason == InputListener.ResizeReason.ZOOM_OUT || reason == InputListener.ResizeReason.ORIENTATION)
			this.redraw();
		else
			this.refresh();
	}

	resizeStack(width, height) {
		Array.from(this.canvas.surface.parentNode.querySelectorAll("canvas")).filter(node => node != this.canvas.surface).forEach(canvas => {
			canvas.width = width;
			canvas.height = height;
		});
	}

	redraw(dirtyArea, excludedStrokes = []) {
		let modelArea;
		let viewArea;

		if (dirtyArea) {
			modelArea = dirtyArea.model ? dirtyArea : this.lens.viewToModel(dirtyArea);
			viewArea = dirtyArea.model ? this.lens.modelToView(dirtyArea) : dirtyArea;

			viewArea = viewArea.intersect(this.canvas.bounds);
		}
		else
			viewArea = this.canvas.bounds;

		this.strokesLayer.clear(viewArea);
		this.clearOrigin(modelArea);

		let strokes = this.strokes.filter(stroke => !excludedStrokes.includes(stroke) && stroke.style.visibility && (!modelArea || stroke.bounds.intersect(modelArea)));

		this.strokeRenderer.blendStrokes(strokes, this.strokesLayer, {rect: viewArea}, this.inkCanvasRaster ? this.inkCanvasRaster.strokeRenderer : undefined);
		this.drawOrigin(strokes, modelArea);
		this.refresh(viewArea);
	}

	clearOrigin(modelArea) {
		if (app.type == app.Type.RASTER || this.preventOriginRedraw) return;

		this.originLayer.clear(modelArea);
	}

	drawOrigin(strokes, modelArea) {
		if (!this.originLayer || this.preventOriginRedraw) return;
		if (strokes instanceof Stroke) strokes = [strokes];

		this.strokeRendererOrigin.blendStrokes(strokes, this.originLayer, {rect: modelArea}, this.inkCanvasRaster ? this.inkCanvasRaster.strokeRenderer : undefined);
	}

	refresh(dirtyArea = this.canvas.bounds) {
		this.canvas.clear(dirtyArea);
		this.canvas.blend(this.strokesLayer, {rect: dirtyArea});
	}

	clear() {
		this.clearOrigin();
		this.strokesLayer.clear();
		this.canvas.clear();

		this.dataModel.reset();
		this.lens.reset();
	}
}
