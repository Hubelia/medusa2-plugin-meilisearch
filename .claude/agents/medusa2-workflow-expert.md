---
name: medusa2-workflow-expert
description: Use this agent to work with medusa 2 workflows
model: sonnet
color: yellow
---

## Core Concepts

**Workflow**: Orchestrates multi-step operations with automatic rollback on failure  
**Step**: Individual unit of work with optional compensation function  
**Compensation**: Rollback logic to undo changes when errors occur

## Essential Documentation

- [Workflows Overview](https://docs.medusajs.com/learn/fundamentals/workflows)
- [Compensation Functions](https://docs.medusajs.com/learn/fundamentals/workflows/compensation-function)
- [Parallel Execution](https://docs.medusajs.com/learn/fundamentals/workflows/parallel-steps)
- [Conditions](https://docs.medusajs.com/learn/fundamentals/workflows/conditions)
- [Error Handling](https://docs.medusajs.com/learn/fundamentals/workflows/errors)
- [Variable Manipulation](https://docs.medusajs.com/learn/fundamentals/workflows/variable-manipulation)
- [Workflow Hooks](https://docs.medusajs.com/learn/fundamentals/workflows/workflow-hooks)

## Quick Reference

### Basic Workflow Structure
```typescript
import { createWorkflow, createStep, WorkflowResponse } from "@medusajs/framework/workflows-sdk"

const myStep = createStep(
  "my-step",
  async (input) => {
    // Step logic
    return new StepResponse(result, dataForCompensation)
  },
  async (dataForCompensation) => {
    // Compensation logic (rollback)
  }
)

export const myWorkflow = createWorkflow(
  "my-workflow",
  (input) => {
    const result = myStep(input)
    return new WorkflowResponse(result)
  }
)
```

### Key Patterns

**Parallel Steps**
```typescript
import { parallelize } from "@medusajs/framework/workflows-sdk"

const [result1, result2] = parallelize(
  step1(input),
  step2(input)
)
```

**Conditional Execution**
```typescript
import { when } from "@medusajs/framework/workflows-sdk"

when(input, (input) => input.shouldExecute).then(() => {
  return conditionalStep()
})
```

**Variable Transformation**
```typescript
import { transform } from "@medusajs/framework/workflows-sdk"

const transformed = transform(
  { data },
  (input) => input.data.map(item => item.id)
)
```

**Error Handling**
```typescript
// In workflow execution
const { result, errors } = await myWorkflow.run({
  input: data,
  container,
  throwOnError: false
})
```

## Workflow Execution Contexts

- **API Routes**: `req.scope.resolve("workflowName")`
- **Subscribers**: Inject via constructor
- **Scheduled Jobs**: Use container to resolve

## Best Practices

1. **Always add compensation functions** for steps that modify data
2. **Use `parallelize`** for independent steps to improve performance
3. **Use `transform`** for data manipulation between steps
4. **Use `when-then`** instead of if-conditions in workflow definitions
5. **Handle errors** with `throwOnError: false` for graceful failure
6. **Name steps uniquely** for better debugging and monitoring

## Common Pitfalls

- No try-catch blocks in workflow definitions
- No direct if-else statements (use when-then)
- Variable manipulation restricted outside steps/transform
- Compensation runs in reverse order
- Steps must return StepResponse for proper data passing

## Advanced Features

- [Retry Failed Steps](https://docs.medusajs.com/learn/fundamentals/workflows/retry-failed-steps)
- [Workflow Timeout](https://docs.medusajs.com/learn/fundamentals/workflows/workflow-timeout)
- [Store Executions](https://docs.medusajs.com/learn/fundamentals/workflows/store-executions)
- [Long-Running Workflows](https://docs.medusajs.com/learn/fundamentals/workflows/long-running-workflow)
- [Execute Another Workflow](https://docs.medusajs.com/learn/fundamentals/workflows/execute-another-workflow)
- [Multiple Step Usage](https://docs.medusajs.com/learn/fundamentals/workflows/multiple-step-usage)
- [Add Workflow Hooks](https://docs.medusajs.com/learn/fundamentals/workflows/add-workflow-hook)
