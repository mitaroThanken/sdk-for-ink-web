let preloader = {
	init() {
		this.node = document.querySelector(".preloader");
		this.value = this.node.querySelector(".value");
		this.message = this.node.querySelector(".message");

		Object.defineProperty(this, "active", {get: () => this.node.style.display == "", enumerable: true});
	},

	open(bounds, message) {
		if (typeof bounds == "string") {
			message = bounds;
			bounds = null;

			this.node.style.left = 0;
			this.node.style.top = 0;
			this.node.style.width = "100%";
			this.node.style.height = "100%";
		}
		else {
			this.node.style.left = bounds.left + "px";
			this.node.style.top = bounds.top + "px";
			this.node.style.width = bounds.width + "px";
			this.node.style.height = bounds.height + "px";
		}

		this.setProgress();
		this.setMessage(message);

		this.node.style.display = "";
	},

	close() {
		this.node.style.display = "none";
	},

	setProgress(value) {
		if (isNaN(value))
			this.value.textContent = "";
		else
			this.value.textContent = Math.round(value) + "%";
	},

	setMessage(message) {
		if (message) {
			this.node.classList.add("message");

			this.message.textContent = message;
		}
		else {
			this.node.classList.remove("message");

			this.message.textContent = "";
		}
	}
};

addEventListener("DOMContentLoaded", preloader.init.bind(preloader));
