require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user.js");
const Node = require("../models/node.js");

async function createTestUsers() {
  try {
    await mongoose.connect(process.env.TEST_MONGODB_URI);

    // Find or create the test node
    let node = await Node.findOne({ name: "Test Store" });

    if (!node) {
      node = await Node.create({
        name: "Test Store",
        parent: null,
      });
    }

    // Create test accounts if they don't already exist
    const users = [
      {
        name: "Test Manager",
        email: "test.manager@example.com",
        password: "TestManager123!",
        role: "manager",
      },
      {
        name: "Test Employee",
        email: "test.employee@example.com",
        password: "TestEmployee123!",
        role: "employee",
      },
    ];

    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      await User.updateOne(
        { email: userData.email },
        {
          $setOnInsert: {
            name: userData.name,
            email: userData.email,
            password: hashedPassword,
            role: userData.role,
            node: node._id,
          },
        },
        { upsert: true },
      );
    }

    console.log("Test users are ready");
  } catch (error) {
    console.error("Failed to create test users:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

createTestUsers();
