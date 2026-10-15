
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user.js");
const Node = require("../models/node.js");

beforeAll(async () => {
    const testUri = process.env.TEST_MONGODB_URI;

    if (!testUri) {
        throw new Error("TEST_MONGODB_URI must be set before running tests");
    }
    if (testUri === process.env.MONGODB_URI) {
        throw new Error("Tests must use a database separate from MONGODB_URI");
    }

    await mongoose.connect(testUri);

    await User.deleteMany({});
    await Node.deleteMany({});

    const node = await Node.create({ name: "Test Store" });
    const childNode = await Node.create({
        name: "Test Child Store",
        parent: node._id
    });
    const outsideNode = await Node.create({ name: "Outside Store" });
    const passwordHash = await bcrypt.hash("TestManager123!", 10);
    const employeePasswordHash = await bcrypt.hash("TestEmployee123!", 10);

    await User.create([
        {
            name: "Test Manager",
            email: "test.manager@example.com",
            password: passwordHash,
            role: "manager",
            node: node._id
        },
        {
            name: "Test Employee",
            email: "test.employee@example.com",
            password: employeePasswordHash,
            role: "employee",
            node: node._id
        },
        {
            name: "Child Manager",
            email: "child.manager@example.com",
            password: passwordHash,
            role: "manager",
            node: childNode._id
        },
        {
            name: "Child Employee",
            email: "child.employee@example.com",
            password: employeePasswordHash,
            role: "employee",
            node: childNode._id
        },
        {
            name: "Outside Employee",
            email: "outside.employee@example.com",
            password: employeePasswordHash,
            role: "employee",
            node: outsideNode._id
        }
    ]);
});

afterAll(async () => {
    await User.deleteMany({});
    await Node.deleteMany({});
    await mongoose.disconnect();
});
