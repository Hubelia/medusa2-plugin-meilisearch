import { createWorkflow, WorkflowResponse } from '@medusajs/workflows-sdk'
import { getIndexesWithFetchersStep } from './steps/get-indexes-with-fetchers'
import { filterIndexesStep } from './steps/filter-indexes'
import { bulkSyncDocumentsStep, BulkSyncDocumentsStepResult } from './steps/bulk-sync-documents'

export type BulkSyncDocumentsWorkflowInput = {
  filters?: Record<string, unknown>
  limit?: number
  offset?: number
  language?: string
  indexKeys?: string[] // Optional: specific indexes to process
}

export type BulkSyncDocumentsWorkflowResult = BulkSyncDocumentsStepResult

export const bulkSyncDocumentsWorkflow = createWorkflow(
  'bulk-sync-documents',
  ({ filters, limit, offset, language, indexKeys }: BulkSyncDocumentsWorkflowInput) => {
    // Get all indexes that have fetcher functions
    const { indexes } = getIndexesWithFetchersStep({ language })

    // Filter to specific indexes if requested
    const { filteredIndexes } = filterIndexesStep({
      indexes,
      indexKeys,
    })

    // Bulk sync all discovered indexes
    const result = bulkSyncDocumentsStep({
      indexes: filteredIndexes,
      filters,
      limit,
      offset,
    })

    return new WorkflowResponse<BulkSyncDocumentsWorkflowResult>(result)
  },
)
