# Hono Web Framework

Hono is the standard web framework for Deno projects. It's fast, lightweight,
and designed to work seamlessly with Deno's runtime and Web Standard APIs.

## Why Hono for Deno

- **Web Standard APIs**: Built on Web Standard Request/Response objects
- **Fast**: Optimized for performance with minimal overhead
- **TypeScript-first**: Excellent TypeScript support with type inference
- **Middleware support**: Rich ecosystem of middleware
- **JSR compatible**: Available via JSR for Deno projects
- **Edge-ready**: Works on Deno Deploy and other edge runtimes

## Installation

Add Hono to your `deno.jsonc` imports:

```jsonc
{
    "imports": {
        "@hono/hono": "jsr:@hono/hono@^4.6.14"
    }
}
```

## Basic Setup

```ts
import { Hono } from "@hono/hono";

const app = new Hono();

app.get("/", (c) => {
    return c.text("Hello Hono!");
});

// Use with Deno.serve
const server = Deno.serve({ port: 8000 }, app.fetch);
```

## Routing

Hono supports RESTful routing patterns:

```ts
const app = new Hono();

// GET request
app.get("/users", async (c) => {
    const users = await getUsers();
    return c.json(users);
});

// POST request
app.post("/users", async (c) => {
    const body = await c.req.json();
    const user = await createUser(body);
    return c.json(user, 201);
});

// Path parameters
app.get("/users/:id", async (c) => {
    const id = c.req.param("id");
    const user = await getUser(id);
    return c.json(user);
});

// Query parameters
app.get("/users", async (c) => {
    const page = c.req.query("page");
    const limit = c.req.query("limit");
    const users = await getUsers({ page, limit });
    return c.json(users);
});

// Multiple path parameters
app.get("/users/:userId/posts/:postId", async (c) => {
    const userId = c.req.param("userId");
    const postId = c.req.param("postId");
    const post = await getPost(userId, postId);
    return c.json(post);
});
```

## Context Object

The context object (`c`) provides access to request/response and utilities:

```ts
app.get("/example", async (c) => {
    // Request information
    const method = c.req.method;
    const url = c.req.url;
    const headers = c.req.header();
    const query = c.req.query();
    const param = c.req.param("id");

    // Request body
    const json = await c.req.json();
    const text = await c.req.text();
    const formData = await c.req.formData();

    // Response helpers
    return c.json({ data: "value" }); // JSON response
    return c.text("Hello"); // Text response
    return c.html("<h1>Hello</h1>"); // HTML response
    return c.redirect("/other-path"); // Redirect
    return c.status(201).json({ id: 1 }); // Custom status

    // Headers
    c.header("X-Custom", "value");
    const customHeader = c.req.header("X-Custom");
});
```

## Middleware

Hono has excellent middleware support:

```ts
import { cors } from "@hono/hono/cors";
import { logger } from "@hono/hono/logger";
import { createMiddleware } from "@hono/hono/factory";

// Built-in middleware
app.use("*", cors());
app.use("*", logger());

// Custom middleware
const customMiddleware = createMiddleware(async (c, next) => {
    // Before handler
    const start = performance.now();

    await next();

    // After handler
    const ms = performance.now() - start;
    c.header("X-Response-Time", `${ms}ms`);
});

app.use("*", customMiddleware);
```

## Typed Context Variables

Use TypeScript to type context variables for type-safe middleware:

```ts
type Variables = {
    userId: string;
    userRole: string;
};

const app = new Hono<{ Variables: Variables }>();

// Middleware that sets variables
app.use("*", async (c, next) => {
    const userId = extractUserId(c.req);
    c.set("userId", userId);
    c.set("userRole", "admin");
    await next();
});

// Access typed variables
app.get("/profile", async (c) => {
    const userId = c.get("userId"); // TypeScript knows this is string
    const userRole = c.get("userRole"); // TypeScript knows this is string
    return c.json({ userId, userRole });
});
```

## Route Mounting

Mount sub-applications for modular organization:

```ts
// features/users/users.ts
const usersApp = new Hono();
usersApp.get("/", getUsers);
usersApp.get("/:id", getUser);
usersApp.post("/", createUser);

export default usersApp;

// main.ts
import usersApp from "./features/users/users.ts";

const app = new Hono();
app.route("/users", usersApp);
```

## Error Handling

Handle errors globally or per route:

```ts
import { HTTPException } from "@hono/hono/http-exception";

// Global error handler
app.onError((err, c) => {
    if (err instanceof HTTPException) {
        return err.getResponse();
    }

    console.error(err);
    return c.json(
        { error: { message: err.message } },
        500,
    );
});

// Route-level error handling
app.get("/users/:id", async (c) => {
    try {
        const user = await getUser(c.req.param("id"));
        if (!user) {
            throw new HTTPException(404, { message: "User not found" });
        }
        return c.json(user);
    } catch (error) {
        // Handle error
        throw error;
    }
});
```

## Validation

Use validators for request validation:

```ts
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const createUserSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    age: z.number().int().positive(),
});

app.post(
    "/users",
    zValidator("json", createUserSchema),
    async (c) => {
        const data = c.req.valid("json"); // Type-safe validated data
        const user = await createUser(data);
        return c.json(user, 201);
    },
);
```

## Authentication Middleware

```ts
import { bearerAuth } from "@hono/hono/bearer-auth";

// Simple bearer token auth
app.use(
    "/api/*",
    bearerAuth({ token: "secret-token" }),
);

// Custom auth middleware
app.use("/api/*", async (c, next) => {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");

    if (!token || !isValidToken(token)) {
        return c.json({ error: "Unauthorized" }, 401);
    }

    const user = await getUserFromToken(token);
    c.set("user", user);
    await next();
});
```

## Testing Hono Applications

Test Hono apps using the request API:

```ts
import { describe, expect, it } from "@std/testing/bdd";
import { mainApp } from "../main.ts";

describe("API Routes", () => {
    it("GET / returns hello message", async () => {
        const response = mainApp.request("/");
        const result = await response;

        expect(result.status).toBe(200);
        const json = await result.json();
        expect(json.msg).toContain("Hello");
    });

    it("POST /users creates a user", async () => {
        const response = mainApp.request("/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "John", email: "john@example.com" }),
        });

        const result = await response;
        expect(result.status).toBe(201);
        const user = await result.json();
        expect(user.name).toBe("John");
    });
});
```

## Best Practices

1. **Use typed context variables** for type-safe middleware data
2. **Mount sub-applications** for feature-based organization
3. **Use global error handlers** for consistent error responses
4. **Validate requests** with validators before processing
5. **Export apps as default** for easy mounting in main app
6. **Use middleware** for cross-cutting concerns (logging, auth, etc.)
7. **Leverage Web Standard APIs** - Hono works with standard Request/Response
8. **Test with `.request()`** method for integration testing
9. **Use `c.json()`** for JSON responses (automatically sets content-type)
10. **Handle errors properly** - use HTTPException for HTTP errors

## Common Middleware Patterns

```ts
// Logging middleware
app.use("*", async (c, next) => {
    console.log(`${c.req.method} ${c.req.path}`);
    await next();
});

// Timing middleware
app.use("*", async (c, next) => {
    const start = performance.now();
    await next();
    const ms = performance.now() - start;
    c.header("X-Response-Time", `${ms}ms`);
});

// CORS middleware (or use built-in)
app.use("*", async (c, next) => {
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    await next();
});
```
