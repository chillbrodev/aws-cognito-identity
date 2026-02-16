# TypeScript Best Practices and Context

This file provides TypeScript-specific guidance for AI AGENTS when working with
TypeScript projects.

## TypeScript Configuration

TypeScript provides strong typing and compile-time error checking. Key
principles:

- **Strict Mode**: Enable strict type checking for better type safety
- **Type Inference**: Leverage TypeScript's ability to infer types when obvious
- **Gradual Typing**: TypeScript allows gradual adoption of types

## Documentation Structure

This documentation has been organized into focused files for easier navigation and maintenance. See the [README.md](./README.md) for a complete overview.

### Core Concepts

- **[type-system.md](./type-system.md)** - Interfaces, type aliases, generics, type guards, and utility types
- **[type-safety.md](./type-safety.md)** - Avoiding `any`, type assertions, and the `satisfies` operator
- **[type-narrowing.md](./type-narrowing.md)** - Type narrowing patterns and discriminated unions
- **[common-patterns.md](./common-patterns.md)** - Common type patterns, const assertions, and template literals

### Code Organization

- **[classes.md](./classes.md)** - Class patterns, base classes, and method signatures
- **[functions.md](./functions.md)** - Function types and higher-order functions
- **[imports-exports.md](./imports-exports.md)** - Import/export patterns and type-only imports

### Specialized Topics

- **[errors.md](./errors.md)** - Error handling types and custom error classes
- **[testing.md](./testing.md)** - Testing types, stubs, and mocks
- **[zod-validation.md](./zod-validation.md)** - Zod schema validation patterns and best practices

### Reference

- **[troubleshooting.md](./troubleshooting.md)** - Common type errors and how to resolve them
- **[README.md](./README.md)** - Complete documentation index and best practices summary
