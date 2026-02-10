import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "node:path";
import * as fs from "fs";
import http from "node:http";
import https from "node:https";

console.log("IN PROG")

const __PRODUCTION__ = process.env.PRODUCTION === "Y";

const SSL_KEY = fs.readFileSync(process.env.SSL_KEY ?? path.resolve(__dirname, "../key.pem"));
const SSL_CERT = fs.readFileSync(process.env.SSL_CERT ?? path.resolve(__dirname, "../cert.pem"));
const PORT = __PRODUCTION__ ? 3000 : 3001;

const app = express();

const server = __PRODUCTION__
  ? https.createServer({ key: SSL_KEY, cert: SSL_CERT }, app)
  : http.createServer(app);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.resolve(__dirname, "../../client/build")));
app.use("/public", express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, `../../client/build`, "index.html"));
});

server.listen(PORT, () => {
  if (__PRODUCTION__) console.log("App listening on port", PORT);
  else console.log(`App listening at http://localhost:3001`);
});


