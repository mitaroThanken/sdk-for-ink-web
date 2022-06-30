let layout = {
	init: function() {
		dropDown.init();

		$("nav .Tool").addClass("Button");

		$("nav .Tool").on("click", function() {
			if (this.classList.contains("Selected")) return;

			$("nav .Tool.Selected").removeClass("Selected");
			$(this).addClass("Selected");

			app.inkCanvas.setTool(this.id);
		});

		$("nav .ColorBox input[type=color]").on("input", function() {
			let color = layout.extractColor(this);

			app.inkCanvas.setColor(color);
		});

		$("nav .ColorBox input[type=color]").on("change", function() {
			$(".ColorBox .Color").css("background-color", this.value);
		});

		if (!PointerEvent.prototype.getPredictedEvents)
			$(".Button.pointerPrediction").css("display", "none");

		this.toggleParam("downsampling", true);
		this.toggleParam("pointerPrediction", true);
	},

	selectTool(id) {
		$(`nav .Tool#${id}`).trigger("click")
	},

	selectPaper: function(paper) {
		let sheet = Array.from(document.styleSheets).find(sheet => sheet.title == "main");
		let rule = Array.from(sheet.rules).find(rule => rule.selectorText == ".Wrapper::before");

		rule.style.backgroundImage = `url('/images/papers/${paper}')`;
	},

	updatePaper(transform) {
		let sheet = Array.from(document.styleSheets).find(sheet => sheet.title == "main");
		let rule = Array.from(sheet.rules).find(rule => rule.selectorText == ".Wrapper::before");

		rule.style.transform = transform.toString();
	},

	setPaperSize(width, height) {
		let sheet = Array.from(document.styleSheets).find(sheet => sheet.title == "main");
		let rule = Array.from(sheet.rules).find(rule => rule.selectorText == ".Wrapper::before");

		rule.style.width = `${width}px`;
		rule.style.height = `${height}px`;
	},

	extractColor(node, opacity) {
		let rgba = [];

		if (node.tagName == "INPUT") {
			let value = node.value.substring(1);

			rgba.push(parseInt(value.substring(0, 2), 16));
			rgba.push(parseInt(value.substring(2, 4), 16));
			rgba.push(parseInt(value.substring(4), 16));
			rgba.push(opacity || 1);
		}
		else {
			rgba = eval(node.getStyle("background-color").replace(/rgba?/, "new Array"));
			if (!rgba[3]) rgba[3] = node.getMathStyle("opacity");
		}

		return Color.fromColor(rgba);
	},

	toggleParam(name, init) {
		if (!init) localStorage.setItem(name, !app[name]);

		if (app[name])
			$(`.Button.${name}`).addClass("Selected");
		else
			$(`.Button.${name}`).removeClass("Selected");
	}
};
