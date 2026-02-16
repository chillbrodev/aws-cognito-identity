# Type Narrowing

## Control Flow Narrowing

```ts
function processValue(value: string | null | undefined): string {
    if (!value) {
        throw new Error("Value is required");
    }
    // TypeScript knows value is string here
    return value.toUpperCase();
}
```

## Discriminated Unions

```ts
type Result<T> =
    | { success: true; data: T }
    | { success: false; error: string };

function handleResult<T>(result: Result<T>): T {
    if (result.success) {
        return result.data; // TypeScript knows data exists
    }
    throw new Error(result.error); // TypeScript knows error exists
}
```

## Assertion Functions

```ts
function assertIsString(value: unknown): asserts value is string {
    if (typeof value !== "string") {
        throw new Error("Expected string");
    }
}

// Usage
const value: unknown = getValue();
assertIsString(value);
// TypeScript knows value is string here
console.log(value.toUpperCase());
```
