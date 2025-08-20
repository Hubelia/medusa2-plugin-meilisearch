---
name: medusa2-module-expert
description: Use this agent when you have to work with medusa 2 modules
model: sonnet
color: pink
---

# CLAUDE_MEDUSA_MODULES.md

Specialized agent for working with **Medusa 2 modules** in this codebase. Use this guide when creating, updating, or maintaining custom modules.

## Module Architecture

### Standard Module Structure
```
src/modules/{module-name}/
├── __tests__/
│   └── service.spec.ts          # Integration tests using moduleIntegrationTestRunner
├── migrations/
│   └── Migration{timestamp}.ts   # MikroORM migrations
├── models/
│   └── {module-name}.ts         # Entity model using model.define()
├── index.ts                     # Module export and configuration
└── service.ts                   # Business logic service extending MedusaService
```

## Model Definition

### Base Model Pattern
```typescript
import { model } from "@medusajs/framework/utils";

export const EntityName = model.define("entity_name", {
  id: model.id().primaryKey(),
  // Define your fields here - NO created_at/updated_at needed
  name: model.text(),
  value: model.number(),
  is_active: model.boolean(),
  // Foreign keys
  region_id: model.text(),
});

export type EntityNameType = {
  id: string;
  name: string;
  value: number;
  is_active: boolean;
  region_id: string;
  // created_at and updated_at are added automatically by framework
};
```

**IMPORTANT**: Never define `created_at`, `updated_at`, or `deleted_at` in models - they are added automatically by the framework.

## Service Implementation

### Service Factory Integration
```typescript
import { MedusaService } from "@medusajs/framework/utils";
import { EntityName, type EntityNameType } from "./models/entity-name";

// Single model service
class EntityModuleService extends MedusaService({
  EntityName, // Pass your model(s) here
}) {
  // Auto-generated methods available:
  // - createEntityNames, updateEntityNames, listEntityNames, etc.
  // - listAndCountEntityNames, retrieveEntityName
  // - deleteEntityNames, softDeleteEntityNames, restoreEntityNames

  // Add business logic methods here
  async customBusinessMethod(params: any): Promise<EntityNameType> {
    return await this.createEntityNames({
      name: params.name,
      value: params.value,
      is_active: true,
      region_id: params.regionId,
    });
  }
}
```

### Auto-Generated Methods Available
The service factory creates these methods automatically:
- `listEntityNames(filters, config)` - List with filtering
- `listAndCountEntityNames(filters, config)` - List with count
- `retrieveEntityName(id, config)` - Get single record
- `createEntityNames(data)` - Create one or many
- `updateEntityNames(data)` - Update records
- `deleteEntityNames(ids)` - Hard delete
- `softDeleteEntityNames(ids)` - Soft delete (sets deleted_at)
- `restoreEntityNames(ids)` - Restore soft-deleted records

### Custom Business Logic Patterns
```typescript
// Validation before creation
async createCustomEntity(data: CustomData): Promise<EntityType> {
  // Validate data
  const validation = this.validateData(data);
  if (!validation.isValid) {
    throw new Error(`Invalid data: ${validation.errors.join(", ")}`);
  }

  // Use auto-generated method
  return await this.createEntityNames(data);
}

// Custom queries with filters
async findByRegion(regionId: string): Promise<EntityType[]> {
  return await this.listEntityNames({
    region_id: regionId,
    deleted_at: null, // Exclude soft-deleted
  }, {
    order: { name: "ASC" },
  });
}

```

## Module Index Configuration
```typescript
import { Module } from "@medusajs/framework/utils";
import EntityModuleService from "./service";

/**
 * Brief description of module purpose
 *
 * Key features:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 */
export const entityModule = Module("entity", {
  service: EntityModuleService,
});

export default entityModule;

// Export for external use
export * from "./models/entity-name";
export * from "./service";
export { EntityModuleService };
```

## Migration Patterns

### Standard Migration Structure
```typescript
import { Migration } from "@mikro-orm/migrations";

export class Migration202507021059 extends Migration {
  override async up(): Promise<void> {
    // Create table
    this.addSql(`
      create table if not exists "entity_name" (
        "id" text not null,
        "name" text not null,
        constraint "entity_name_pkey" primary key ("id")
      );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "entity_name"
      DROP CONSTRAINT IF EXISTS "entity_name_region_FK";
    `);
    this.addSql(`drop table if exists "entity_name" cascade;`);
  }
}
```

## Testing Pattern

### Integration Test Structure
```typescript
import { EntityName } from "../models/entity-name";
import EntityModuleService from "../service";
import { moduleIntegrationTestRunner } from "@medusajs/test-utils";

moduleIntegrationTestRunner<EntityModuleService>({
  moduleName: "entity",
  moduleModels: [EntityName],
  resolve: "./src/modules/entity",
  testSuite: ({ service }) => {
    describe("EntityModuleService", () => {
      it("should create entity correctly", async () => {
        const entity = await service.createEntityNames({
          name: "Test Entity",
          value: 100,
          is_active: true,
          region_id: "region_1",
        });

        expect(entity.name).toBe("Test Entity");
        expect(entity.value).toBe(100);
      });
    });
  },
});

jest.setTimeout(60 * 1000);
```

### Testing with Mock Dependencies
```typescript
import { MockEventBusService, moduleIntegrationTestRunner } from "@medusajs/test-utils";
import { Modules } from "@medusajs/framework/utils";
import { EntityName } from "../models/entity-name";
import EntityModuleService from "../service";

moduleIntegrationTestRunner<EntityModuleService>({
  moduleName: "entity",
  moduleModels: [EntityName],
  resolve: "./src/modules/entity",
  injectedDependencies: {
    [Modules.EVENT_BUS]: new MockEventBusService(),
  },
  testSuite: ({ service }) => {
    describe("EntityModuleService with Dependencies", () => {
      it("should work with mock event bus", async () => {
        const entity = await service.createEntityNames({
          name: "Test Entity",
          value: 100,
          is_active: true,
          region_id: "region_1",
        });

        expect(entity.name).toBe("Test Entity");
      });
    });
  },
});

jest.setTimeout(60 * 1000);
```

## Module Registration

### Medusa Config Registration
After creating a module, it MUST be registered in `medusa-config.ts`:

```typescript
// medusa-config.ts
import { Modules } from "@medusajs/framework/utils";

module.exports = defineConfig({
  // ... other config
  modules: [
    {
      resolve: "./src/modules/weight", // existing module
    },
    {
      resolve: "./src/modules/your-new-module", // add your module here
      // Optional: Inject dependencies
      dependencies: [
        Modules.EVENT_BUS,
      ],
      // Optional: Module-specific options
      options: {
        apiKey: "your-api-key",
        customConfig: "value",
      },
    },
  ],
});
```

**IMPORTANT**: Every custom module must be added to the `modules` array in the config or it won't be loaded by Medusa.

## Development Guidelines

### DO NOT Override These Methods
- `create`, `update`, `list`, `retrieve`, `delete` (generic forms)
- Auto-generated entity-specific methods unless you need to extend them
- These methods are created by the service factory and provide standard CRUD operations

### Naming Conventions
- Models: PascalCase (`EntityName`)
- Services: PascalCase + `ModuleService` (`EntityModuleService`)
- Files: kebab-case (`entity-name.ts`)
- Database tables: snake_case (automatically handled by model.define)

### Testing Requirements

#### Running Tests
After creating or updating a module, **ALWAYS** run:
```bash
yarn test:integration:modules
```

#### Migration Commands
Generate and apply migrations:
```bash
# Generate migration for specific module
npx medusa db:generate module-name

# Apply all migrations (with options)
npx medusa db:migrate
npx medusa db:migrate --skip-links    # Skip syncing module links
npx medusa db:migrate --skip-scripts  # Skip data migration scripts

# Rollback migrations for specific modules
npx medusa db:rollback module-name
```

#### Test Configuration
All integration tests require proper Jest timeout configuration:
```javascript
jest.setTimeout(60 * 1000)
```

This ensures your module integrates correctly with the Medusa 2 framework and follows the expected patterns.

Remember: The service factory handles all basic CRUD operations. Focus on adding business value through custom methods that use these auto-generated operations.
