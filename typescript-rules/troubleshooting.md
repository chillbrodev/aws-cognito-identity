# Troubleshooting Type Errors

## Common Type Errors

### "Property does not exist on type"

- Check that the property is defined in the interface/type
- Verify you're accessing the correct type (not a union where the property
  doesn't exist on all variants)
- Use type guards to narrow the type
- Check for typos in property names

### "Type 'X' is not assignable to type 'Y'"

- Check that all required properties are present
- Verify property types match exactly
- Use type assertions only when you're certain the types are compatible
- Consider using type guards or discriminated unions

### "Cannot find name 'X'"

- Ensure the type/interface is imported
- Check for typos in type names
- Verify the export exists in the source file
- Check if it's a type-only import that needs `import type`

## Generic Type Constraints

```ts
// Constrain generic types when needed
function processData<T extends { id: string }>(data: T): T {
    // TypeScript knows T has an 'id' property
    return data;
}

// Multiple constraints
function process<T extends string | number>(value: T): T {
    return value;
}
```

## Index Signature Issues

```ts
// Use index signatures for dynamic properties
interface Config {
    [key: string]: string | number;
}

// Or use Record utility type
type Config = Record<string, string | number>;
```
