# Grocery Store API

A Node.js and Express API for managing grocery-store locations and users in a
hierarchical organization. Users have either the `manager` or `employee` role
and belong to a node in the location hierarchy stored in MongoDB.

## Requirements

- Node.js and npm
- MongoDB (local or MongoDB Atlas)

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/grocery_store
JWT_SECRET=replace-this-with-a-long-random-secret
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/grocery_store_test
```

For MongoDB Atlas, use the connection URI provided by Atlas for
`MONGODB_URI`. Use a separate database for `TEST_MONGODB_URI`; the test setup
deletes and recreates its users and nodes. Do not point it at a database
containing data you want to keep.

## Initialize the database

From the project root, create the location hierarchy and then seed sample
users:

```bash
npm run initNodes
npm run initUsers
```

`initNodes` deletes the existing nodes before creating the hierarchy.
`initUsers` creates or updates the sample accounts and expects their nodes to
exist. Run these scripts only against a development database.

Sample accounts created by `initUsers`:

| Role     | Email                         | Password    | Node       |
| -------- | ----------------------------- | ----------- | ---------- |
| Manager  | `maja.manager@company.com`    | `maja123`   | Srbija     |
| Manager  | `jelena.manager@company.com`  | `jelena123` | Vojvodina  |
| Manager  | `petar.manager@company.com`   | `petar123`  | Detelinara |
| Employee | `nikola.employee@company.com` | `nikola123` | Radnja 2   |

These are development credentials. Change or remove them before deploying the
application.

## Run the API

```bash
npm start
```

The API listens on `http://localhost:3000`. For automatic restarts during
development:

```bash
npm run dev
```

The root endpoint `GET /` returns a short API status message.

## Authentication

Log in to receive a JSON Web Token:

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "maja.manager@company.com",
  "password": "maja123"
}
```

Send the returned token to protected routes using:

```http
Authorization: Bearer <token>
```

## User API

All user routes are under `/api/users`. Except for login and the root status
route, API operations require a valid bearer token.

| Method   | Path                                            | Description                                                                                                                              |
| -------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/users`                                    | List users in the current user's node and descendants. Managers see both roles; employees see employees only.                            |
| `POST`   | `/api/users`                                    | Create a user. Managers only; the new user must belong to the manager's node or a descendant.                                            |
| `GET`    | `/api/users/node/:nodeId`                       | List users in one node. Managers see both roles; employees see employees only.                                                           |
| `GET`    | `/api/users/node/:nodeId/employees`             | List employees in one node.                                                                                                              |
| `GET`    | `/api/users/node/:nodeId/employees/descendants` | List employees in the specified node and its descendants.                                                                                |
| `GET`    | `/api/users/node/:nodeId/managers`              | List managers in one node. Managers only.                                                                                                |
| `GET`    | `/api/users/node/:nodeId/managers/descendants`  | List managers in the specified node and its descendants. Managers only.                                                                  |
| `PATCH`  | `/api/users/:id`                                | Partially update a user's name, email, role, or node. Managers only; target and destination node must be within the manager's hierarchy. |
| `DELETE` | `/api/users/:id`                                | Delete a user. Managers only; target must be in the manager's hierarchy.                                                                 |

Managers can only access users in their own node or descendants. Employees can
only see employees in their own node or descendants and cannot create, update,
or delete users. Passwords are not included in user responses and cannot be
changed through the `PATCH` route. A manager cannot update their own account.

### Create a user

```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "name": "New Employee",
  "email": "new.employee@example.com",
  "password": "choose-a-password",
  "role": "employee",
  "node": "<node ObjectId>"
}
```

### Partially update a user

Include only the fields that should change:

```http
PATCH /api/users/<user ObjectId>
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "email": "updated.email@example.com"
}
```

### List employees for a node and descendants

```http
GET /api/users/node/<node ObjectId>/employees/descendants
Authorization: Bearer <token>
```

## Tests

Run the Jest test suite:

```bash
npm test
```

Tests use `TEST_MONGODB_URI`. The setup clears the users and nodes in that
database before creating test fixtures, then removes them when the suite
finishes. Keep it separate from any database with data you need to preserve.
