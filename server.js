const express = require("express");
const cors = require("cors");
const session = require("express-session");

const app = express();

app.use(cors());
app.use(express.json());

app.use(session({
  secret: "my-secret-key",
  resave: false,
  saveUninitialized: true
}));

let requests = [];

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

  if (password === "1113") {
    req.session.auth = true;
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
});
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
      // 👇 AUTO REDIRECT HERE
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
// ------------------- PUBLIC DATA PAGE -------------------
app.get("/data", (req, res) => {
  if (!req.session.auth) {
    return res.send("<h2>Access denied. Please log in.</h2>");
  }

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
  
