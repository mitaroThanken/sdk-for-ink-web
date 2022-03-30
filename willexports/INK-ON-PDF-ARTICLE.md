# Ink on PDF

| Version | Status   | Author   |
| ------- | -------- | -------- |
| 1.0     | Creation | T.Bacher |


## Summary
This document attempts to describe the best practices on how to approach implementing Ink on a PDF
document, facilitated by the WILL3 Technology Stack.

## Main Basic Process

The overall practice from most development angles would be to approach the topic the following way:

1. Create new ink annotations field on a PDF page
2. Convert the Universal Ink Model (UIM) strokes into curves (Bezier)
3. Iterate over the generated curve to create a series of PDF drawing commands
4. Apply the drawing commands to the appearance stream of the form object
5. Add a serialized version of the UIM format to the fields metadata stream

However, the below steps will focus ona slightly differentapproach,especiallyconcerning the steps of
converting the UIMstrokes. This document focuses on converting UIM strokes into vector points.

### Guidance

This guidance is based on the use of the WILL SDK for Ink for Web development.

Using the web library requires the use of third-party libraries that must be included within
willexports\will\libs within the web project. The details are specified within the Third Party Library
document enclosed in the samples folder. Additionally, this guidance is based on WILL's Vector Ink.

#### Getting Started

Working with PDFs can vary, as they can involve working with a large variety of PDF third party
libraries. Broadly speaking, working with PDFs using WILL technology can create new PDFs with ink over
the PDF. Below is detailed how to fill a simple PDF template, with the steps broken down into:

- The creation of a PDF instance
- The creation of Vector points
- The image production

These sections are JavaScript templates for handling objects as classes. They describe the end to end
UIM to Vector graphics practice. All samples are available in the sample code under the respective .zip
file for web.

#### A PDF instance

Firstly, in the web development process of the application, a user will need to create a template for
creating the object with JavaScript. This template will be defined as a class and its main purpose will be
to work with the UIM file.

The method below demonstrates how to create a new PDF.

```
class PDFGenerator { static pdfTemplate = "%PDF-1.4 \n" +  
            "%âãÏÓ\n" +  
            "1 0 obj\n" +  
             "<</Type/Page/Parent 3 0 R/Contents 2 0 R/MediaBox[0 0 $1
$2]/Resources<</ProcSet[/PDF]/ExtGState<<$3>>>>>>\n" +  
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
```

The constructor will create and initiate the instance of the class described above. 	 

#### Set the graphical elements

In this example, we will be using PostScript to describe graphic elements on a page. We will thus need
to set PostScript commands from the working asset which is the InkModel:

```
inkModelToPDF = async function(inkModel, pdfWidth, pdfHeight, fit = true) { 
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
```


The above uses parameters which are respectively:

*param (InkMode) inkModel - InkModel imported from a UIM file.*
*param (float) pdfWidth - Width of the generated PDF.*
*param (float) pdfHeigth - Height of the generated PDF-1.*
*param (Boolean) fit - To scale strokes to fit the PDF dimensions.*

The steps that cover the attributes of the PDF creation process are defining the graphical step,
identifying it and stating the date format of the PDF. They are all described in the samples which can be
accessed in the .zip folder.

#### Ink Model Strokes

From there, since PostScript describes the graphical elements, we need to generate PostScript
commands for all the strokes in the inkModel:

```
drawStrokes = function 	(inkModel, pdfWidth, pdfHeight, fit) {
              this.psCommands = "" ;         
              this.graphicStates = new  Array 	();

                 if (fit) {
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

            this.psCommands += "1 0 0 -1 0 "+pdfHeight+" cm\n"; 
        
        }            
            for (let stroke of inkModel.strokes) {
                this.drawStroke(stroke);         
        }    
    } 

``` 

#### Path and Spline

From that point, here is how to generate each stroke: 

```
    drawStroke = function(stroke) {                 
        const path = stroke.path;            
        const color = stroke.color;

         if (!color) {
            if (stroke.spline) { 
    color = stroke.spline.color;
             } else { 
                return;  
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
                 
                 this.psCommands += "q \n";
                 this.psCommands += "/GS"+(this.graphicStates.indexOf(color.alpha)+1)+" gs\n";
                 this.psCommands += (color.red/256)+" "+(color.green/256)+" "+(color.blue/256)+" rg\n";  
                 this.drawPath(path);                 
                
                 this.psCommands += "Q \n"; 
```

The above uses the following parameter respectively:

*param (Stroke) stroke - stroke.*

Below is how to generate the PostScript commands for a path, where we create a Spline from there
using a dedicated function (enclosed in the samples).

```
drawPath = function(path) {
    path.forEach((contour, idx) => {
        this.psCommands += contour[0]+" "+contour[1]+" m ";

        if (path.holesClockwise || idx == 0) {
            for (let i = 2; i < contour.length; i += 2) {
                this.psCommands += contour[i]+" "+contour[i+1]+" l ";
            }
        }
        else {
            for (let i = contour.length - 2; i >= 0; i -= 2) {
                this.psCommands += contour[i]+" "+contour[i+1]+" l ";
            }
        }


        //this.psCommands += "h "; // close path
    });

    this.psCommands += "f "; // fill the path
}
```

#### Vector points

From there our second template to handle our JavaScript object here in our web development process
is to have a class whose main purpose will be generate the XML-based vector image format (Scalable
Vector Graphics):


```
class SVGGenerator {
    constructor(){
    }

    inkModelToSVG = async function(inkModel, svgWidth, svgHeight, fit = true) {
    const node = document.createElement("div");
    const svg = document.createElementNS('http://www.w3.org/2000/svg',
    'svg');
    const inkPath = document.createElementNS('http://www.w3.org/2000/svg',
    'path');
    svg.setAttribute('viewBox', '0 0 '+svgWidth+' '+svgHeight);
    this.drawStrokes(svg, inkModel, svgWidth, svgHeight, fit);
    node.appendChild(svg);
    return node.innerHTML;
    }

```

Here is how to generate PostScript commands for all the strokes in the inkModel.

```
drawStrokes = function (svg, inkModel, svgWidth, svgHeight, fit) {
          const inkGroup = document.createElementNS('http://www.w3.org/2000/svg','g');
          svg.appendChild(inkGroup); 
          
          if (fit) { 
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

                  for (let stroke of inkModel.strokes) {
                      this.drawStroke(inkGroup, stroke);       
        } 
    } 
 ```

From there, we describe how to generate each strokes PostScript command: 

```
drawStroke = function(inkGroup, stroke) {
                     const path = stroke.path;
                     const color = stroke.color; 
                     path.holesClockwise = true;
                     const inkPath = document.createElementNS('http://www.w3.org/2000/svg','path');
                     inkPath.setAttribute("fill",  this	.rgbToHex(color.red, color 	.green, color.blue)); 
                     inkPath.setAttribute("fill-opacity", color.alpha);
                     inkPath.setAttribute("d", this.drawPath(path));
                     inkGroup.appendChild(inkPath); 
              } 
 ```

##### Path and Spline

The next step is to demonstrate how to generate the XML-based path (SVG):

```
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
```

#### Image producing

The next step is about rasterization. The below template is defined as a class to handle the drawing
with a brush from the SVG path handled previously:

```
class RasterGenerator {

   constructor(){ 

    this.bounds = new Rect(0, 0, canvas.width, canvas.height);
    this.ctx = canvas.getContext("2d");
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;
    this.pdfWidth = pdfWidth;
    this.pdfHeight = pdfHeight;
}
```

From there we describe the use of dedicated functions to handle the stroke definition, the path and
the spline. The functions use the following parameters:

*param (Stroke) stroke Stroke model instance*
*return (Rect) Affected area*
*param (PathBuilding.Path2D) path Contours list*
*param (Color) color Stroke color*
*return (Rect) Affected area*

```
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

    path.holesClockwise = true;


    console.log("alpha= "+color.alpha);
    graphics +=" q /GS1 gs ";
    graphics += color.red+" "+color.green+" "+color.blue+" RG ";
    graphics += this.drawPath(path, `rgb(${color.red}, ${color.green}, ${color.blue}, ${color.alpha})`);
    graphics += " Q ";

        if (brush.pattern) graphics += this.drawPath(path, brush.pattern);
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
        
        this.ctx.lineTo(point.x, point.y);
        this.ctx.closePath();
        
        this.ctx.fill();
        
        dirtyArea = new Rect(point.x - radius, point.y - radius, point.size, point.size).union(dirtyArea);
    }     
    this.ctx.restore();
}
}
```

The overall guidance described above aims at demonstrating how to design an area to place the UIM
Universal Ink Model strokes on an instance of work for PDF and how the strokes can be converted into
vector data points in order to serve as a basis for integrating a PDF third-party library. 

That being said, the above describes the main approach and practice here on the JavaScript side where you may find
additional information by accessing our samples with guided comments along the code on the different
samples and platforms available in the zip folders.