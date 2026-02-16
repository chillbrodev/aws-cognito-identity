# Testing

## Test Runner

Deno includes a built-in test runner with BDD support:

```ts
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";
import { Stub, stub } from "@std/testing/mock";

describe("Feature", () => {
    it("should work correctly", () => {
        expect(true).toBe(true);
    });
});
```

## Test File Organization

- Tests are typically located in `test/` directories or alongside source files
- Test files follow naming: `*.test.ts` or `*.spec.ts`
- Use BDD style with `describe`, `it`, and `expect` syntax

## Stubbing and Mocking

Deno provides `stub` and `spy` utilities from `@std/testing/mock`:

```ts
import { Stub, stub } from "@std/testing/mock";

// Use 'using' keyword for automatic cleanup (preferred)
using mockStub = stub(
    ClassName.prototype,
    "methodName",
    () => returnValue,
);

// Or use beforeEach/afterEach for shared stubs
let mockStub: Stub<ClassName>;

beforeEach(() => {
    mockStub = stub(ClassName.prototype, "methodName", () => returnValue);
});

afterEach(() => {
    mockStub.restore();
});
```

**Important**: Prefer `using` keyword for automatic cleanup when stubs are
test-specific. Use `beforeEach`/`afterEach` when stubs are shared across
multiple tests in the same describe block.

## Environment Variables

Environment variables can be loaded using `@std/dotenv`:

```ts
import "@std/dotenv/load"; // Loads .env file automatically
```

Access via `Deno.env.get()`:

```ts
const apiKey = Deno.env.get("API_KEY");
if (!apiKey) {
    throw new Error("API_KEY is required");
}
```
