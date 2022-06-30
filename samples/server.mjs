import path from "path"
import {createRequire} from "module"

import http from "http"
import express from "express"

const port = process.argv.slice(2)[0] || 8080
const __basedir = path.resolve("./")

const require = createRequire(import.meta.url);
const packageJSON = require(`${__basedir}/package.json`);

/* ******************************** Server configuration ******************************** */

const app = express()
const server = http.createServer(app)

app.use((request, response, next) => {
	if (request.headers["user-agent"].includes("Firefox")) {
		next()
		return
	}

	response.setHeader("Cross-Origin-Embedder-Policy", "require-corp")
	response.setHeader("Cross-Origin-Opener-Policy", "same-origin")

	next()
})

/* ********************************** Server endpoints ********************************** */

// pre-flight requests
app.options("*", (request, response) => response.sendStatus(200))

app.get("/ping", (request, response) => {
	let date = new Date()

	response.setHeader("Content-Type", "application/json; charset=utf-8")

	response.status(200).end(JSON.stringify({
		ident: packageJSON.name,
		status: "OK",
		timestamp: Math.round(date.getTime() / 1000),
		date: date.toISOString()
	}))
})

app.get("*", (request, response) => {
	response.sendFile(path.join(__basedir, request.path))
})

/* ****************************** ************************ ****************************** */

server.listen(port)
