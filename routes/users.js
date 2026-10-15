const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth.js");
const getNodeAndDescendantIds = require("../utils/nodeHelpers.js");
const User = require("../models/user.js");
const bcrypt = require("bcryptjs");

//gets users from user's node and lower, managers get all users, employees get only employees
router.get("/", authenticateToken, async (req, res) => {
  try {
    const nodeIds = await getNodeAndDescendantIds(req.user.node);

    let query;

    if (req.user.role === "manager") {
      query = {
        node: { $in: nodeIds },
      };
    } else {
      query = {
        node: { $in: nodeIds },
        role: "employee",
      };
    }

    const users = await User.find(query).select("-password");

    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve users",
      error: error.message,
    });
  }
});
//lets managers create a new user in their node or lower
router.post("/", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({
        message: "Only managers can create users",
      });
    }
    const { name, email, password, role, node } = req.body;

    if (!name || !email || !password || !role || !node) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const allowedNodeIds = await getNodeAndDescendantIds(req.user.node);

    if (!allowedNodeIds.includes(node)) {
      return res
        .status(403)
        .json({ message: "Creating users in this node not allowed" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      node,
    });

    const safeUser = newUser.toObject();
    delete safeUser.password;
    res.status(201).json(safeUser);
  } catch (error) {
    console.error("Error creating user:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "A user with this email already exists",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid user data",
      });
    }

    res.status(500).json({
      message: "Failed to create user",
    });
  }
});
//lists users in requested node, managers get all users, employees only get employees; node must be the same as the user's or lower
router.get("/node/:nodeId", authenticateToken, async (req, res) => {
  try {
    const { nodeId } = req.params;

    const allowedNodeIds = await getNodeAndDescendantIds(req.user.node);

    if (!allowedNodeIds.includes(nodeId)) {
      return res.status(403).json({
        message: "You cannot access this node",
      });
    }

    let query = { node: nodeId };

    if (req.user.role === "employee") {
      query.role = "employee";
    }

    const users = await User.find(query).select("-password");

    res.json(users);
  } catch (error) {
    console.error("Error retrieving users by node:", error);

    res.status(500).json({
      message: "Failed to retrieve users",
    });
  }
});
//gets all employees in requested node
router.get("/node/:nodeId/employees", authenticateToken, async (req, res) => {
  try {
    const { nodeId } = req.params;

    const allowedNodeIds = await getNodeAndDescendantIds(req.user.node);

    if (!allowedNodeIds.includes(nodeId)) {
      return res.status(403).json({
        message: "You cannot access this node",
      });
    }

    const employees = await User.find({
      node: nodeId,
      role: "employee",
    }).select("-password");
    res.json(employees);
  } catch (error) {
    console.error("Error retrieving employees:", error);

    res.status(500).json({
      message: "Failed to retrieve employees",
    });
  }
});
//gets all employees in requested node and descendants
router.get(
  "/node/:nodeId/employees/descendants",
  authenticateToken,
  async (req, res) => {
    try {
      const { nodeId } = req.params;
      const allowedNodeIds = await getNodeAndDescendantIds(req.user.node);

      if (!allowedNodeIds.includes(nodeId)) {
        return res.status(403).json({
          message: "You cannot access this node",
        });
      }
      const nodeIds = await getNodeAndDescendantIds(nodeId);
      const employees = await User.find({
        node: { $in: nodeIds },
        role: "employee",
      }).select("-password");
      res.json(employees);
    } catch (error) {
      console.error("Error retrieving employees and descendants:", error);

      res.status(500).json({
        message: "Failed to retrieve employees",
      });
    }
  },
);
//gets all managers in requested node
router.get("/node/:nodeId/managers", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({
        message: "Only managers can retrieve managers",
      });
    }
    const { nodeId } = req.params;
    const allowedNodeIds = await getNodeAndDescendantIds(req.user.node);
    if (!allowedNodeIds.includes(nodeId)) {
      return res.status(403).json({ message: "You cannot access this node" });
    }
    const managers = await User.find({
      node: nodeId,
      role: "manager",
    }).select("-password");

    res.json(managers);
  } catch (error) {
    console.error("Error retrieving managers:", error);

    res.status(500).json({
      message: "Failed to retrieve managers",
    });
  }
});
//gets all managers in requested node and descendants
router.get(
  "/node/:nodeId/managers/descendants",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.role !== "manager") {
        return res.status(403).json({
          message: "Only managers can retrieve managers",
        });
      }
      const { nodeId } = req.params;
      const allowedNodeIds = await getNodeAndDescendantIds(req.user.node);

      if (!allowedNodeIds.includes(nodeId)) {
        return res.status(403).json({
          message: "You cannot access this node",
        });
      }
      const nodeIds = await getNodeAndDescendantIds(nodeId);
      const managers = await User.find({
        node: { $in: nodeIds },
        role: "manager",
      }).select("-password");
      res.json(managers);
    } catch (error) {
      console.error("Error retrieving managers and descendants:", error);

      res.status(500).json({
        message: "Failed to retrieve managers",
      });
    }
  },
);
//updates user info, managers can update users in their node or lower, employees can't do anything
router.patch("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({
        message: "Only managers can update users",
      });
    }

    if (req.body.password !== undefined) {
      return res.status(400).json({
        message: "Password cannot be updated through this endpoint",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    if (user._id.toString() === req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You cannot edit your own account" });
    }
    const allowedNodeIds = await getNodeAndDescendantIds(req.user.node);

    if (!allowedNodeIds.includes(user.node.toString())) {
      return res.status(403).json({
        message: "You cannot update this user",
      });
    }
    const { name, email, role, node } = req.body;

    if (role !== undefined && !["employee", "manager"].includes(role)) {
      return res.status(400).json({
        message: "Role must be employee or manager",
      });
    }

    if (node !== undefined && !allowedNodeIds.includes(node)) {
      return res.status(403).json({
        message: "You cannot move users to this node",
      });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (node !== undefined) user.node = node;

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    res.json(safeUser);
  } catch (error) {
    console.error("Error updating user:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "A user with this email already exists",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid user data",
      });
    }

    res.status(500).json({
      message: "Failed to update user",
    });
  }
});
//deletes user, managers can delete users in their node or lower, employees can't do anything
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "manager") {
      return res.status(403).json({
        message: "Only managers can delete users",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const allowedNodeIds = await getNodeAndDescendantIds(req.user.node);

    if (!allowedNodeIds.includes(user.node.toString())) {
      return res.status(403).json({
        message: "You cannot delete this user",
      });
    }

    await user.deleteOne();
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting user:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    res.status(500).json({
      message: "Failed to delete user",
    });
  }
});

module.exports = router;
