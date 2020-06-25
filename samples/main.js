app.disbaleZoom();

addEventListener("DOMContentLoaded", async (event) => {
	let pkg = await fsx.loadFile("/package.json", "json")

	document.getElementById("APPName").textContent = pkg.productName;
	document.getElementById("APPVersion").textContent = pkg.version;
	document.getElementById("SDKVersion").textContent = version;

	app.init();

	if (!localStorage.getItem("sample")) return;

	layout.init();

	$(".app").css("visibility", "hidden");
	await app.initInkController();
	$(".app").css("visibility", "");
});
