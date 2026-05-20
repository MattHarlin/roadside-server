require('dotenv').config(); // load .env variables

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const http = require("http");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 80;
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

// ---------------- MIDDLEWARE ----------------
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ---------------- MONGODB ----------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err));

// ---------------- MODEL ----------------
const Request = mongoose.model("Request", {
  name: String,
  issue: String,
  time: Date

});

// ---------------- AUTH ----------------
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const token = authHeader.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ---------------- ROUTES ----------------
app.get("/", (req, res) => {
  res.send("Server running");
});

// TEST DB
app.get("/testdb", async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.send("MongoDB works");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ---------------- API ----------------

// GET REQUESTS (protected)
app.get("/api/requests", verifyToken, async (req, res) => {
  try {
    const data = await Request.find().sort({ time: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE REQUEST (public)
app.post("/request", async (req, res) => {
  try {
    console.log("Incoming request:", req.body);

    const job = new Request({
      name: req.body.name,
      issue: req.body.issue,
      time: new Date()
    });

    await job.save();

    console.log("Saved request:", job);

    io.emit("new-request", job);

    res.json({ status: "saved", job });
  } catch (err) {
    console.log("POST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE REQUEST (protected)
app.delete("/api/requests/:id", verifyToken, async (req, res) => {
  try {
    const deleted = await Request.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- LOGIN ----------------
app.post("/admin/login", (req, res) => {
  const { password } = req.body;

  if (password === "1113") {
    const token = jwt.sign(
      { role: "admin" },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({ success: true, token });
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

          const data = await res.json();

          if (res.ok) {
            localStorage.setItem("token", data.token);
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
app.get("/data", (req, res) => {
  res.send(`
    <html>
    <body>
      <h1>Service Requests</h1>
      <div id="container"></div>

      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io();
        const container = document.getElementById("container");
        const token = localStorage.getItem("token");

        if (!token) {
          window.location.href = "/login";
        }

        function addCard(r) {
          const div = document.createElement("div");

          div.innerHTML =
            "<p><b>Name:</b> " + r.name + "</p>" +
            "<p><b>Issue:</b> " + r.issue + "</p>" +
            "<p><b>Time:</b> " + new Date(r.time).toLocaleString() + "</p>" +
            "<button onclick=\\"deleteRequest('" + r._id + "')\\">Delete</button>";

          container.prepend(div);
        }

        async function deleteRequest(id) {
          await fetch("/api/requests/" + id, {
            method: "DELETE",
            headers: {
              Authorization: "Bearer " + token
            }
          });

          location.reload();
        }

        socket.on("new-request", addCard);

        fetch("/api/requests", {
          headers: {
            Authorization: "Bearer " + token
          }
        })
        .then(res => res.json())
        .then(data => data.forEach(addCard));
      </script>
    </body>
    </html>
  `);
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 80;

server.listen(PORT, '0.0.0.0', () => {
  console.log("Server running on port", PORT);
});
