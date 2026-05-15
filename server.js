let requests = [];
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server running");
});

app.post("/request", (req, res) => {
  const job = {
    id: Date.now(),
    name: req.body.name,
    issue: req.body.issue,
    time: new Date()
  };

  requests.push(job);

  console.log("Job request:", job);
  res.json({ status: "received" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
app.get("/admin/requests", (req, res) => {
  res.json(requests);
});
