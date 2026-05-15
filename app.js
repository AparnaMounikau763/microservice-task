const express = require("express");
const mongoose = require("mongoose");
const client = require("prom-client");

const app = express();

app.use(express.json());

/* =========================================
   PROMETHEUS METRICS
========================================= */

// Collect default Node.js metrics
client.collectDefaultMetrics();

// Custom request counter
const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

// Middleware for counting requests
app.use((req, res, next) => {
  res.on("finish", () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode,
    });
  });

  next();
});

/* =========================================
   MONGODB CONNECTION
========================================= */

// Fallback value added here
const mongoURL =
  process.env.MONGO_URL || "mongodb://mongo:27017/tasks";

mongoose
  .connect(mongoURL)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.log("MongoDB Error:", err);
  });



const Task = mongoose.model("Task", {
  title: String,
  completed: Boolean,
});

/* =========================================
   ROUTES
========================================= */

// Home route
app.get("/", (req, res) => {
  res.send("Task Manager v2 - DevOps Working");
});

// Get all tasks
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find();

    res.json(tasks);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

// Create task
app.post("/tasks", async (req, res) => {
  try {
    const task = new Task(req.body);

    await task.save();

    res.json(task);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

// Delete task
app.delete("/tasks/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);

    res.send("Deleted");
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

/* =========================================
   METRICS ENDPOINT
========================================= */

app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", client.register.contentType);

    const metrics = await client.register.metrics();

    res.send(metrics);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/* =========================================
   SERVER
========================================= */

app.listen(3000, () => {
  console.log("Server running on port 3000");
});