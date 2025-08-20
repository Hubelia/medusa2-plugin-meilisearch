import { createStep, StepResponse } from '@medusajs/workflows-sdk'
import { MEILISEARCH_MODULE, MeiliSearchService } from '../../modules/meilisearch'
import { IndexWithFetcher } from './get-indexes-with-fetchers'

export type BulkSyncDocumentsStepInput = {
  indexes: IndexWithFetcher[]
  filters?: Record<string, unknown>
  limit?: number
  offset?: number
}

export type IndexSyncResult = {
  indexKey: string
  language?: string
  success: boolean
  documents: any[]
  added: number
  deleted: number
  error?: string
  processingTime: number
}

export type BulkSyncDocumentsStepResult = {
  results: IndexSyncResult[]
  totalProcessed: number
  totalSuccessful: number
  totalFailed: number
  totalDocuments: number
  totalAdded: number
  totalDeleted: number
  processingTime: number
}

export const bulkSyncDocumentsStep = createStep(
  'bulk-sync-documents',
  async ({ indexes, filters, limit, offset }: BulkSyncDocumentsStepInput, { container }) => {
    const logger = container.resolve('logger')
    const meilisearchService: MeiliSearchService = container.resolve(MEILISEARCH_MODULE)
    const startTime = Date.now()

    logger.info(`Starting bulk sync for ${indexes.length} indexes`)

    // Process all indexes in parallel using Promise.all
    const indexResults = await Promise.all(
      indexes.map(async (indexInfo) => {
        const indexStartTime = Date.now()

        try {
          // Check if index is enabled
          const indexConfig = meilisearchService['config_'].settings?.[indexInfo.indexKey]
          if (!indexConfig || indexConfig.enabled === false) {
            return {
              indexKey: indexInfo.indexKey,
              language: indexInfo.language,
              success: true,
              documents: [],
              added: 0,
              deleted: 0,
              processingTime: Date.now() - indexStartTime,
            }
          }

          // Fetch documents using the configured fetcher
          const documents = await meilisearchService.fetchDocuments(indexInfo.indexKey, container, {
            filters,
            limit,
            offset,
            language: indexInfo.language,
          })

          if (!documents || documents.length === 0) {
            return {
              indexKey: indexInfo.indexKey,
              language: indexInfo.language,
              success: true,
              documents: [],
              added: 0,
              deleted: 0,
              processingTime: Date.now() - indexStartTime,
            }
          }

          // Get existing document IDs to detect deletions
          const documentIds = documents.map((doc) => doc.id || doc._id).filter(Boolean)
          let existingDocumentIds: string[] = []

          if (documentIds.length > 0) {
            try {
              const searchResults = await meilisearchService.search(indexInfo.indexKey, '', {
                filter: `id IN [${documentIds.map((id) => `"${id}"`).join(',')}]`,
                attributesToRetrieve: ['id'],
                language: indexInfo.language,
              })
              existingDocumentIds = searchResults.hits.map((hit: any) => hit.id)
            } catch {
              // Index might not exist yet, that's okay
              logger.info(`Index ${indexInfo.indexKey} does not exist yet, will be created`)
            }
          }

          // Find documents that need to be deleted
          const documentsToDelete = existingDocumentIds.filter((id) => !documentIds.includes(id))

          // Add or update documents
          await meilisearchService.addDocuments(indexInfo.indexKey, documents, indexInfo.language, container)

          // Delete removed documents
          if (documentsToDelete.length > 0) {
            await meilisearchService.deleteDocuments(indexInfo.indexKey, documentsToDelete, indexInfo.language)
          }

          const langSuffix = indexInfo.language ? ` (${indexInfo.language})` : ''
          logger.info(
            `✓ ${indexInfo.indexKey}${langSuffix}: ${documents.length} added, ${documentsToDelete.length} deleted`,
          )

          return {
            indexKey: indexInfo.indexKey,
            language: indexInfo.language,
            success: true,
            documents,
            added: documents.length,
            deleted: documentsToDelete.length,
            processingTime: Date.now() - indexStartTime,
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          const langSuffix = indexInfo.language ? ` (${indexInfo.language})` : ''
          logger.error(`✗ ${indexInfo.indexKey}${langSuffix}: ${errorMessage}`)

          return {
            indexKey: indexInfo.indexKey,
            language: indexInfo.language,
            success: false,
            documents: [],
            added: 0,
            deleted: 0,
            error: errorMessage,
            processingTime: Date.now() - indexStartTime,
          }
        }
      }),
    )

    // Calculate totals
    let totalSuccessful = 0
    let totalFailed = 0
    let totalDocuments = 0
    let totalAdded = 0
    let totalDeleted = 0

    indexResults.forEach((result) => {
      if (result.success) {
        totalSuccessful++
      } else {
        totalFailed++
      }
      totalDocuments += result.documents.length
      totalAdded += result.added
      totalDeleted += result.deleted
    })

    const processingTime = Date.now() - startTime

    logger.info(
      `Bulk sync completed: ${totalSuccessful}/${indexes.length} successful, ` +
        `${totalDocuments} total documents, ${totalAdded} added, ${totalDeleted} deleted ` +
        `in ${processingTime}ms`,
    )

    return new StepResponse<BulkSyncDocumentsStepResult>({
      results: indexResults,
      totalProcessed: indexes.length,
      totalSuccessful,
      totalFailed,
      totalDocuments,
      totalAdded,
      totalDeleted,
      processingTime,
    })
  },
)
