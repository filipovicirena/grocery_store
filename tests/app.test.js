const request = require("supertest");
const app = require("../app");

describe("GET /", () => {
  test("returns the API status message", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toBe("Grocery store API is running");
  });
});
