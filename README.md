# Grocery Store API

A Node.js, Express, and MongoDB API for managing users across a hierarchical
grocery-store organization. Users can be either `manager` or `employee`, and
each user belongs to a node in the location hierarchy.

## Features

- JWT-based authentication
- Role-based access for managers and employees
- Hierarchical node permissions
- Manager and employee listing, creation, update, and deletion
- MongoDB-backed users and location nodes
- Docker and Docker Compose support
- Jest and Supertest API tests

## Requirements

Choose one of these setup methods:

- Node.js 24+ and npm, with a local or hosted MongoDB instance
- Docker and Docker Compose

## Environment variables

Create a `.env` file in the project root. An example is available in
`.env.example`.

```env
MONGODB_URI=mongodb://127.0.0.1:27017/grocery_store
JWT_SECRET=replace-with-a-long-random-secret
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/grocery_store_test
MONGO_ROOT_USERNAME=grocery_admin
MONGO_ROOT_PASSWORD=replace-with-a-local-password
```

- `MONGODB_URI` — MongoDB connection used by the API.
- `JWT_SECRET` — secret used to sign and verify login tokens.
- `TEST_MONGODB_URI` — separate database for Jest tests.
- `MONGO_ROOT_USERNAME` and `MONGO_ROOT_PASSWORD` — local MongoDB credentials
  used by Docker Compose.

The test setup requires `TEST_MONGODB_URI` to differ from `MONGODB_URI`.
It deletes users and nodes from the test database before and after the suite,
so never point it at data that needs to be preserved.

## Run locally

Install dependencies:

```bash
npm install
```

Initialize the location hierarchy and sample users:

```bash
npm run initNodes
npm run initUsers
```

`initNodes` deletes every existing node and creates the full hierarchy.
`initUsers` creates or updates four sample accounts. Run both scripts only
against a development database.

Start the API:

```bash
npm start
```

For automatic restarts during development:

```bash
npm run dev
```

The API listens on `http://localhost:3000`.

## Run with Docker Compose

Set `JWT_SECRET`, `MONGO_ROOT_USERNAME`, and `MONGO_ROOT_PASSWORD` in `.env`,
then run:

```bash
docker compose up --build
```

Docker Compose starts MongoDB 8.0 and the Node.js API. MongoDB data is stored
in the `mongodb_data` volume. The API is available at
`http://localhost:3000`.

To stop the containers:

```bash
docker compose down
```

Add `-v` to also remove the MongoDB volume:

```bash
docker compose down -v
```

## Initialize Docker data

After the containers are running, initialize the hierarchy and sample users:

```bash
docker compose exec api npm run initNodes
docker compose exec api npm run initUsers
```

These commands are destructive for nodes and update the sample users. Do not run
them against production data.

## Location hierarchy

The initialization script creates this hierarchy:

```text
Srbija
├── Vojvodina
│   ├── Severnbacki okrug
│   │   └── Subotica
│   │       └── Radnja 1
│   └── Juznobacki okrug
│       └── Novi Sad
│           ├── Detelinara
│           │   ├── Radnja 2
│           │   └── Radnja 3
│           └── Liman
│               ├── Radnja 4
│               └── Radnja 5
└── Grad Beograd
    ├── Novi Beograd
    │   └── Bezanija
    │       └── Radnja 6
    └── Vracar
        ├── Neimar
        │   └── Radnja 7
        └── Crveni krst
            ├── Radnja 8
            └── Radnja 9
```

## Sample accounts

| Role     | Email                         | Password    | Node       |
| -------- | ----------------------------- | ----------- | ---------- |
| Manager  | `maja.manager@company.com`    | `maja123`   | Srbija     |
| Manager  | `jelena.manager@company.com`  | `jelena123` | Vojvodina  |
| Manager  | `petar.manager@company.com`   | `petar123`  | Detelinara |
| Employee | `nikola.employee@company.com` | `nikola123` | Radnja 2   |

These credentials are for development only. Remove or change them before
deploying the application.

## API overview

### Root

```http
GET /
```

Returns:

```text
Grocery store API is running
```

### Authentication

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "maja.manager@company.com",
  "password": "maja123"
}
```

Successful login returns a JWT that expires after one hour:

```json
{
  "message": "Login successful",
  "token": "<jwt>"
}
```

Send the token to protected routes as:

```http
Authorization: Bearer <token>
```

Protected routes verify both the JWT and that the referenced user still exists.
Tokens become invalid if the user is deleted or if `JWT_SECRET` changes.

## User routes

All routes under `/api/users` require authentication.

| Method   | Path                                            | Access / description |
| -------- | ----------------------------------------------- | -------------------- |
| `GET`    | `/api/users`                                    | Current node and descendants. Managers see both roles; employees see employees only. |
| `POST`   | `/api/users`                                    | Managers only. Creates a user in the manager's node or one of its descendants. |
| `GET`    | `/api/users/node/:nodeId`                       | Users in one node. Managers see both roles; employees see employees only. Node must be within the caller's hierarchy. |
| `GET`    | `/api/users/node/:nodeId/employees`             | Employees in exactly one node. |
| `GET`    | `/api/users/node/:nodeId/employees/descendants` | Employees in the node and all descendants. |
| `GET`    | `/api/users/node/:nodeId/managers`              | Managers in exactly one node. Managers only. |
| `GET`    | `/api/users/node/:nodeId/managers/descendants`  | Managers in the node and all descendants. Managers only. |
| `PATCH`  | `/api/users/:id`                                | Managers only. Updates a non-self user within the manager's hierarchy. Password updates are rejected. |
| `DELETE` | `/api/users/:id`                                | Managers only. Deletes a user within the manager's hierarchy. |

A manager can access nodes below its own node. An employee can only access
employee users in its own node or descendants; employees cannot create, update,
or delete users.

### Create a user

```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Employee",
  "email": "new.employee@example.com",
  "password": "choose-a-password",
  "role": "employee",
  "node": "<node ObjectId>"
}
```

All fields are required. Valid roles are `employee` and `manager`. The destination
node must be within the authenticated manager's node and descendants.

### Update a user

```http
PATCH /api/users/<user ObjectId>
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "updated.email@example.com"
}
```

The update route accepts `name`, `email`, `role`, and `node`. It rejects password
updates. A manager cannot update their own account. The target and destination
node must remain within the manager's hierarchy.

### Delete a user

```http
DELETE /api/users/<user ObjectId>
Authorization: Bearer <token>
```

A successful deletion returns HTTP `204` with no response body.

## Tests

Run the Jest test suite:

```bash
npm test
```

The test script runs Jest serially and loads `tests/setup.js`. Test setup:

- requires `TEST_MONGODB_URI`;
- rejects the same database URI as `MONGODB_URI`;
- clears users and nodes;
- creates a test hierarchy and test users;
- removes test users and nodes after the suite.

## Project structure

```text
.
├── app.js               Express app and route registration
├── server.js            MongoDB connection and HTTP server startup
├── routes/
│   ├── auth.js          Login route
│   └── users.js         User and hierarchy routes
├── middleware/auth.js   JWT authentication middleware
├── models/
│   ├── node.js          Hierarchical location node model
│   └── user.js          User model
├── utils/nodeHelpers.js Hierarchy traversal helper
├── initNodes.js         Node hierarchy seed script
├── initUsers.js         Sample user seed script
├── tests/               Jest/Supertest suite and setup
├── Dockerfile           Node.js 24 container image
└── compose.yaml         API and MongoDB Compose services
```
