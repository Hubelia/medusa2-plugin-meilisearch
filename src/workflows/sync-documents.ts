import { createWorkflow, WorkflowResponse } from '@medusajs/workflows-sdk'
import { syncDocumentsStep } from './steps/sync-documents'

export type SyncDocumentsWorkflowInput = {
  indexKey: string
  filters?: Record<string, unknown>
  limit?: number
  offset?: number
  language?: string
}

export const syncDocumentsWorkflow = createWorkflow(
  'sync-documents',
  ({ indexKey, filters, limit, offset, language }: SyncDocumentsWorkflowInput) => {
    const result = syncDocumentsStep({ indexKey, filters, limit, offset, language })

    return new WorkflowResponse(result)
  },
)
