let protector = {
	init() {
		this.node = document.querySelector(".protector");

		this.node.style.display = "none";
		this.node.onpointerdown = e => e.stopPropagation();

		Object.defineProperty(this, "active", {get: () => this.node.style.display == "", enumerable: true});
	},

	activate(time) {
		let ts = Date.now();

		this.isTime = () => !this.active && Date.now() - ts > time;
	},

	async open(delay = true) {
		this.node.style.display = "";

		if (delay)
			await this.sleep(16);
	},

	sleep(time) {
		return new Promise((resolve, reject) => setTimeout(resolve, time));
	},

	close() {
		this.node.style.display = "none";

		delete this.isTime;
	}
};

addEventListener("DOMContentLoaded", protector.init.bind(protector));
