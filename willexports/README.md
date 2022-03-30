# Wacom InkModel Export Utilities

## Introduction

**Wacom InkModel Export Utilities** enables the retrieval of vector data from ink and saving it to a PDF, SVG or other scalable formats. This may be done through specific apps for Windows, iOS and Android, as well as one developed for web use.

The Android and Windows applications are supported by all up-to-date devices. Similarly, the web application is written purely in JavaScript and supports all up-to-date browsers. The iOS sample requires iOS 11.

## Ways of exporting to other formats


### Exporting Vector Data

Below, an example is detailed of how vector data from ink data in C# can be obtained:

```
    var splineInterpolator = new CurvatureBasedInterpolator();
    var brushApplier = new BrushApplier(vectorBrush);
    var points = splineInterpolator.Add(true, true, stroke.Spline.ToSpline(), null);
    var polys = brushApplier.Add(true, true, points.Addition, points.Prediction);
    var hulls = mConvexHullChainProducer.Add(true, true, polys.Addition, polys.Prediction);
    var merged = mPolygonMerger.Add(true, true, hulls.Addition, hulls.Prediction);
    var simplified = mPolygonSimplifier.Add(true, true, merged.Addition,
    merged.Prediction);
```

The vector is now saved and contained in var simplified. This can be read by using:

```
foreach (var poly in simplified.Addition)
{
    for (int j = 0; j < poly.Count; j++)
    {
    var p = poly[j];
    if (j == 0) {
    psCommands.Append(p.X).Append(" ").Append(p.Y).Append(" m ");
    } else {
    psCommands.Append(p.X).Append(" ").Append(p.Y).Append(" l ");
    }
    }
}
```

This can be used to generate the commands required for formatting the output. For example, in Postscript, move and line commands for PDFs or SVGs.

### Exporting Raster Data


When the ink contains raster data, it is not possible to obtain vector data from it. In this scenario, the solution is to export to a raster format such as BMP, PNG, etc.

To do this, we read the pixels of the render canvas.

```
public System.Drawing.Bitmap toBitmap(System.Windows.Media.Color backgroundColor)
{
    Rect bounds = new Rect(0, 0, Width, Height);
    mRenderingContext.SetTarget(mSceneLayer);
    mRenderingContext.ClearColor(backgroundColor);

    // Blend stroke to Scene Layer
    mRenderingContext.SetTarget(mSceneLayer);
    mRenderingContext.DrawLayer(mAllStrokesLayer, null,
    Ink.Rendering.BlendMode.SourceOver);
    PixelData pixelData = mRenderingContext.ReadPixels(ref bounds);
    System.Drawing.Bitmap bmp = new System.Drawing.Bitmap((int)pixelData.m_pixelWidth,
    (int)pixelData.m_pixelHeight, System.Drawing.Imaging.PixelFormat.Format32bppRgb);
    BitmapData bmpData = bmp.LockBits(
    new System.Drawing.Rectangle(0, 0, bmp.Width, bmp.Height),
    ImageLockMode.WriteOnly, bmp.PixelFormat);
    System.Runtime.InteropServices.Marshal.Copy(pixelData.Data, 0, bmpData.Scan0,
    pixelData.Data.Length);
    bmp.UnlockBits(bmpData);
    return bmp;
}
```

This bitmap can be inserted on a PDF using an external PDF library.

## About the content of this folder

This folder the sample for export utilities within web browsers.

- loading.gif - loading graphic for willexports
- README.md - this file, containing general background and platform information.
- THIRDPARTY.md - file containing list of thirdparty software
- willexports.css - CSS component for willexports
- willexports.html - HTML component for willexports
- willexports.js - JS component for willexports
- will - additional demo components