# Zod Schema Validation

Zod is a TypeScript-first schema validation library that provides runtime type
checking and type inference. It's the standard choice for TypeScript projects.

## Why Zod

- **TypeScript-first**: Seamless integration with TypeScript types
- **Type inference**: Automatically generates TypeScript types from schemas
- **Runtime validation**: Validates data at runtime, not just compile time
- **Composable**: Build complex schemas from simple primitives
- **Error handling**: Detailed error messages for validation failures

## Installation

Add Zod to your project:

```ts
// deno.jsonc
{
  "imports": {
    "@zod/zod": "jsr:@zod/zod@^4.3.4"
  }
}

// Or with Hono validator
{
  "imports": {
    "@hono/zod-validator": "jsr:@hono/zod-validator@^0.7.2"
  }
}
```

## Basic Schema Definition

```ts
import { z } from "@zod/zod";

// Simple object schema
export const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    age: z.number().int().positive(),
});

// Infer TypeScript type from schema
export type User = z.infer<typeof UserSchema>;
```

## Primitive Types

```ts
// String validations
z.string(); // Any string
z.string().min(1); // Non-empty string
z.string().max(100); // Max length
z.string().email(); // Valid email
z.string().url(); // Valid URL
z.string().uuid(); // Valid UUID
z.string().regex(/^[A-Z]+$/); // Regex pattern

// Number validations
z.number(); // Any number
z.number().int(); // Integer
z.number().positive(); // Positive number
z.number().min(0); // Minimum value
z.number().max(100); // Maximum value

// Boolean
z.boolean();

// Date
z.date();

// Optional and nullable
z.string().optional(); // string | undefined
z.string().nullable(); // string | null
z.string().nullish(); // string | null | undefined
```

## Complex Types

```ts
// Arrays
z.array(z.string()); // string[]
z.array(z.string()).min(1); // Non-empty array
z.array(z.string()).max(10); // Max length

// Nested objects
const AddressSchema = z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string(),
});

const UserSchema = z.object({
    name: z.string(),
    address: AddressSchema, // Nested object
    addresses: z.array(AddressSchema), // Array of objects
});

// Enums
z.enum(["draft", "published", "archived"]);
z.enum(["GET", "POST", "PUT", "DELETE"]);

// Unions
z.union([z.string(), z.number()]);
z.string().or(z.number()); // Alternative syntax

// Tuples
z.tuple([z.string(), z.number()]); // [string, number]

// Records
z.record(z.string()); // Record<string, unknown>
z.record(z.string(), z.number()); // Record<string, number>
```

## Parsing and Validation

```ts
import { z } from "@zod/zod";

const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
});

// Parse and throw on error
const user = UserSchema.parse(jsonData); // Throws ZodError if invalid

// Safe parse (returns result object)
const result = UserSchema.safeParse(jsonData);

if (result.success) {
    // TypeScript knows result.data is User
    const user: User = result.data;
    console.log(user.email);
} else {
    // Handle validation errors
    console.error(result.error.issues);
    // Access error details
    result.error.errors.forEach((err) => {
        console.log(`${err.path}: ${err.message}`);
    });
}
```

## Error Handling Pattern

```ts
function parseUserOrThrow(json: unknown, context: string): User {
    const result = UserSchema.safeParse(json);

    if (!result.success) {
        throw new ValidationError(
            "USER_SCHEMA_MISMATCH",
            `Failed to parse user data: ${context}`,
            {
                cause: result.error,
                context: {
                    issues: JSON.stringify(result.error.issues),
                },
            },
        );
    }

    return result.data;
}
```

## Schema Composition

```ts
// Reusable base schemas
const BaseEntitySchema = z.object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

// Extend base schema
const UserSchema = BaseEntitySchema.extend({
    email: z.string().email(),
    name: z.string(),
});

// Merge schemas
const AdminUserSchema = UserSchema.merge(
    z.object({
        role: z.enum(["admin", "super-admin"]),
        permissions: z.array(z.string()),
    }),
);

// Pick/omit fields
const PublicUserSchema = UserSchema.pick({ id: true, name: true });
const PrivateUserSchema = UserSchema.omit({ password: true });
```

## Transformations

```ts
// Transform data during parsing
const StringToNumberSchema = z.string().transform((val) =>
    Number.parseInt(val)
);

// Preprocess before validation
const TrimmedStringSchema = z.preprocess(
    (val) => typeof val === "string" ? val.trim() : val,
    z.string(),
);

// Refine with custom validation
const PasswordSchema = z.string().refine(
    (val) => val.length >= 8,
    { message: "Password must be at least 8 characters" },
);
```

## Integration with Hono

Use `zValidator` middleware for request validation:

```ts
import { zValidator } from "@hono/zod-validator";
import { z } from "@zod/zod";

const CreateUserSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    age: z.number().int().positive().optional(),
});

app.post(
    "/users",
    zValidator("json", CreateUserSchema),
    async (c) => {
        // Type-safe validated data
        const data = c.req.valid("json");
        // TypeScript knows data matches CreateUserSchema
        const user = await createUser(data);
        return c.json(user, 201);
    },
);

// Query parameter validation
const QuerySchema = z.object({
    page: z.string().transform(Number).pipe(z.number().int().positive()),
    limit: z.string().transform(Number).pipe(z.number().int().positive()),
});

app.get(
    "/users",
    zValidator("query", QuerySchema),
    async (c) => {
        const { page, limit } = c.req.valid("query");
        // TypeScript knows page and limit are numbers
        const users = getUsers({ page, limit });
        return c.json(users);
    },
);
```

## Validating API Responses

```ts
// Define schema for external API response
const ApiResponseSchema = z.object({
    data: z.array(UserSchema),
    meta: z.object({
        total: z.number(),
        page: z.number(),
    }),
});

// Parse and validate external API response
async function fetchUsers(): Promise<User[]> {
    const response = await fetch("https://api.example.com/users");
    const json = await response.json();

    const result = ApiResponseSchema.safeParse(json);

    if (!result.success) {
        throw new ApiError(
            "INVALID_API_RESPONSE",
            "Failed to parse API response",
            { cause: result.error },
        );
    }

    return result.data.data;
}
```

## Advanced Patterns

```ts
// Discriminated unions
const EventSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("user.created"),
        userId: z.string(),
        timestamp: z.number(),
    }),
    z.object({
        type: z.literal("user.updated"),
        userId: z.string(),
        changes: z.record(z.unknown()),
    }),
]);

// Lazy schemas for recursive types
type TreeNode = {
    value: number;
    children?: TreeNode[];
};

const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
    z.object({
        value: z.number(),
        children: z.array(TreeNodeSchema).optional(),
    })
);

// Custom validation with context
const PasswordSchema = z.string().refine(
    (val) => val.length >= 8,
    { message: "Password must be at least 8 characters" },
).refine(
    (val) => /[A-Z]/.test(val),
    { message: "Password must contain an uppercase letter" },
);
```

## Best Practices

1. **Export schemas and types together** - Keep schema and inferred type
   together
2. **Use `safeParse()` for error handling** - Don't use `parse()` unless you
   want exceptions
3. **Compose schemas** - Build complex schemas from simple, reusable ones
4. **Validate external data** - Always validate data from APIs, user input, etc.
5. **Use type inference** - Let TypeScript infer types from schemas with
   `z.infer<>`
6. **Provide meaningful error messages** - Use custom error messages for better
   UX
7. **Validate at boundaries** - Validate data when it enters your system
8. **Use Hono validators** - Leverage `zValidator` middleware for request
   validation
9. **Group related schemas** - Keep schemas in dedicated files (e.g.,
   `*.schemas.ts`)
10. **Document complex schemas** - Add comments for non-obvious validation logic

## Common Patterns

```ts
// Schema with optional fields
const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    phoneNumber: z.string().optional(),
    avatarUrl: z.string().url().optional(),
});

// Schema with default values
const ConfigSchema = z.object({
    port: z.number().default(3000),
    host: z.string().default("localhost"),
    timeout: z.number().default(5000),
});

// Schema with conditional validation
const UserSchema = z.object({
    role: z.enum(["user", "admin"]),
    permissions: z.array(z.string()).optional(),
}).refine(
    (data) => data.role !== "admin" || (data.permissions?.length ?? 0) > 0,
    { message: "Admin users must have at least one permission" },
);
```
