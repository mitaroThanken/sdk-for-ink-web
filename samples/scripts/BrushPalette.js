class BrushPalette {
	brushes = {
		/* **************** VECTOR BRUSH configuration **************** */
		circle: new Brush2D(app.uriBuilder.getBrushURI("vector", "Circle"), [
			BrushPrototype.create(BrushPrototype.Type.CIRCLE, 0, 4),
			BrushPrototype.create(BrushPrototype.Type.CIRCLE, 2, 8),
			BrushPrototype.create(BrushPrototype.Type.CIRCLE, 6, 16),
			BrushPrototype.create(BrushPrototype.Type.CIRCLE, 18, 32)
		]),

		basic: new Brush2D(app.uriBuilder.getBrushURI("vector", "Basic"), ShapeFactory.createCircle(3), 0.3),
		rhombus: new Brush2D(app.uriBuilder.getBrushURI("vector", "Rhombus"), ShapeFactory.createCircle(4)),

		/* **************** RASTER BRUSH configuration **************** */
		pencil: new BrushGL(app.uriBuilder.getBrushURI("raster", "Pencil"), "/images/textures/essential_shape.png", "/images/textures/essential_fill_11.png", {spacing: 0.15, scattering: 0.15}),

		waterBrush: new BrushGL(app.uriBuilder.getBrushURI("raster", "WaterBrush"), "/images/textures/essential_shape.png", "/images/textures/essential_fill_14.png", {
			spacing: 0.1,
			scattering: 0.03,
			blendMode: BlendMode.MAX
		}),

		inkBrush: new BrushGL(app.uriBuilder.getBrushURI("raster", "InkBrush"),
			[
				"/images/textures/fountain_brush_128x128.png",
				"/images/textures/fountain_brush_64x64.png",
				"/images/textures/fountain_brush_32x32.png",
				"/images/textures/fountain_brush_16x16.png",
				"/images/textures/fountain_brush_8x8.png",
			],
			"/images/textures/essential_fill_8.png",
			{spacing: 0.035, rotationMode: BrushGL.RotationMode.NONE}
		),

		rainbowBrush: new BrushGL(app.uriBuilder.getBrushURI("raster", "RainbowBrush"), "/images/textures/essential_shape.png", "/images/textures/essential_fill_8.png", {spacing: 0.15, rotationMode: BrushGL.RotationMode.NONE}),
		crayon: new BrushGL(app.uriBuilder.getBrushURI("raster", "Crayon"), "/images/textures/essential_shape.png", "/images/textures/essential_fill_17.png", {spacing: 0.15, scattering: 0.05}),

		eraserGL: new BrushGL(app.uriBuilder.getBrushURI("raster", "Eraser"), "/images/textures/shape_circle.png", "/images/textures/essential_fill_8.png", {
			spacing: 0.1,
			rotationMode: BrushGL.RotationMode.NONE
		})
	}

	constructor() {
		let names = Object.keys(this.brushes);
		let props = {};

		for (let name of names)
			props[name] = {value: this.brushes[name], enumerable: true};

		Object.defineProperties(this, props);
	}

	async configure(ctx) {
		let brushes = Object.values(this.brushes);

		if (ctx instanceof CanvasRenderingContext2D)
			brushes = brushes.filter(value => value instanceof Brush2D);
		else
			brushes = brushes.filter(value => value instanceof BrushGL);

		for (let brush of brushes)
			await brush.configure(ctx);
	}
}
