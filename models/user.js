const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["manager", "employee"],
    required: true,
  },
  node: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Node",
    required: true,
  },
});

module.exports = mongoose.model("User", userSchema);
