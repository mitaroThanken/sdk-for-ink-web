/*let inkCanvas;
window.onload = async function() {
	let canvas = document.getElementById("inkCanvas");
    inkCanvas = await new InkCanvasRaster(canvas, canvas.width, canvas.height);
	await BrushPalette.configure(inkCanvas.canvas.ctx);  
};*/

function openWaitingDialog(width, height) {
    let modalBackground = document.createElement('div');
    modalBackground.id = "modal-background";
    modalBackground.style.width = window.innerWidth;
    modalBackground.style.height = window.innerHeight;
    document.getElementsByTagName('body')[0].appendChild(modalBackground);
	
    let loadingImageDiv = document.createElement('div');
	loadingImageDiv.id = "modal-content";
	loadingImageDiv.opacity = 1;
	loadingImageDiv.style.left = (window.innerWidth / 2) - (width / 2) + "px";
	loadingImageDiv.style.top = (window.innerHeight / 2) - (height / 2) + "px";
	loadingImageDiv.style.backgroundColor="white";
	loadingImageDiv.style.width = width + "px";
	loadingImageDiv.style.height = height + "px";
	loadingImageDiv.innerHTML = '<div id="loadingDiv"><table><tr><td><img src="loading.gif"></td><td>Exporting the image, this could take a few seconds...</td></tr></div>';
	document.getElementsByTagName('body')[0].appendChild(loadingImageDiv);
}

function closeWaitingDialog() {
	document.getElementById("modal-background").remove();
	document.getElementById("modal-content").remove();
}

function saveDocument() {
	//const data = new PDFGenerator().inkModelToPDF(inkModel, 595, 842);
    const a = document.getElementById("download");
    blob = new Blob([data]),
    url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = "exported.pdf";
    a.click();
    //window.URL.revokeObjectURL(url);
};

function exportToPDF() {	    
    openWaitingDialog(500, 300);	
	
	let reader = new FileReader();
    reader.onload = (e) => openFileForPDF(e.target.result);		
	
	setTimeout(function(){
		// let some time to load the waiting dialog completally.
	    reader.readAsArrayBuffer(document.getElementById("myfile").files[0]);	
    }, 100);	
}

function exportToSVG() {
	openWaitingDialog(500, 300);	
	
	let reader = new FileReader();
    reader.onload = (e) => openFileForSVG(e.target.result);		
	
	setTimeout(function(){
		// let some time to load the waiting dialog completally.
	    reader.readAsArrayBuffer(document.getElementById("myfile").files[0]);	
    }, 100);	
}

async function exportToImage(type) {
	openWaitingDialog(500, 300);	
	
	let reader = new FileReader();
    reader.onload = (e) => openFileForImage(type, e.target.result);		
	
	setTimeout(function(){
		// let some time to load the waiting dialog completally.
	    reader.readAsArrayBuffer(document.getElementById("myfile").files[0]);	
    }, 100);	
}

async function openFileForPDF(buffer) {		
	const codec = new InkCodec();
	const inkModel = await codec.decodeInkModel(buffer);
	
	const pdfString = await new PDFGenerator().inkModelToPDF(inkModel, 595, 842, document.getElementById("fitCheckBox").checked);	
	closeWaitingDialog();
	
	const data = window.URL.createObjectURL(new Blob([pdfString], {type: "application/pdf"}));
	const link = document.createElement("a");
	link.href = data;
	link.download = "exported.pdf";
	link.click();
	
	setTimeout(function(){
        // For Firefox it is necessary to delay revoking the ObjectURL
        window.URL.revokeObjectURL(data);
    }, 100);	
}

async function openFileForSVG(buffer) {		
	const codec = new InkCodec();
	const inkModel = await codec.decodeInkModel(buffer);
	
	const svgString = await new SVGGenerator().inkModelToSVG(inkModel, 595, 842, document.getElementById("fitCheckBox").checked);	
	closeWaitingDialog();
	
	const data = window.URL.createObjectURL(new Blob([svgString], {type: "image/svg+xml"}));
	const link = document.createElement("a");
	link.href = data;
	link.download = "exported.svg";
	link.click();
	
	setTimeout(function(){
        // For Firefox it is necessary to delay revoking the ObjectURL
        window.URL.revokeObjectURL(data);
    }, 100);	
}

async function openFileForImage(type, buffer) {
	const codec = new InkCodec();
	const inkModel = await codec.decodeInkModel(buffer);		
	
	let canvas = document.getElementById("inkCanvas");
    let inkCanvas = await new InkCanvasRaster(canvas, canvas.width, canvas.height);
	
	for (let brush of inkModel.brushes) {						
        if (brush instanceof BrushGL) {
		    await brush.configure(inkCanvas.canvas.ctx);
		}
	}
	
	let bounds = new Rect(0,0,0,0);
	let nodeTraverser = new NodeTraverser(function (node) {
	    if (node.content instanceof Stroke) {			
			bounds = bounds.union(node.bounds);
		}
    });

	nodeTraverser.traverse(inkModel.tree.root);
	
	inkCanvas.resize(bounds.width, bounds.height);		
	await inkCanvas.drawInkModel(inkModel);
	
	const rect = new Rect(0, 0, bounds.width, bounds.height);
	const image = inkCanvas.toImage(rect, "image/jpeg");
	var img1 = new Image();
	img1.src = image;
	document.body.appendChild(img1);
	
	await inkCanvas.delete();
	closeWaitingDialog();
}

/**
 * Class that takes a decode uim file and export it to PDF
 **/
class PDFGenerator {
	
    // Normally as PDF it is not an easy format to work with a third party library it is used 
    // to work with PDFs, however here as we are only going to create a new PDF with the inking drawings
    // we are going to use a simple PDF template and fill it.
    // In the following template we use the charecter $ to determinate a parameter to be filled. 		
    static pdfTemplate = "%PDF-1.4\n" +
            "%âãÏÓ\n" +
            "1 0 obj\n" +
            "<</Type/Page/Parent 3 0 R/Contents 2 0 R/MediaBox[0 0 $1 $2]/Resources<</ProcSet[/PDF]/ExtGState<<$3>>>>>>\n" +
            "endobj\n" +
            "2 0 obj\n" +
            "<</Length $4>>stream\n" +
            "$5\n" +
            "endstream\n" +
            "endobj\n" +
            "3 0 obj\n" +
            "<</Type/Pages/Count 1/Kids[1 0 R]>>\n" +
            "endobj\n" +
            "4 0 obj\n" +
            "<</Type/Catalog/Pages 3 0 R>>\n" +
            "endobj\n" +
            "5 0 obj\n" +
            "<</Producer($6)/CreationDate(D:$7)/ModDate(D:$8)>>\n" +
            "endobj\n" +
            "xref\n" +
            "0 6\n" +
            "0000000000 65535 f\n" +
            "$9 00000 n\n" +
            "$10 00000 n\n" +
            "$11 00000 n\n" +
            "$12 00000 n\n" +
            "$13 00000 n\n" +
            "trailer\n" +
            "<</Size 6/Root 4 0 R/Info 5 0 R/ID[<$14><$15>]>>\n" +
            "startxref\n" +
            "$16\n" +
            "%%EOF";
	
	constructor() {
	}
	
	/**
 	 * Export a inkModel to PDF
	 * @param {InkModel} inkModel - InkModel imported from a UIM file.
	 * @param {float} pdfWidth - Width of the generated PDF.
	 * @param {float} pdfHeigth - Height of the generated PDF-1.
	 * @param {boolean} fit - If true the strokes will be scaled to fit the PDF dimensions.
	 */
	inkModelToPDF = async function(inkModel, pdfWidth, pdfHeight, fit = true) {
		// first of all we need to get the PostScript drawing commands from the inkModel
		this.drawStrokes(inkModel, pdfWidth, pdfHeight, fit);		
		
		const date = this.dateToPDFFormat();
		
		let newPDF = 
		    PDFGenerator.pdfTemplate.replace("$1", pdfWidth)
			                        .replace("$2", pdfHeight)
									.replace("$3", this.getGSStates())
		                            .replace("$4", this.psCommands.length)
		                            .replace("$5", this.psCommands)
			                        .replace("$6", "Wacom")
			                        .replace("$7", date)
			                        .replace("$8", date);

		newPDF = newPDF.replace("$9", this.fill(newPDF.indexOf("1 0 obj")))
                       .replace("$10", this.fill(newPDF.indexOf("2 0 obj")))
					   .replace("$11", this.fill(newPDF.indexOf("3 0 obj")))
					   .replace("$12", this.fill(newPDF.indexOf("4 0 obj")))
					   .replace("$13", this.fill(newPDF.indexOf("5 0 obj")))
					   .replace("$14", this.makeID(32))
					   .replace("$15", this.makeID(32));

		newPDF = newPDF.replace("$16", newPDF.indexOf("xref")); 			   

		return newPDF;
	}
	
	getGSStates() {
		let gsStates = "";
		this.graphicStates.forEach((alpha, index) => {
			gsStates += "/GS"+(index+1)+"<</ca "+alpha+">>";
		});
		return gsStates;
	}
	
	fill = function(offset) {
		return ('0000000000'+offset).slice(-10);
	}
	
	makeID = function(length) {
        let result = "";
        const characters = 'ABCDEF0123456789';
        const charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
	
	dateToPDFFormat() {
		// PDF format it is like 20210903102717Z
		// ISO string it is like 2021-09-06T12:24:07.855Z
		let date = new Date().toISOString();
        date = date.substring(0, date.indexOf(".")).replaceAll("-", "").replaceAll(":", "").replaceAll("T","");
        return date+"Z";
	}
	
	/**
	 * Generates PostScript command for all the strokes in the inkModel.
	 * @param {InkModel} inkModel - InkModel imported from a UIM file.
	 * @param {float} pdfWidth - Width of the generated PDF.
	 * @param {float} pdfHeigth - Height of the generated PDF-1.
	 * @param {boolean} fit - If true the strokes will be scaled to fit the PDF dimensions.
	 */
	drawStrokes = function(inkModel, pdfWidth, pdfHeight, fit) {		
	    this.psCommands = ""; // PostScript commands for drawing the inking
		this.graphicStates = new Array(); // Store the alphas
		
	    if (fit) {
			// if fit we put a transformation matrix scaling the strokes			
		    let bounds = new Rect(0, 0, 0, 0);
	        for (let stroke of inkModel.strokes) {
		        const strokeBounds = Rect.ofPolygons(stroke.path);
		        bounds = bounds.union(strokeBounds);    
			}
			
			const scaleX = pdfWidth/bounds.width;
			const scaleY = pdfHeight/bounds.height;
			const scale = Math.min(scaleX, scaleY);			   			
			this.psCommands += scale +" 0 0 "+-scale+" 0 "+pdfHeight+" cm\n";
	    } else {
			// Strokes have Y coordinates from top = 0 to bottom = maxHeight, 
			// while PDF have Y coordinates from bottom = 0 to top = maxHeight,
			// so we need to flip the Y coordinates. We do it with the following transformation matrix.
			this.psCommands += "1 0 0 -1 0 "+pdfHeight+" cm\n";
		}			
		
		// Now that we have the transformation matrix, continue drawing the strokes
		for (let stroke of inkModel.strokes) {
		    this.drawStroke(stroke);		
	    }	
	}
	
	/**
	 * Generates each stroke PostScript commands 
	 * @param {Stroke} stroke - stroke.
	 */
	drawStroke = function(stroke) {        
        const path = stroke.path;	
		const color = stroke.color;
		
		if (!color) {
			if (stroke.spline) {
		        color = stroke.spline.color;		
			} else {
				return; //no color!
			}
		}
		
		if (this.graphicStates.indexOf(color.alpha) == -1) {
			this.graphicStates.add(color.alpha);
		}
		
		if (path instanceof InterpolatedSpline)
			this.drawSpline(path, color);
		else if (!Stroke.validatePath(path))
			return;        
		
		path.holesClockwise = true;
		
		this.psCommands += "q \n"; // save the graphics state
		this.psCommands += "/GS"+(this.graphicStates.indexOf(color.alpha)+1)+" gs\n"; // put the alpha state
		this.psCommands += (color.red/256)+" "+(color.green/256)+" "+(color.blue/256)+" rg\n"; // put the stroke color
		
        this.drawPath(path);				
		//if (brush.pattern) graphics += this.drawPath(path, brush.pattern);
		
		this.psCommands += "Q \n"; // restore the graphics state
	}
	
	/**
	 * Generates the PostScript commands for a paht.
	 * @param {Path} path - path.
	 */
	drawPath = function(path) {
		path.forEach((contour, idx) => {
			this.psCommands += contour[0]+" "+contour[1]+" m "; // move command

			if (path.holesClockwise || idx == 0) {
				for (let i = 2; i < contour.length; i += 2) {
					this.psCommands += contour[i]+" "+contour[i+1]+" l "; // line command
				}     
			}
			else {
				for (let i = contour.length - 2; i >= 0; i -= 2) {
				    this.psCommands += contour[i]+" "+contour[i+1]+" l "; // line command
				}
			}

			//this.psCommands += "h "; // close path
		});

		this.psCommands += "f "; // fill the path
	}
	
	drawSpline = function(spline, color) {
		/*if (!color) color = spline.color;

		this.ctx.save();
		this.ctx.fillStyle = `rgb(${color.red}, ${color.green}, ${color.blue})`;

		for (let i = 0; i < spline.length; i++) {
			let point = spline.getPoint(i);
			let radius = point.size / 2;

			this.ctx.beginPath();
			//this.ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
			this.ctx.lineTo(point.x, point.y);
			this.ctx.closePath();

			this.ctx.fill();

			dirtyArea = new Rect(point.x - radius, point.y - radius, point.size, point.size).union(dirtyArea);
		}

		this.ctx.restore();*/
	}	
	
}

class SVGGenerator {
    constructor() {
	}

    inkModelToSVG = async function(inkModel, svgWidth, svgHeight, fit = true) {
		const node = document.createElement("div");
	    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');		
        const inkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        svg.setAttribute('viewBox', '0 0 '+svgWidth+' '+svgHeight);
		this.drawStrokes(svg, inkModel, svgWidth, svgHeight, fit);

		node.appendChild(svg);
		return node.innerHTML;
	}	

    /**
	 * Generates PostScript command for all the strokes in the inkModel.
	 * @param {InkModel} inkModel - InkModel imported from a UIM file.
	 * @param {float} pdfWidth - Width of the generated PDF.
	 * @param {float} pdfHeigth - Height of the generated PDF-1.
	 * @param {boolean} fit - If true the strokes will be scaled to fit the PDF dimensions.
	 */
	drawStrokes = function(svg, inkModel, svgWidth, svgHeight, fit) {		
		const inkGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		svg.appendChild(inkGroup);
		
	    if (fit) {
			// if fit we put a transformation matrix scaling the strokes
		    let bounds = new Rect(0, 0, 0, 0);
	        for (let stroke of inkModel.strokes) {
		        const strokeBounds = Rect.ofPolygons(stroke.path);
		        bounds = bounds.union(strokeBounds);    
			}
			
			const scaleX = svgWidth/bounds.width;
			const scaleY = svgHeight/bounds.height;
			const scale = Math.min(scaleX, scaleY);			   			
			
			inkGroup.setAttribute("transform", "matrix("+ scale +",0,0,"+scale+",0,0)");
		}			
		
		// Now that we have the transformation matrix, continue drawing the strokes
		for (let stroke of inkModel.strokes) {
		    this.drawStroke(inkGroup, stroke);		
	    }
	}
	
	/**
	 * Generates each stroke PostScript commands 
	 * @param {Stroke} stroke - stroke.
	 */
	drawStroke = function(inkGroup, stroke) {        
        const path = stroke.path;	
		const color = stroke.color;
		
		path.holesClockwise = true;		
		const inkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		inkPath.setAttribute("fill", this.rgbToHex(color.red, color.green, color.blue));
		inkPath.setAttribute("fill-opacity", color.alpha);
		inkPath.setAttribute("d", this.drawPath(path));
		inkGroup.appendChild(inkPath);
	}
	
	/**
	 * Generates the SVG commands for a path.
	 * @param {Path} path - path.
	 */
	drawPath = function(path) {
		let svgPath = "";
		path.forEach((contour, idx) => {
			svgPath += " M "+contour[0]+" "+contour[1]; // move command

			if (path.holesClockwise || idx == 0) {
				for (let i = 2; i < contour.length; i += 2) {
					svgPath += " L "+contour[i]+" "+contour[i+1]; // line command
				}     
			}
			else {
				for (let i = contour.length - 2; i >= 0; i -= 2) {
				    svgPath += " L "+contour[i]+" "+contour[i+1]; // line command
				}
			}
		});

		return svgPath;
	}	
	
	componentToHex = function(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    rgbToHex = function(r, g, b) {
        return "#" + this.componentToHex(r)
				   + this.componentToHex(g)
				   + this.componentToHex(b);
    }
}

class RasterGenerator {
	
	constructor() {
		
		this.bounds = new Rect(0, 0, canvas.width, canvas.height);
		this.ctx = canvas.getContext("2d");		
		this.canvasWidth = canvas.width;
		this.canvasHeight = canvas.height;
		this.pdfWidth = pdfWidth;
		this.pdfHeight = pdfHeight;				
	}
	
	drawAll(strokes, fit) {
		let graphics = "";
		let transform;
		
		if (fit) {
		    let bounds = new Rect(0, 0, 0, 0);
	        for (let stroke of strokes) {
		        let dirtyArea = Rect.ofPolygons(stroke.path);
		        bounds = bounds.union(dirtyArea);    
			}
			
			const scaleX = this.canvasWidth/bounds.width;
			const scaleY = this.canvasHeight/bounds.height;
			const scale = Math.min(scaleX, scaleY);			
			this.ctx.scale(scale, scale);
			graphics += scale +" 0 0 "+-scale+" 0 "+this.pdfHeight+" cm ";
	    }	
		
		for (let stroke of strokes) {
		    graphics += this.draw(stroke);		
	    }
		
		console.log(graphics);
		return graphics;
	}
	
	/**
	 * Draws points with a brush over the layer
	 *
	 * @param {Stroke} stroke Stroke model instance
	 * @return {Rect} Affected area
	 */
	draw(stroke) {
		return this.drawStroke(stroke.brush, stroke.path, stroke.color, stroke.matrix);
	}
	
	/**
	 * Draws points with a brush over the layer
	 *
	 * @param {PathBuilding.Path2D} path Contours list, where contour is points list
	 * @param {Color} color Stroke color
	 * @return {Rect} Affected area
	 */
	drawStroke(brush, path, color, transform) {
		let graphics = "";
		
		if (path instanceof InterpolatedSpline)
			return this.drawSpline(path, color);
		else if (!Stroke.validatePath(path))
			return null;

		let dirtyArea = Rect.ofPolygons(path);
		dirtyArea = this.bounds.intersect(dirtyArea);

		if (dirtyArea) {
			dirtyArea = dirtyArea.ceil();
/*
			if (!transform) {
				if (this.transform) {
					transform = this.transform;
					if (ctx.canvas.transform) transform = Module.MatTools.multiply(ctx.canvas.transform, transform);
				}
				else if (ctx.canvas.transform)
					transform = ctx.canvas.transform;
			}
*/
			//this.ctx.save();

/*			if (transform) {
				dirtyArea = MatTools.transformRect(dirtyArea, transform);

				this.ctx.setTransform(
					transform[MAT2D_INDEX.a], transform[MAT2D_INDEX.b],
					transform[MAT2D_INDEX.c], transform[MAT2D_INDEX.d],
					transform[MAT2D_INDEX.dx], transform[MAT2D_INDEX.dy]
				);
			}
			else {
				this.ctx.rect(dirtyArea.left, dirtyArea.top, dirtyArea.width, dirtyArea.height);
				this.ctx.clip();
			}*/

			path.holesClockwise = true;
/*
let gradient = this.ctx.createLinearGradient(dirtyArea.left, dirtyArea.top, dirtyArea.right, dirtyArea.bottom);

gradient.addColorStop(0, `rgba(${color.red-30}, ${color.green}, ${color.blue}, 0.4)`);
gradient.addColorStop(0.2, `rgba(${color.red}, ${color.green}, ${color.blue}, 0.7)`);
gradient.addColorStop(0.4, `rgba(${color.red+30}, ${color.green}, ${color.blue}, 0.5)`);
gradient.addColorStop(0.6, `rgba(${color.red+60}, ${color.green}, ${color.blue}, 0.8)`);
gradient.addColorStop(0.8, `rgba(${color.red+90}, ${color.green}, ${color.blue}, 0.6)`);
gradient.addColorStop(1, `rgba(${color.red+120}, ${color.green}, ${color.blue}, 0.4)`);

this.drawPath(path, gradient);
*/
 //this.ctx.globalAlpha = color.alpha;
// 			this.drawPath(path, `rgb(${color.red * color.alpha}, ${color.green * color.alpha}, ${color.blue * color.alpha})`);
             console.log("alpha= "+color.alpha);
             graphics +=" q /GS1 gs ";
             graphics += color.red+" "+color.green+" "+color.blue+" RG ";
			 graphics += this.drawPath(path, `rgb(${color.red}, ${color.green}, ${color.blue}, ${color.alpha})`);
			 graphics += " Q ";
			//this.drawPath(path, `rgb(${color.red}, ${color.green}, ${color.blue})`);
			if (brush.pattern) graphics += this.drawPath(path, brush.pattern);

			//this.ctx.restore();
		}

		return graphics;
	}

	drawPath(path, style) {
		let graphics = "";
		this.ctx.beginPath();

		path.forEach((contour, idx) => {
			this.ctx.moveTo(contour[0], contour[1]);
			graphics += contour[0]+" "+contour[1]+" m ";

			if (path.holesClockwise || idx == 0) {
				for (let i = 2; i < contour.length; i += 2) {
					this.ctx.lineTo(contour[i], contour[i+1]);
					graphics += contour[i]+" "+contour[i+1]+" l ";
				}     
			}
			else {
				for (let i = contour.length - 2; i >= 0; i -= 2) {
					this.ctx.lineTo(contour[i], contour[i+1]);
				    graphics += contour[i]+" "+contour[i+1]+" l ";
				}
			}

			this.ctx.closePath();
			graphics += "h ";
		});

		if (style) this.ctx.fillStyle = style;
		this.ctx.fill();
		graphics += "f ";
		return graphics;
	}

	drawSpline(spline, color) {
		let dirtyArea;
		if (!color) color = spline.color;

		this.ctx.save();
		this.ctx.fillStyle = `rgb(${color.red}, ${color.green}, ${color.blue})`;

		for (let i = 0; i < spline.length; i++) {
			let point = spline.getPoint(i);
			let radius = point.size / 2;

			this.ctx.beginPath();
			//this.ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
			this.ctx.lineTo(point.x, point.y);
			this.ctx.closePath();

			this.ctx.fill();

			dirtyArea = new Rect(point.x - radius, point.y - radius, point.size, point.size).union(dirtyArea);
		}

		this.ctx.restore();

		//return dirtyArea.ceil();
	}
}
