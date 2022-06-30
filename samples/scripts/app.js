let app = {
	get downsampling() { return localStorage.getItem("downsampling") == "true" },
	get pointerPrediction() { return localStorage.getItem("pointerPrediction") == "true" },
	get prediction() { return true },

	async init() {
		let packageJSON = await fsx.loadFile("../package.json", "json");

		this.name = packageJSON.name;
		this.version = packageJSON.version;

		let sample = parseInt(localStorage.getItem("sample"));

		if (sample) {
			document.querySelector(".app").className = "app";

			if (sample != 2) document.querySelector(".app").className += " vector";
			if (sample != 1) document.querySelector(".app").className += " raster";

			document.querySelector(".title").innerText = sample + ". " + document.querySelector("#sample" + sample).innerHTML;
			document.querySelector(".app").style.display = "";

			// Safari bug-fix, Safari check is needed
			document.addEventListener("visibilitychange", e => {
				let selection = app.inkCanvas.selection;

				if (selection && selection.active && document.visibilityState == "visible")
					setTimeout(() => selection.transform(), 250);
			});
		}
		else
			document.querySelector(".menu").style.display = "";

		if (sample) {
			this.uriBuilder = new URIBuilder(this.name);
			this.brushPalette = new BrushPalette();
			this.config = new Config();
		}

		window.sample = sample;
	},

	async initInkController() {
		this.model = new DataModel();

		let device = await InputDevice.createInstance({"app.id": this.name, "app.version": this.version});

		let canvas = document.querySelector("#surface");

		let width = $(".Wrapper").width();
		let height = $(".Wrapper").height();
		let color = layout.extractColor($("nav .Color")[0]);
		let toolID;

		let inkCanvas;

		if (sample == 2 || sample == 4) {
			toolID = "pencil";
			canvas.className = "raster-canvas";

			this.config.tools.eraser = this.config.tools.eraserRaster;

			Object.defineProperty(app, "type", {value: app.Type.RASTER, enumerable: true});

			inkCanvas = new InkCanvasRaster(canvas, width, height);
		}
		else {
			toolID = "pen";
			canvas.className = "vector-canvas";

			this.config.tools.eraser = this.config.tools.eraserStroke;

			Object.defineProperty(app, "type", {value: app.Type.VECTOR, enumerable: true});

			inkCanvas = new InkCanvasVector(canvas, width, height);

			if (sample == 3)
				inkCanvas.lens.disable();
		}

		await inkCanvas.init(device, toolID, color);

		let inkStorage = new InkStorage(inkCanvas);

		await inkStorage.importBridge.open();
		await inkStorage.importBridge.importBrushes(Object.values(this.brushPalette.brushes).filter(item => item instanceof Brush2D));

		Object.defineProperty(app, "inkCanvas", {value: inkCanvas, enumerable: true});
		Object.defineProperty(app, "inkStorage", {value: inkStorage, enumerable: true});

		inkCanvas.resizeStack(width, height);

		layout.selectTool(inkCanvas.toolID);

		InputListener.open(inkCanvas);;
	},

	redirect(sample) {
		if (!sample)
			localStorage.removeItem("sample");
		else
			localStorage.setItem("sample", sample);

		location.reload();
	},

	disbaleZoom: function() {
		var keyCodes = [61, 107, 173, 109, 187, 189];

		window.addEventListener("keydown", function(e) {
			if ((e.ctrlKey || e.metaKey) && (keyCodes.indexOf(e.which) != -1))
				e.preventDefault();
		});

		window.addEventListener("DOMMouseScroll", function(e) {
			if (e.cancelable && (e.ctrlKey || e.metaKey))
				e.preventDefault();
		}, {passive: false});

		window.addEventListener("mousewheel", function(e) {
			if (e.cancelable && (e.ctrlKey || e.metaKey))
				e.preventDefault();
		}, {passive: false});

		window.addEventListener("wheel", function(e) {
			if (e.cancelable && (e.ctrlKey || e.metaKey))
				e.preventDefault();
		}, {passive: false});

		// prevents Scribble for iOS
		window.addEventListener("touchmove", function(e) {
			e.preventDefault();
		}, {passive: false});
	}
};

Object.defineEnum(app, "Type", ["VECTOR", "RASTER"]);
