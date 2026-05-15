const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server running");
});

app.post("/request", (req, res) => {
  console.log("Job request:", req.body);
  res.json({ status: "received" });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});