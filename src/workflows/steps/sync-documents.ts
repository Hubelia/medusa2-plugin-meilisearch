import { createStep, StepResponse } from '@medusajs/workflows-sdk'
import { MEILISEARCH_MODULE, MeiliSearchService } from '../../modules/meilisearch'

export type SyncDocumentsStepInput = {
  indexKey: string
  filters?: Record<string, unknown>
  limit?: number
  offset?: number
  language?: string
}

export type SyncDocumentsStepResult = {
  documents: any[]
  added: number
  deleted: number
}

export const syncDocumentsStep = createStep(
  'sync-documents',
  async ({ indexKey, filters, limit, offset, language }: SyncDocumentsStepInput, { container }) => {
    const meilisearchService: MeiliSearchService = container.resolve(MEILISEARCH_MODULE)

    // Check if index is enabled
    const indexConfig = meilisearchService['config_'].settings?.[indexKey]
    if (!indexConfig || indexConfig.enabled === false) {
      return new StepResponse<SyncDocumentsStepResult>({
        documents: [],
        added: 0,
        deleted: 0,
      })
    }

    // Fetch documents using the configured fetcher
    const documents = await meilisearchService.fetchDocuments(indexKey, container, {
      filters,
      limit,
      offset,
      language,
    })

    if (!documents || documents.length === 0) {
      return new StepResponse<SyncDocumentsStepResult>({
        documents: [],
        added: 0,
        deleted: 0,
      })
    }

    // Get existing document IDs to detect deletions
    const documentIds = documents.map((doc) => doc.id || doc._id).filter(Boolean)

    let existingDocumentIds: string[] = []
    if (documentIds.length > 0) {
      try {
        const searchResults = await meilisearchService.search(indexKey, '', {
          filter: `id IN [${documentIds.map((id) => `"${id}"`).join(',')}]`,
          attributesToRetrieve: ['id'],
          language,
        })
        existingDocumentIds = searchResults.hits.map((hit: any) => hit.id)
      } catch {
        // Index might not exist yet, that's okay
        console.log(`Index ${indexKey} does not exist yet, will be created`)
      }
    }

    // Find documents that need to be deleted (exist in index but not in fetched results)
    const documentsToDelete = existingDocumentIds.filter((id) => !documentIds.includes(id))

    // Add or update documents
    await meilisearchService.addDocuments(indexKey, documents, language)

    // Delete removed documents
    if (documentsToDelete.length > 0) {
      await meilisearchService.deleteDocuments(indexKey, documentsToDelete, language)
    }

    return new StepResponse<SyncDocumentsStepResult>({
      documents,
      added: documents.length,
      deleted: documentsToDelete.length,
    })
  },
)
