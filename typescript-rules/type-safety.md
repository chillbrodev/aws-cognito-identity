# Type Safety Patterns

## Avoid `any`

**Never use `any` unless absolutely necessary**. Prefer `unknown` and narrow
with type guards:

```ts
// Bad
function process(data: any) {
    return data.value;
}

// Good
function process(data: unknown) {
    if (typeof data === "object" && data !== null && "value" in data) {
        return (data as { value: unknown }).value;
    }
    throw new Error("Invalid data");
}
```

If you must use `any`, document why:

```ts
// This function handles dynamic schemas that cannot be typed statically
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertSchema(schema: any): string {
    // Conversion logic
}
```

## Type Assertions

Use type assertions sparingly and prefer type guards:

```ts
// Prefer type guards
if (isError(err)) {
    // TypeScript knows err is Error here
    console.log(err.message);
}

// When necessary, use 'as unknown as' for complex assertions
const mock = {
    method: () => ({}),
    anotherMethod: () => Promise.resolve(""),
} as unknown as ServiceClass;
```

## `satisfies` Operator

Use `satisfies` to ensure type safety while preserving literal types:

```ts
const config = {
    apiKey: "key",
    timeout: 5000,
    retries: 3,
} satisfies Config;

// TypeScript ensures config matches Config interface
// but preserves literal types (5000 is number, not just number)
```
