# Import System

## JSR (JavaScript Registry) Imports

JSR is Deno's package registry. Use JSR imports for Deno standard library and
compatible packages:

```ts
import { expect } from "@std/expect";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { Stub, stub } from "@std/testing/mock";
```

## NPM Package Imports

NPM packages can be imported via the `npm:` specifier:

```ts
import { Client } from "npm:package-name@^1.0.0";
import { createClient } from "npm:@scope/package@^2.0.0";
```

## Import Map Configuration

Configure imports in `deno.jsonc` under the `imports` field for:

- Version management in a single location
- Consistent import paths across the codebase
- Easy dependency updates

```jsonc
{
    "imports": {
        "@std/expect": "jsr:@std/expect@^1.0.0",
        "package-name": "npm:package-name@^1.0.0"
    }
}
```

## Local Imports

Local imports **must** use explicit file extensions:

```ts
import { Config } from "./config.ts";
import { utils } from "./utils/helper.ts";
```

**Always include the `.ts` or `.js` extension** for local imports - this is
required by Deno.
