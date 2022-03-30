class NodeTraverser {
	constructor(lambda, lambdaOnFinish) {
		this.lambda = lambda;
		this.lambdaOnFinish = lambdaOnFinish;
	}

	abort() {
		this.aborted = true;
	}

	traverse(node) {
		this.aborted = false;
		this.traverseInternal(node);
	}

	traverseInternal(node) {
		//console.log("traverse: ", node.root.id, node.parent, node.id, node, node.children);
		if (this.aborted) return;

		if (this.lambda)
			this.lambda(node);

		if (node.children) {
			node.children.forEach(child => {
				if (!child)
					logDebug("ERROR: Invalid child: ", child, " for ", node);

				this.traverseInternal(child)
			});
		}

		if (this.lambdaOnFinish)
			this.lambdaOnFinish(node);
	}

	renderKatex() {
	}
}
