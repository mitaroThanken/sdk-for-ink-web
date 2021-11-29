class InkStorage {
	constructor(inkController) {
		this.inkController = inkController;

		this.codec = new InkCodec();
		this.codec.precisionCalculator = new RMSEBasedPrecisionCalculator();

		this.toolCodec = new InkToolCodec();

		this.importBridge = InkPathProducer.getInstance();
		this.importBridge.updateProgress = preloader.setProgress.bind(preloader);
	}

	async encode() {
		return await this.codec.encodeInkModel(app.model.inkModel);
	}

	decode(buffer) {
		return this.codec.decodeInkModel(buffer);
	}

	import(input, type) {
		let reader = new FileReader();

		if (type == "uim")
			reader.onload = (e) => this.openFile(e.target.result);
		else if (type == "tool")
			reader.onload = (e) => this.importTool(e.target.result);
		else
			throw new Error(`Unknown or missing import type - ${type}`);

		reader.readAsArrayBuffer(input.files[0]);

		input.value = "";
	}

	async importTool(buffer) {
		let data = this.toolCodec.decode(buffer);

		let error;

		// Check if the brush is either a vector or particle brush
		if (localStorage.getItem("sample") == 1 && data.brush instanceof BrushGL)
			error = "Tool data provides raster configuration. Select sample different from this one to use it.";
		if (localStorage.getItem("sample") == 2 && data.brush instanceof Brush2D)
			error = "Tool data provides vector configuration. Select sample different from this one to use it.";

		let brush = data.brush;

		if (error)
			alert(error);
		else {
			if (brush instanceof BrushGL)
				await brush.configure(await this.inkController.getGLContext());

			config.tools.customTool = {
				brush: brush,
				blendMode: data.blendMode,
				dynamics: data.dynamics,
				statics: data.statics
			};

			app.model.importBrush(brush);

			$("#customTool").removeClass("Disabled");
			layout.selectTool("customTool");
		}
	}

	async save() {
		let buffer = await this.encode();
		fsx.saveAs(buffer, "ink.uim", "application/vnd.wacom-ink.model");
	}

	async openFile(buffer) {
		let inkModel = await this.codec.decodeInkModel(buffer);

		let error;

		if (localStorage.getItem("sample") == 1 && inkModel.brushes.filter(brush => brush instanceof BrushGL).length > 0)
			error = "Ink object provides raster configuration. Select sample different from this one to use it.";

		if (localStorage.getItem("sample") == 2 && inkModel.brushes.filter(brush => brush instanceof Brush2D).length > 0)
			error = "Ink object provides vector configuration. Select sample different from this one to use it.";

		if (error) {
			alert(error)
			return;
		}

		preloader.open("Open file in progress. Please wait...");

		this.inkController.clear();

		let {brushes, strokes} = inkModel;

		// migration from 3.0.0
		if (inkModel.version == "3.0.0") {
			for (let stroke of strokes) {
				if (stroke.brush instanceof BrushGL)
					continue;

				if (stroke.layout.includes(PathPoint.Property.SIZE)) {
					for (let i = 0; i < stroke.spline.length; i++)
						stroke.spline.setPointSize(i, stroke.spline.getPointSize(i) * 2);
				}
				else
					stroke.pointProps.size *= 2;
			}
		}

		await this.pipeline(strokes, brushes);

		for (let brush of brushes) {
			if (brush instanceof BrushGL)
				await brush.configure(await this.inkController.getGLContext());
		}

		app.model.importModel(inkModel);
		this.inkController.redraw();

		preloader.close();
	}

	async pipeline(strokes, brushes) {
		if (strokes.length == 0) return;

		await this.importBridge.importBrushes(brushes);
		await this.importBridge.build(strokes);
	}
}
