class URIBuilder {
	constructor(name) {
		this.host = name;
	}

	// type - raster | vector
	getBrushURI(type, name) {
		return `app://${this.host}/${type}-brush/${name}`;
	}

	// type - shape | fill
	getBrushImageURI(type, name) {
		return `app://${this.host}/raster-brush-${type}/${name}`;
	}

	getBrushPrototypeURI(name, query = "") {
		return `app://${this.host}/vector-brush-shape/${name}${query ? "?" : ""}${query}`;
	}

	getRenderModeURI(name) {
		return `app://${this.host}/render-mode/${name}`;
	}

	// type - remap | resolve
	getActionURI(type, name, query = "") {
		return `app://${this.host}/action-${type}/${name}${query ? "?" : ""}${query}`;
	}
}
