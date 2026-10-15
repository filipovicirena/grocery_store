const express = require("express");
const app = express();

const mongoose = require("mongoose");

require("dotenv").config();

const userRoutes = require("./routes/users.js");
const authRoutes = require("./routes/auth.js");

app.use(express.json());
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Grocery store API is running");
  console.log("Grocery store API is running");
});

module.exports = app;
