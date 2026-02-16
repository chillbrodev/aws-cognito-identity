# Common Type Patterns

## Optional Properties

```ts
// Prefer explicit undefined over optional when distinction matters
interface User {
    firstName: string | undefined; // Explicitly can be undefined
    lastName?: string; // Optional (may not exist)
}
```

## Readonly Properties

```ts
interface Config {
    readonly apiKey: string; // Cannot be reassigned after initialization
    readonly baseUrl: string;
}
```

## Const Assertions

```ts
// Preserve literal types
const statuses = ["draft", "published"] as const;
type Status = typeof statuses[number]; // 'draft' | 'published'

// Object const assertion
const config = {
    apiKey: "key",
    timeout: 5000,
} as const;
```

## Template Literal Types

```ts
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type ApiEndpoint = `/api/${string}`;
type Route = `${HttpMethod} ${ApiEndpoint}`;
// Result: 'GET /api/users' | 'POST /api/users' | etc.
```

## Mapped Types

```ts
// Make all properties optional
type Partial<T> = {
    [P in keyof T]?: T[P];
};

// Make all properties readonly
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
};
```

## Database Type Patterns

### ORM Type Patterns

When working with databases, consider naming conventions:

```ts
// Database returns snake_case
const dbRow = { user_id: "123", is_deleted: false };

// Application uses camelCase interface
interface User {
    userId: string;
    isDeleted: boolean;
}

// Transform function
function transformDbRow(row: DbUserRow): User {
    return {
        userId: row.user_id,
        isDeleted: row.is_deleted,
    };
}
```
