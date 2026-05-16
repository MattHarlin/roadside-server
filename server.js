const express = require("express");
const cors = require("cors");
const session = require("express-session");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// ---------------- MIDDLEWARE ----------------
app.use(cors());
app.use(express.json());
// server.js

app.use(
  session({
    secret: "my-secret-key-change-this",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // keep false for Render HTTP (set true only with HTTPS + custom domain setup)
      maxAge: 1000 * 60 * 60 * 2 // 2 hours login session
    }
  })
);


// ---------------- MONGODB ----------------
mongoose
  .connect(
    "mongodb+srv://mattharlin56_db_user:roadside-server@admin.u4zdgvy.mongodb.net/roadside?retryWrites=true&w=majority"
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));
// ---------------- MODEL ----------------
const Request = mongoose.model("Request", {
  name: String,
  issue: String,
  time: Date
});

// ---------------- HOME ----------------
function requireAuth(req, res, next) {
  if (!req.session.auth) {
    return res.redirect("/login");
  }
  next();
} 
function requireAuthApi(req, res, next) {
  if (!req.session.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
app.get("/testdb", async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.send("MongoDB works");
  } catch (err) {
    console.log(err);
    res.status(500).send(err.message);
  }
});

app.get("/", (req, res) => {
  res.send("Server running");
});
// ---------------- API GET ----------------
app.get("/api/requests", async (req, res) => {
  const data = await Request.find().sort({ time: -1 });
  res.json(data);
});

// ---------------- CREATE REQUEST ----------------
app.post("/request", async (req, res) => {
  const job = new Request({
    name: req.body.name,
    issue: req.body.issue,
    time: new Date()
  });

  await job.save();

  io.emit("new-request", job);

  res.json({ status: "saved" });
});

// ---------------- LOGIN ----------------
app.post("/admin/login", (req, res) => {
  const { password } = req.body;

  if (password === "1113") {
    req.session.auth = true;
    return res.json({ success: true });
  }

  res.status(401).json({ success: false });
});

// ---------------- LOGIN PAGE ----------------
app.get("/login", (req, res) => {
  res.send(`
    <html>
    <body style="font-family: Arial; padding: 40px;">
      <h2>Admin Login</h2>

      <input id="password" type="password" placeholder="Password" />
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

// ---------------- DASHBOARD ----------------
app.get("/data", requireAuth, async (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Service Requests</h1>
        <a href="/logout">Logout</a>
        <div id="container"></div>

        <script src="/socket.io/socket.io.js"></script>
        <script>
          const socket = io();
          const container = document.getElementById("container");

          function addCard(r) {
            const div = document.createElement("div");
            div.innerHTML =
              "<p><b>Name:</b> " + r.name + "</p>" +
              "<p><b>Issue:</b> " + r.issue + "</p>" +
              "<p><b>Time:</b> " + new Date(r.time).toLocaleString() + "</p>";
            container.prepend(div);
          }

          socket.on("new-request", addCard);

          fetch("/api/requests")
            .then(res => res.json())
            .then(data => data.forEach(addCard));
        </script>
      </body>
    </html>
  `);
});
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
