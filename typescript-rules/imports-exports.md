# Import/Export Patterns

## Named Exports

```ts
// Export interfaces
export interface User {
    id: string;
}

// Export types
export type UserId = string;

// Export classes
export class UserService {
    // Implementation
}

// Export functions
export function processUser(user: User): ProcessedUser {
    // Implementation
}

// Export constants
export const DEFAULT_TIMEOUT = 5000;
```

## Default Exports

Use default exports for main module exports (e.g., routers, main classes):

```ts
class Application {
    // Implementation
}

export default Application;
```

## Type-Only Imports

Use `type` keyword for type-only imports to improve tree-shaking:

```ts
import type { User } from "./user.interfaces.ts";
import type { ErrorOptions } from "../errors/base-error.ts";

// Runtime import
import { processUser } from "./user.service.ts";
```

## Re-exports

```ts
// Re-export for convenience
export { User, UserId } from "./user.interfaces.ts";
export { UserService } from "./user.service.ts";
```
