# Testing Types

## Stub Types

```ts
// Simplified stub type (preferred)
let mockStub: Stub<Repository>;

// Avoid overly complex generic parameters
// Testing frameworks typically infer types automatically
```

## Mock Object Types

```ts
// Create comprehensive mocks with type assertions
const mockDependency = {
    requiredMethod: () => ({}),
    anotherMethod: () => Promise.resolve(""),
} as unknown as DependencyClass;

// Use in constructors
const service = new ServiceClass(mockDependency);
```

## Test Function Types

```ts
describe("ServiceClass", () => {
    let service: ServiceClass;

    beforeEach(() => {
        service = new ServiceClass(mockDependency);
    });

    it("performs expected behavior", async () => {
        // Test implementation
    });
});
```
