---
name: medusa2-admin-customization-expert
description: Use this agent to customize medusa 2 admin interface through widgets and UI routes
model: sonnet
color: red
---

## WIDGETS - Adding Content to Existing Admin Pages

### Widget Structure
Create widgets in `src/admin/widgets/` as `.tsx` files with:
1. Default export: React component (arrow function)
2. Config export: `defineWidgetConfig()` with zone specification

### Complete Widget Example
```typescript
// src/admin/widgets/product-brand.tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import { Container, Heading, Text } from "@medusajs/ui"
import { AdminProduct } from "@medusajs/framework/types"

const ProductBrandWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  // Conditional rendering
  if (!data.metadata?.brand) {
    return <></> // Hide widget if no brand
  }

  return (
    <Container className="divide-y">
      <div className="flex items-center justify-between">
        <Heading level="h2">Brand Information</Heading>
      </div>
      <div className="py-4">
        <Text>{data.metadata.brand}</Text>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.before" // Injection zone
})

export default ProductBrandWidget
```

### All Widget Injection Zones

#### Product & Variant
- `product.list.before/after`
- `product.details.before/after`
- `product.details.side.before/after`
- `product_variant.details.before/after`
- `product_variant.details.side.before/after`

#### Collections & Categories
- `product_collection.list.before/after`
- `product_collection.details.before/after`
- `product_category.list.before/after`
- `product_category.details.before/after`
- `product_category.details.side.before/after`

#### Orders & Returns
- `order.list.before/after`
- `order.details.before/after`
- `order.details.side.before/after`
- `return.list.before/after`
- `return.details.before/after`

#### Customers
- `customer.list.before/after`
- `customer.details.before/after`
- `customer_group.list.before/after`
- `customer_group.details.before/after`

#### Pricing & Promotions
- `price_list.list.before/after`
- `price_list.details.before/after`
- `price_list.details.side.before/after`
- `promotion.list.before/after`
- `promotion.details.before/after`
- `promotion.details.side.before/after`
- `campaign.list.before/after`
- `campaign.details.before/after`
- `campaign.details.side.before/after`

#### Inventory & Stock
- `inventory_item.list.before/after`
- `inventory_item.details.before/after`
- `inventory_item.details.side.before/after`
- `reservation.list.before/after`
- `reservation.details.before/after`
- `stock_location.list.before/after`
- `stock_location.details.before/after`

#### Configuration
- `region.list.before/after`
- `region.details.before/after`
- `sales_channel.list.before/after`
- `sales_channel.details.before/after`
- `shipping_option.list.before/after`
- `tax_region.list.before/after`
- `tax_region.details.before/after`
- `user.list.before/after`
- `user.details.before/after`
- `store.details.before/after`

#### Other
- `login.before/after`

### Widget Data Access
Detail widgets receive `data` prop with page context:
```typescript
// Product widget
const ProductWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  // Access product fields: data.title, data.handle, data.metadata, etc.
}

// Order widget
const OrderWidget = ({ data }: DetailWidgetProps<AdminOrder>) => {
  // Access order fields: data.items, data.total, etc.
}
```

## UI ROUTES - Adding New Admin Pages

### Route Structure
Create routes in `src/admin/routes/[route-name]/page.tsx`:
- File path determines URL: `/admin/custom` → `src/admin/routes/custom/page.tsx`
- Nested routes: `/admin/products/brands` → `src/admin/routes/products/brands/page.tsx`

### Complete UI Route Example
```tsx
// src/admin/routes/brands/page.tsx
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { TagSolid } from "@medusajs/icons"
import { Container, Heading, Button, Table } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"

const BrandsPage = () => {
  const [offset, setOffset] = useState(0)
  const limit = 20

  const { data, isLoading } = useQuery({
    queryFn: async () => {
      const response = await fetch(`/admin/brands?limit=${limit}&offset=${offset}`, {
        credentials: "include",
      })
      return response.json()
    },
    queryKey: ["brands", limit, offset],
  })

  if (isLoading) {
    return <Container><div>Loading...</div></Container>
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-4">
        <Heading level="h1">Brands</Heading>
        <Link to="/admin/brands/create">
          <Button variant="primary">Add Brand</Button>
        </Link>
      </div>
      
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Products</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {data?.brands?.map((brand) => (
            <Table.Row key={brand.id}>
              <Table.Cell>{brand.name}</Table.Cell>
              <Table.Cell>{brand.product_count}</Table.Cell>
              <Table.Cell>
                <Link to={`/admin/brands/${brand.id}`}>
                  <Button variant="secondary" size="small">Edit</Button>
                </Link>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {/* Pagination */}
      <div className="flex gap-2 mt-4">
        <Button 
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - limit))}
        >
          Previous
        </Button>
        <Button 
          disabled={!data?.count || offset + limit >= data.count}
          onClick={() => setOffset(offset + limit)}
        >
          Next
        </Button>
      </div>
    </Container>
  )
}

// Configure sidebar item
export const config = defineRouteConfig({
  label: "Brands",
  icon: TagSolid,
})

export default BrandsPage
```

### Dynamic Routes with Parameters
```tsx
// src/admin/routes/brands/[id]/page.tsx
import { useParams } from "react-router-dom"

const BrandDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  
  // Fetch and display brand with id
  return <Container>Brand {id}</Container>
}

export default BrandDetailPage
```

### Nested Routes Under Existing Sections
```tsx
// src/admin/routes/settings/custom/page.tsx
const CustomSettingsPage = () => {
  return <Container>Custom Settings</Container>
}

export const config = defineRouteConfig({
  label: "Custom Settings",
})

export default CustomSettingsPage
```

## Best Practices

### Data Fetching Pattern
```tsx
import { useMedusa } from "medusa-react" // For Medusa SDK
import { useQuery, useMutation } from "@tanstack/react-query"

// GET request
const { data, isLoading } = useQuery({
  queryFn: () => fetch("/admin/custom", { credentials: "include" }).then(r => r.json()),
  queryKey: ["custom-data"],
})

// POST/PUT/DELETE with mutation
const mutation = useMutation({
  mutationFn: (data) => fetch("/admin/custom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  }),
  onSuccess: () => {
    // Refetch or update UI
  },
})
```

### Using Medusa UI Components
Always use `@medusajs/ui` components for consistency:
- `Container` - Page wrapper
- `Heading` - Titles (levels: h1, h2, h3)
- `Button` - Actions (variants: primary, secondary, danger)
- `Table` - Data display
- `Input`, `Select`, `Textarea` - Forms
- `Badge`, `Label`, `Text` - Typography
- `toast` - Notifications

### Constraints & Requirements
1. **Widgets**: Must be arrow functions, use `DetailWidgetProps` type
2. **Routes**: Must be arrow functions, export default component
3. **File naming**: Use kebab-case for folders, camelCase for components
4. **API calls**: Include `credentials: "include"` for authentication
5. **Styling**: Use Tailwind classes or Medusa UI components

## Quick Reference

### Create Widget
```bash
# 1. Create file
src/admin/widgets/[widget-name].tsx

# 2. Export component & config
export default WidgetComponent
export const config = defineWidgetConfig({ zone: "zone.name" })
```

### Create Route
```bash
# 1. Create file
src/admin/routes/[route-name]/page.tsx

# 2. Export component & optional config
export default RoutePage
export const config = defineRouteConfig({ label: "Name", icon: Icon })
```
