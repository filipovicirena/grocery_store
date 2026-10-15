const request = require("supertest");
const app = require("../app");
const User = require("../models/user.js");
const Node = require("../models/node.js");

async function login(email, password) {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  expect(response.status).toBe(200);
  expect(response.body.token).toEqual(expect.any(String));
  return response.body.token;
}

async function getNodeId(name) {
  const node = await Node.findOne({ name });
  if (!node) {
    throw new Error(`${name} fixture is missing`);
  }
  return node._id.toString();
}

describe("Authentication and user creation", () => {
  test("logs in with valid credentials and uses the token", async () => {
    const token = await login("test.manager@example.com", "TestManager123!");

    const response = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
  });

  test("rejects invalid credentials", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "test.manager@example.com",
      password: "WrongPassword123",
    });

    expect(response.status).toBe(401);
  });

  test("rejects an email that does not exist", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "missing.user@example.com",
      password: "AnyPassword123!",
    });

    expect(response.status).toBe(401);
  });

  test("rejects requests without a token", async () => {
    const response = await request(app).get("/api/users");

    expect(response.status).toBe(401);
  });

  test("prevents employees from creating users", async () => {
    const token = await login("test.employee@example.com", "TestEmployee123!");
    const node = await Node.findOne({ name: "Test Store" });
    if (!node) {
      throw new Error("Test Store fixture is missing");
    }

    const response = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Another Employee",
        email: "another.employee@example.com",
        password: "Employee123!",
        role: "employee",
        node: node._id.toString(),
      });

    expect(response.status).toBe(403);
  });

  test("manager can create a user in their own node", async () => {
    const token = await login("test.manager@example.com", "TestManager123!");
    const node = await Node.findOne({ name: "Test Store" });
    if (!node) {
      throw new Error("Test Store fixture is missing");
    }
    const email = "created.by.test@example.com";

    try {
      const response = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Created By Test",
          email,
          password: "NewUser123!",
          role: "employee",
          node: node._id.toString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe(email);
    } finally {
      await User.deleteOne({ email });
    }
  });

  test("manager cannot create a user outside their hierarchy", async () => {
    const token = await login("test.manager@example.com", "TestManager123!");
    const email = "outside.hierarchy.test@example.com";
    const outsideNode = await Node.findOne({ name: "Outside Store" });
    if (!outsideNode) {
      throw new Error("Outside Store fixture is missing");
    }

    try {
      const response = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Outside User",
          email,
          password: "NewUser123!",
          role: "employee",
          node: outsideNode._id.toString(),
        });

      expect(response.status).toBe(403);
      expect(await User.findOne({ email })).toBeNull();
    } finally {
      await User.deleteOne({ email });
    }
  });
});

describe("User listing permissions", () => {
  test("manager sees users in their node and descendants", async () => {
    const token = await login("test.manager@example.com", "TestManager123!");

    const response = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.map((user) => user.email).sort()).toEqual([
      "child.employee@example.com",
      "child.manager@example.com",
      "test.employee@example.com",
      "test.manager@example.com",
    ]);
    expect(response.body.every((user) => !("password" in user))).toBe(true);
  });

  test("employee sees only employees in their node and descendants", async () => {
    const token = await login("test.employee@example.com", "TestEmployee123!");

    const response = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.map((user) => user.email).sort()).toEqual([
      "child.employee@example.com",
      "test.employee@example.com",
    ]);
    expect(response.body.every((user) => user.role === "employee")).toBe(true);
  });

  test("node listing includes only users from that node and respects employee role", async () => {
    const nodeId = await getNodeId("Test Store");
    const managerToken = await login(
      "test.manager@example.com",
      "TestManager123!",
    );
    const employeeToken = await login(
      "test.employee@example.com",
      "TestEmployee123!",
    );

    const managerResponse = await request(app)
      .get(`/api/users/node/${nodeId}`)
      .set("Authorization", `Bearer ${managerToken}`);
    const employeeResponse = await request(app)
      .get(`/api/users/node/${nodeId}`)
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(managerResponse.status).toBe(200);
    expect(managerResponse.body.map((user) => user.email).sort()).toEqual([
      "test.employee@example.com",
      "test.manager@example.com",
    ]);
    expect(employeeResponse.status).toBe(200);
    expect(employeeResponse.body.map((user) => user.email)).toEqual([
      "test.employee@example.com",
    ]);
  });

  test("employee listing endpoints return one node or that node's descendants", async () => {
    const nodeId = await getNodeId("Test Store");
    const token = await login("test.employee@example.com", "TestEmployee123!");

    const nodeResponse = await request(app)
      .get(`/api/users/node/${nodeId}/employees`)
      .set("Authorization", `Bearer ${token}`);
    const descendantsResponse = await request(app)
      .get(`/api/users/node/${nodeId}/employees/descendants`)
      .set("Authorization", `Bearer ${token}`);

    expect(nodeResponse.status).toBe(200);
    expect(nodeResponse.body.map((user) => user.email)).toEqual([
      "test.employee@example.com",
    ]);
    expect(descendantsResponse.status).toBe(200);
    expect(descendantsResponse.body.map((user) => user.email).sort()).toEqual([
      "child.employee@example.com",
      "test.employee@example.com",
    ]);
  });

  test("manager listing endpoints return one node or that node's descendants", async () => {
    const nodeId = await getNodeId("Test Store");
    const token = await login("test.manager@example.com", "TestManager123!");

    const nodeResponse = await request(app)
      .get(`/api/users/node/${nodeId}/managers`)
      .set("Authorization", `Bearer ${token}`);
    const descendantsResponse = await request(app)
      .get(`/api/users/node/${nodeId}/managers/descendants`)
      .set("Authorization", `Bearer ${token}`);

    expect(nodeResponse.status).toBe(200);
    expect(nodeResponse.body.map((user) => user.email)).toEqual([
      "test.manager@example.com",
    ]);
    expect(descendantsResponse.status).toBe(200);
    expect(descendantsResponse.body.map((user) => user.email).sort()).toEqual([
      "child.manager@example.com",
      "test.manager@example.com",
    ]);
  });

  test("employees cannot list managers", async () => {
    const nodeId = await getNodeId("Test Store");
    const token = await login("test.employee@example.com", "TestEmployee123!");

    const nodeResponse = await request(app)
      .get(`/api/users/node/${nodeId}/managers`)
      .set("Authorization", `Bearer ${token}`);
    const descendantsResponse = await request(app)
      .get(`/api/users/node/${nodeId}/managers/descendants`)
      .set("Authorization", `Bearer ${token}`);

    expect(nodeResponse.status).toBe(403);
    expect(descendantsResponse.status).toBe(403);
  });

  test("users cannot list users from outside their hierarchy", async () => {
    const outsideNodeId = await getNodeId("Outside Store");
    const managerToken = await login(
      "test.manager@example.com",
      "TestManager123!",
    );
    const employeeToken = await login(
      "test.employee@example.com",
      "TestEmployee123!",
    );

    const managerResponse = await request(app)
      .get(`/api/users/node/${outsideNodeId}`)
      .set("Authorization", `Bearer ${managerToken}`);
    const employeeResponse = await request(app)
      .get(`/api/users/node/${outsideNodeId}/employees`)
      .set("Authorization", `Bearer ${employeeToken}`);
    const managerListResponse = await request(app)
      .get(`/api/users/node/${outsideNodeId}/managers`)
      .set("Authorization", `Bearer ${managerToken}`);

    expect(managerResponse.status).toBe(403);
    expect(employeeResponse.status).toBe(403);
    expect(managerListResponse.status).toBe(403);
  });
});

describe("User creation validation", () => {
  test("manager can create a user in a descendant node", async () => {
    const token = await login("test.manager@example.com", "TestManager123!");
    const childNodeId = await getNodeId("Test Child Store");
    const email = "created.in.descendant@example.com";

    try {
      const response = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Descendant User",
          email,
          password: "NewUser123!",
          role: "employee",
          node: childNodeId,
        });

      expect(response.status).toBe(201);
      expect(response.body.node).toBe(childNodeId);
      expect(response.body).not.toHaveProperty("password");
    } finally {
      await User.deleteOne({ email });
    }
  });

  test("manager cannot create a user without all required fields", async () => {
    const token = await login("test.manager@example.com", "TestManager123!");

    const response = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Incomplete User" });

    expect(response.status).toBe(400);
  });

  test("manager cannot create a user with an existing email", async () => {
    const token = await login("test.manager@example.com", "TestManager123!");
    const nodeId = await getNodeId("Test Store");

    const response = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Duplicate User",
        email: "test.employee@example.com",
        password: "NewUser123!",
        role: "employee",
        node: nodeId,
      });

    expect(response.status).toBe(409);
  });
});

describe("User updates", () => {
  test("manager can partially update an in-scope user", async () => {
    const token = await login("test.manager@example.com", "TestManager123!");
    const user = await User.findOne({
      email: "child.employee@example.com",
    });
    if (!user) {
      throw new Error("Child Employee fixture is missing");
    }

    const originalName = user.name;
    const originalEmail = user.email;
    const originalRole = user.role;
    const originalNode = user.node.toString();

    try {
      const response = await request(app)
        .patch(`/api/users/${user._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Updated Child Employee" });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Updated Child Employee");
      expect(response.body.email).toBe(originalEmail);
      expect(response.body.role).toBe(originalRole);
      expect(response.body.node).toBe(originalNode);
      expect(response.body).not.toHaveProperty("password");

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.name).toBe("Updated Child Employee");
      expect(updatedUser.email).toBe(originalEmail);
    } finally {
      await User.updateOne({ _id: user._id }, { $set: { name: originalName } });
    }
  });

  test("manager cannot update a user's password through this route", async () => {
    const token = await login("test.manager@example.com", "TestManager123!");
    const user = await User.findOne({
      email: "child.employee@example.com",
    });
    if (!user) {
      throw new Error("Child Employee fixture is missing");
    }
    const originalPassword = user.password;

    const response = await request(app)
      .patch(`/api/users/${user._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "ChangedPassword123!" });

    expect(response.status).toBe(400);
    const unchangedUser = await User.findById(user._id);
    expect(unchangedUser.password).toBe(originalPassword);
  });

  test("employee cannot update users", async () => {
    const token = await login("test.employee@example.com", "TestEmployee123!");
    const userId = await User.findOne({
      email: "child.employee@example.com",
    }).then((user) => user._id.toString());

    const response = await request(app)
      .patch(`/api/users/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Not Allowed" });

    expect(response.status).toBe(403);
  });

  test("manager cannot update a user outside their hierarchy", async () => {
    const token = await login("test.manager@example.com", "TestManager123!");
    const userId = await User.findOne({
      email: "outside.employee@example.com",
    }).then((user) => user._id.toString());

    const response = await request(app)
      .patch(`/api/users/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Not Allowed" });

    expect(response.status).toBe(403);
  });
});

describe("User deletion", () => {
  test("manager can delete an in-scope user", async () => {
    const token = await login("test.manager@example.com", "TestManager123!");
    const childNodeId = await getNodeId("Test Child Store");
    const user = await User.create({
      name: "User To Delete",
      email: "user.to.delete@example.com",
      password: "NotUsed123!",
      role: "employee",
      node: childNodeId,
    });

    const response = await request(app)
      .delete(`/api/users/${user._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(204);
    expect(await User.findById(user._id)).toBeNull();
  });

  test("employee cannot delete users", async () => {
    const token = await login("test.employee@example.com", "TestEmployee123!");
    const user = await User.findOne({
      email: "child.employee@example.com",
    });
    if (!user) {
      throw new Error("Child Employee fixture is missing");
    }

    const response = await request(app)
      .delete(`/api/users/${user._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(await User.findById(user._id)).not.toBeNull();
  });

  test("manager cannot delete a user outside their hierarchy", async () => {
    const token = await login("test.manager@example.com", "TestManager123!");
    const user = await User.findOne({
      email: "outside.employee@example.com",
    });
    if (!user) {
      throw new Error("Outside Employee fixture is missing");
    }

    const response = await request(app)
      .delete(`/api/users/${user._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(await User.findById(user._id)).not.toBeNull();
  });

  test("manager gets 404 when deleting a nonexistent user", async () => {
    const token = await login("test.manager@example.com", "TestManager123!");

    const response = await request(app)
      .delete("/api/users/000000000000000000000000")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});

describe("Direct descendant node access", () => {
  test("manager and employee see the correct users in a child node", async () => {
    const childNodeId = await getNodeId("Test Child Store");
    const managerToken = await login(
      "test.manager@example.com",
      "TestManager123!",
    );
    const employeeToken = await login(
      "test.employee@example.com",
      "TestEmployee123!",
    );

    const managerResponse = await request(app)
      .get(`/api/users/node/${childNodeId}`)
      .set("Authorization", `Bearer ${managerToken}`);
    const employeeResponse = await request(app)
      .get(`/api/users/node/${childNodeId}`)
      .set("Authorization", `Bearer ${employeeToken}`);

    expect(managerResponse.status).toBe(200);
    expect(managerResponse.body.map((user) => user.email).sort()).toEqual([
      "child.employee@example.com",
      "child.manager@example.com",
    ]);
    expect(employeeResponse.status).toBe(200);
    expect(employeeResponse.body.map((user) => user.email)).toEqual([
      "child.employee@example.com",
    ]);
  });
});
