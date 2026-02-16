# TypeScript Rules

This directory contains TypeScript-specific guidance for AI AGENTS when working with TypeScript projects.

## Overview

TypeScript provides strong typing and compile-time error checking. Key principles:

- **Strict Mode**: Enable strict type checking for better type safety
- **Type Inference**: Leverage TypeScript's ability to infer types when obvious
- **Gradual Typing**: TypeScript allows gradual adoption of types

## Documentation Structure

This documentation is organized into focused files for easier navigation and maintenance:

- **[type-system.md](./type-system.md)** - Interfaces, type aliases, generics, type guards, and utility types
- **[type-safety.md](./type-safety.md)** - Avoiding `any`, type assertions, and the `satisfies` operator
- **[classes.md](./classes.md)** - Class patterns, base classes, and method signatures
- **[functions.md](./functions.md)** - Function types and higher-order functions
- **[errors.md](./errors.md)** - Error handling types and custom error classes
- **[testing.md](./testing.md)** - Testing types, stubs, and mocks
- **[imports-exports.md](./imports-exports.md)** - Import/export patterns and type-only imports
- **[zod-validation.md](./zod-validation.md)** - Zod schema validation patterns and best practices
- **[type-narrowing.md](./type-narrowing.md)** - Type narrowing patterns and discriminated unions
- **[common-patterns.md](./common-patterns.md)** - Common type patterns, const assertions, and template literals
- **[troubleshooting.md](./troubleshooting.md)** - Common type errors and how to resolve them

## Best Practices Summary

1. **Always type function parameters and return types** - explicit types improve code clarity
2. **Use interfaces for object shapes, types for unions/intersections**
3. **Prefer type guards over type assertions** - safer and more maintainable
4. **Avoid `any`** - use `unknown` and narrow with type guards
5. **Use `readonly` for immutable properties**
6. **Use `override` keyword** when overriding base class members
7. **Export types/interfaces** that are used across modules
8. **Group related types** in dedicated files (e.g., `.interfaces.ts`)
9. **Use generic types** for reusable utilities
10. **Leverage TypeScript's type inference** when types are obvious
11. **Use `satisfies`** to ensure type safety while preserving literal types
12. **Use utility types** (`NonNullable<T>`, `Pick<T, K>`, etc.) when appropriate
13. **Document complex type relationships** with comments
14. **Use type-only imports** (`import type`) for types not used at runtime
15. **Prefer composition over inheritance** when possible
16. **Use const assertions** to preserve literal types

## Type Checking

Type checking is typically done by:

- IDE/editor integration (real-time checking)
- Build tools (TypeScript compiler)
- CI/CD pipelines

```bash
# TypeScript compiler
tsc --noEmit

# Or with build tools
npm run type-check
```
