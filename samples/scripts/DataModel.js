class DataModel {
	constructor() {
		this.inkModel = new InkModel();
		this.repository = new DataRepository();
		this.manipulationsContext = new SpatialContext();
	}

	add(stroke) {
		if (app.type == app.Type.VECTOR)
			this.manipulationsContext.add(stroke);

		return this.inkModel.addPath(stroke);
	}

	remove(...strokes) {
		strokes.forEach(stroke => {
			if (app.type == app.Type.VECTOR)
				this.manipulationsContext.remove(stroke);

			this.inkModel.removePath(stroke);
		});
	}

	async transform(mat, ...strokes) {
		mat = Matrix.fromMatrix(mat);

		strokes.forEach(stroke => stroke.spline.transform(mat));

		let settings = {
			keepAllData: [PipelineStage.SPLINE_INTERPOLATOR, PipelineStage.BRUSH_APPLIER],
			keepSplineParameters: true
		};

		await app.inkStorage.importBridge.build(strokes, settings);

		strokes.forEach(stroke => {
			this.manipulationsContext.reload(stroke);
		});
	}

	async update(manipulation) {
		let {type, intersected, selected} = manipulation;

		let dirtyArea;
		let rebuild = [];

		for (let strokeID in intersected) {
			let stroke = this.inkModel.getStroke(strokeID);
			let strokes = stroke.split(intersected[strokeID]);

			dirtyArea = stroke.bounds.union(dirtyArea);
			rebuild.push(...strokes);

			this.inkModel.replacePath(stroke, strokes);
			this.manipulationsContext.remove(stroke);
		}

		if (rebuild.length > 0) {
			let settings = {
				keepAllData: [PipelineStage.SPLINE_INTERPOLATOR, PipelineStage.BRUSH_APPLIER],
				keepSplineParameters: true
			};

			await app.inkStorage.importBridge.build(rebuild, settings);

			for (let stroke of rebuild)
				this.manipulationsContext.add(stroke);
		}

		for (let strokeID of selected) {
			let stroke = this.inkModel.getStroke(strokeID);

			dirtyArea = stroke.bounds.union(dirtyArea);

			if (type == "INTERSECTION") {
				this.manipulationsContext.remove(stroke);
				this.inkModel.removePath(stroke);
			}
		}

		return dirtyArea;
	}

	importBrush(brush) {
		this.repository.register(brush.name, brush);
	}

	getBrush(name) {
		return this.repository.get(name);
	}

	getStrokes(strokeIDs) {
		return strokeIDs.map(strokeID => this.inkModel.getStroke(strokeID));
	}

	calcBounds(strokes) {
		let bounds;

		for (let stroke of strokes)
			bounds = stroke.bounds.union(bounds);

		return bounds;
	}

	importModel(inkModel) {
		this.inkModel = inkModel || new InkModel();

		if (this.inkModel.strokes.length == 0)
			return;

		this.inkModel.brushes.forEach(brush => {
			this.repository.register(brush.name, brush);
		});

		if (app.type == app.Type.VECTOR) {
			this.inkModel.strokes.forEach(stroke => {
				this.manipulationsContext.add(stroke);
			});
		}
	}

	reset(inkModel) {
		this.manipulationsContext.reset();
		this.importModel(inkModel);
	}
}
