const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let requests = [];

const ADMIN_PASSWORD = "1113";

// ------------------- HOME -------------------
app.get("/", (req, res) => {
  res.send("Server running");
});

// ------------------- CREATE REQUEST -------------------
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
// ------------------- ADMIN LOGIN -------------------
app.post("/admin/login", (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  }

  res.status(401).json({ success: false });
});

// ------------------- ADMIN GET REQUESTS -------------------
app.get("/admin/requests", (req, res) => {
  const auth = req.headers.authorization;

  if (auth !== "Bearer SECRET123") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  res.json(requests);
app.get("/data", (req, res) => {
  let html = `
  <html>
  <head>
    <title>Requests Dashboard</title>

    <style>
      body {
        font-family: Arial;
        padding: 20px;
        background: #f4f4f4;
      }

      h1 {
        text-align: center;
      }

      .card {
        background: white;
        padding: 15px;
        margin: 10px auto;
        max-width: 500px;
        border-radius: 10px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }

      .label {
        font-weight: bold;
      }
    </style>
  </head>

  <body>
    <h1>Service Requests</h1>
  `;

  requests.forEach(r => {
    html += `
      <div class="card">
        <p><span class="label">Name:</span> ${r.name}</p>
        <p><span class="label">Issue:</span> ${r.issue}</p>
        <p><span class="label">Time:</span> ${r.time}</p>
      </div>
    `;
  });

  html += `
  </body>
  </html>
  `;

  res.send(html);
});
// ------------------- START SERVER -------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
