const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/user.js");
const Node = require("./models/node.js");
const node = require("./models/node.js");
require("dotenv").config();

const users = [
  {
    name: "Maja Menadzeric",
    email: "maja.manager@company.com",
    password: "maja123",
    role: "manager",
    nodeName: "Srbija",
  },
  {
    name: "Jelena Jovanovic",
    email: "jelena.manager@company.com",
    password: "jelena123",
    role: "manager",
    nodeName: "Vojvodina",
  },
  {
    name: "Petar Petrovic",
    email: "petar.manager@company.com",
    password: "petar123",
    role: "manager",
    nodeName: "Detelinara",
  },
  {
    name: "Nikola Nikolic",
    email: "nikola.employee@company.com",
    password: "nikola123",
    role: "employee",
    nodeName: "Radnja 2",
  },
];

async function initializeUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas");
    for (const user of users) {
      const node = await Node.findOne({ name: user.nodeName });
      if (!node) {
        throw new Error(`Node not found: ${user.nodeName}`);
      }
      const hashedPassword = await bcrypt.hash(user.password, 10);

      await User.findOneAndUpdate(
        { email: user.email },
        {
          name: user.name,
          email: user.email,
          password: hashedPassword,
          role: user.role,
          node: node._id,
        },
        {
          upsert: true,
          runValidators: true,
        },
      );
      console.log(`Initialized user: ${user.email}`);
    }
    console.log("User initialization complete");
  } catch (error) {
    console.error("User initialization failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

initializeUsers();
