---
name: medusa2-api-routes-expert
description: Use this agent for tasks involving Medusa 2 API route development, modification, and troubleshooting.
model: sonnet
color: cyan
---

## Core Patterns

### File Structure
- API routes located in `src/api/` directory
- Files must be named `route.ts` or `route.js`
- Path parameters use bracket notation: `[id]`, `[slug]`
- Middlewares defined in `src/api/middlewares.ts`

### HTTP Method Handlers
```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.json({ message: "Success" })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  res.status(201).json({ created: true })
}
```

### Request Parameters
- Path parameters: `req.params.id`
- Query parameters: `req.query.search`
- Body parameters: `req.body.name`
- Uploaded files: `req.files` (with multer middleware)

### Validation with Zod
```typescript
import { validateAndTransformBody, validateAndTransformQuery } from "@medusajs/framework/http"
import { z } from "zod"

const schema = z.object({
  name: z.string(),
  price: z.number()
})

export const POST = validateAndTransformBody(schema, async (req, res) => {
  const { name, price } = req.validatedBody
  // Implementation
})
```

### Using a module service
To get a module service, use req.scope.resolve('module-identifier')
For example, for a banner module with the identifier 'banner', use req.scope.resolve('banner')

### Authentication
Routes starting with /admin are already authenticated by default. Do not add an additional authenticate middleware.

### Error Handling
```typescript
import { MedusaError } from "@medusajs/framework/utils"

export const GET = async (req, res) => {
  if (!req.query.required) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Required parameter missing"
    )
  }
}
```

### Middleware Configuration
```typescript
import { defineMiddlewares } from "@medusajs/framework/http"
import cors from "cors"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/custom/*",
      middlewares: [
        (req, res, next) => {
          // Custom logic
          next()
        }
      ]
    },
    {
      method: "POST",
      matcher: "/admin/products",
      middlewares: [authenticate("admin", ["bearer"])],
      additionalDataValidator: {
        brand: z.string().optional()
      }
    }
  ]
})
```

### CORS Configuration
```typescript
// Disable CORS for specific route
export const CORS = false

// Global CORS in middlewares.ts
import { parseCorsOrigins } from "@medusajs/framework/utils"

const cors = cors({
  origin: parseCorsOrigins(process.env.STORE_CORS || "")
})
```

### Body Parsing Configuration
```typescript
export default defineMiddlewares({
  routes: [
    {
      matcher: "/webhook/*",
      bodyParser: {
        preserveRawBody: true,
        sizeLimit: "2mb"
      }
    }
  ]
})
```

### File Uploads
```typescript
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const fileModuleService = req.scope.resolve(Modules.FILE)
  const files = req.files as Express.Multer.File[]

  // Create files directly
  const uploadedFiles = await fileModuleService.createFiles(
    files.map((f) => ({
      filename: f.originalname,
      mimeType: f.mimetype,
      content: f.buffer.toString("binary"),
    }))
  )

  // Get presigned upload URLs for client-side upload
  const uploadUrls = await fileModuleService.getUploadFileUrls(
    files.map((f) => ({
      filename: f.originalname,
      mimeType: f.mimetype,
    }))
  )

  res.json({ files: uploadedFiles, uploadUrls })
}
```

### Additional Data for Workflows
```typescript
// In route handler
export const POST = async (req, res) => {
  await createProductsWorkflow(req.scope).run({
    input: {
      products: productData,
      additional_data: { brand: "CustomBrand" }
    }
  })
}

// In workflow hook
createProductsWorkflow.hooks.productsCreated(
  async ({ products, additional_data }, { container }) => {
    if (additional_data?.brand) {
      // Process additional data
    }
  }
)
```

### Custom Links Retrieval
```typescript
// Allow custom fields in restricted routes
export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/customers/me",
      middlewares: [
        (req, res, next) => {
          (req.allowed ??= []).push("custom_field")
          next()
        }
      ]
    }
  ]
})

// Usage: GET /store/customers/me?fields=*custom_field
```

## Best Practices

### Route Organization
- Group related routes in nested directories
- Use descriptive path names matching business logic
- Keep route handlers focused and delegate to services

### Customization Strategy
- **Avoid overriding core routes directly**
- Use additional data, workflow hooks, and middleware
- When necessary, replicate routes with modifications
- Place custom routes in logical namespaces (e.g., `/vendor/`, `/custom/`)

### Type Safety
```typescript
interface CustomRequest extends MedusaRequest {
  validatedBody: {
    name: string
    price: number
  }
}
```

### Response Patterns
```typescript
// Standard success
res.json({ product, message: "Created successfully" })

// Paginated responses
res.json({
  products,
  count: total,
  offset: req.query.offset || 0,
  limit: req.query.limit || 20
})

// Error responses (handled automatically by MedusaError)
```

### Security Considerations
- Always validate input data with Zod schemas
- Use appropriate authentication for sensitive endpoints
- Configure CORS properly for different environments
- Sanitize file uploads and set size limits
- Never expose sensitive data in error messages

## Common Patterns

### Admin CRUD Operations
- Use `/admin/` prefix for admin routes
- Require admin authentication with API keys
- Follow RESTful conventions (GET, POST, PUT, DELETE)
- Include proper validation and error handling

### Store-facing APIs
- Use `/store/` prefix for customer-facing routes
- **IMPORTANT: All /store routes require a Publishable API Key in tests**
- Public by default, authenticate when needed
- Consider rate limiting for public endpoints
- Return customer-appropriate data only

### Custom Business Logic
- Create dedicated namespaces (e.g., `/api/integrations/`)
- Use middleware for common functionality
- Leverage workflow hooks for complex operations
- Document custom endpoints thoroughly

## Testing API Routes

### Integration Test Setup
```typescript
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("Custom API Routes", () => {
      let container

      beforeAll(() => {
        container = getContainer()
      })

      it("should return correct response", async () => {
        const response = await api.get("/custom/endpoint")
        expect(response.status).toEqual(200)
        expect(response.data).toHaveProperty("message")
      })
    })
  }
})
```

### Test Configuration
```typescript
// jest.config.js
module.exports = {
  testTimeout: 30000, // Increase for database tests
  testEnvironment: "node"
}
```

### Testing Patterns

```typescript
it("should fetch data successfully", async () => {
  const response = await api.get("/admin/products")

  expect(response.status).toEqual(200)
  expect(response.data.products).toBeDefined()
  expect(Array.isArray(response.data.products)).toBe(true)
})
```

### Authentication Testing

#### Admin Route Authentication
```typescript
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import jwt from "jsonwebtoken"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("Custom endpoints", () => {
      describe("GET /admin/custom", () => {
        const headers: Record<string, string> = {}
        
        beforeEach(async () => {
          const container = getContainer()

          const authModuleService = container.resolve("auth")
          const userModuleService = container.resolve("user")

          const user = await userModuleService.createUsers({
            email: "admin@medusa.js",
          })
          const authIdentity = await authModuleService.createAuthIdentities({
            provider_identities: [
              {
                provider: "emailpass",
                entity_id: "admin@medusa.js",
                provider_metadata: {
                  password: "supersecret",
                },
              },
            ],
            app_metadata: {
              user_id: user.id,
            },
          })

          const token = jwt.sign(
            {
              actor_id: user.id,
              actor_type: "user",
              auth_identity_id: authIdentity.id,
            },
            "supersecret",
            {
              expiresIn: "1d",
            }
          )

          headers["authorization"] = `Bearer ${token}`
        })
        
        it("returns correct message", async () => {
          const response = await api.get(
            `/admin/custom`,
            { headers }
          )

          expect(response.status).toEqual(200)
        })
      })
    })
  },
})

jest.setTimeout(60 * 1000)
```

#### Store Route Testing (Publishable API Key Required)
```typescript
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  createApiKeysWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let publishableApiKey: string
    const headers: Record<string, string> = {}

    beforeEach(async () => {
      const container = getContainer()
      const salesChannelModuleService = container.resolve("sales_channel")

      // Create publishable API key for store tests
      try {
        // Create or get default sales channel
        let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
          name: "Default Sales Channel",
        })

        if (!defaultSalesChannel.length) {
          const { result: salesChannelResult } = await createSalesChannelsWorkflow(container).run({
            input: {
              salesChannelsData: [
                {
                  name: "Default Sales Channel",
                },
              ],
            },
          })
          defaultSalesChannel = salesChannelResult
        }

        // Create publishable API key
        const { result: publishableApiKeyResult } = await createApiKeysWorkflow(container).run({
          input: {
            api_keys: [
              {
                title: `Test Publishable API Key ${Date.now()}`,
                type: "publishable",
                created_by: "system",
              },
            ],
          },
        })

        const apiKey = publishableApiKeyResult[0]
        publishableApiKey = apiKey.token

        // Link sales channel to API key
        await linkSalesChannelsToApiKeyWorkflow(container).run({
          input: {
            id: apiKey.id,
            add: [defaultSalesChannel[0].id],
          },
        })

        headers["x-publishable-api-key"] = publishableApiKey
      } catch (error) {
        console.warn("Could not create publishable API key for tests:", error)
      }
    })

    describe("Store endpoints", () => {
      it("should work with publishable API key", async () => {
        const response = await api.get("/store/custom", { headers })
        expect(response.status).toEqual(200)
      })
    })
  },
})
```

### Error Handling Testing
```typescript
it("should handle validation errors", async () => {
  const invalidData = { name: "" } // Missing required fields


  try {
    const response = await api.post("/admin/products", invalidData)
  } catch (error) {
    if (error.constructor.name === "JestAssertionError") {
      throw error;
    }

    expect(error.response.status).toEqual(400)
    expect(error.response.data.message).toContain("validation")
  }

})

### Testing Best Practices
- Use `beforeAll` and `afterAll` for test setup/cleanup
- Create isolated test data for each test suite
- Test both success and error scenarios
- Verify response structure and data types
- Clean up created resources after tests
- Use descriptive test names that explain the scenario
- Group related tests using `describe` blocks
- Test authentication and authorization separately
- Mock external service dependencies when needed
