const express = require("express");
const cors = require("cors");
const session = require("express-session");
const mongoose = require("mongoose");

const app = express();

// ------------------- MIDDLEWARE -------------------
app.use(cors());
app.use(express.json());

app.use(session({
  secret: "my-secret-key",
  resave: false,
  saveUninitialized: true
}));

// ------------------- MONGODB -------------------
mongoose.connect("mongodb+srv://mattharlin56_db_user:boisemobilservices.com@admin.u4zdgvy.mongodb.net/?appName=admin")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// ------------------- MODEL -------------------
const Request = mongoose.model("Request", {
  name: String,
  issue: String,
  time: Date
});

// ------------------- HOME -------------------
app.get("/api/requests", async (req, res) => {
  const requests = await Request.find().sort({ time: -1 });
  res.json(requests);
});
app.get("/data", (req, res) => {
  if (!req.session.auth) {
    return res.send("<h2>Access denied. Please log in.</h2>");
  }

  res.send(`
    <html>
    <head>
      <title>Live Dashboard</title>
      <style>
        body { font-family: Arial; padding: 20px; background: #f4f4f4; }
        .card { background: white; padding: 15px; margin: 10px; border-radius: 10px; }
      </style>
    </head>

    <body>
      <h1>Live Service Requests</h1>
      <div id="container"></div>

      <script>
        async function loadRequests() {
          const res = await fetch("/api/requests");
          const data = await res.json();

          const container = document.getElementById("container");

          container.innerHTML = data.map(r => \`
            <div class="card">
              <p><b>Name:</b> \${r.name}</p>
              <p><b>Issue:</b> \${r.issue}</p>
              <p><b>Time:</b> \${new Date(r.time).toLocaleString()}</p>
            </div>
          \`).join("");
        }

        loadRequests();
        setInterval(loadRequests, 3000);
      </script>
    </body>
    </html>
  `);
});
// ------------------- CREATE REQUEST -------------------
app.post("/request", async (req, res) => {
  const job = new Request({
    name: req.body.name,
    issue: req.body.issue,
    time: new Date()
  });

  await job.save();

  console.log("Saved:", job);
  res.json({ status: "saved" });
});

// ------------------- ADMIN LOGIN -------------------
app.post("/admin/login", (req, res) => {
  const { password } = req.body;

  if (password === "1113") {
    req.session.auth = true;
    return res.json({ success: true });
  }

  res.status(401).json({ success: false });
});

// ------------------- ADMIN API (JSON) -------------------
app.get("/admin/requests", async (req, res) => {
  const auth = req.headers.authorization;

  if (auth !== "Bearer SECRET123") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const data = await Request.find();
  res.json(data);
});

// ------------------- LOGIN PAGE -------------------
app.get("/login", (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Admin Login</title>
    </head>
    <body style="font-family: Arial; padding: 40px;">
      <h2>Admin Login</h2>

      <input id="password" type="password" placeholder="Enter password" />
      <button onclick="login()">Login</button>

      <p id="msg"></p>

      <script>
        async function login() {
          const password = document.getElementById("password").value;

          const res = await fetch("/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
          });

          if (res.ok) {
            window.location.href = "/data";
          } else {
            document.getElementById("msg").innerText = "Wrong password";
          }
        }
      </script>
    </body>
    </html>
  `);
});

// ------------------- ADMIN DASHBOARD -------------------
app.get("/data", async (req, res) => {
  if (!req.session.auth) {
    return res.send("<h2>Access denied. Please log in.</h2>");
  }

  const requests = await Request.find();

  let html = `
  <html>
  <head>
    <title>Admin Dashboard</title>
    <style>
      body { font-family: Arial; padding: 20px; background: #f4f4f4; }
      .card { background: white; padding: 15px; margin: 10px; border-radius: 10px; }
    </style>
  </head>
  <body>
    <h1>Service Requests</h1>
  `;

  requests.forEach(r => {
    html += `
      <div class="card">
        <p><b>Name:</b> ${r.name}</p>
        <p><b>Issue:</b> ${r.issue}</p>
        <p><b>Time:</b> ${r.time}</p>
      </div>
    `;
  });

  html += "</body></html>";

  res.send(html);
});

// ------------------- START SERVER -------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
