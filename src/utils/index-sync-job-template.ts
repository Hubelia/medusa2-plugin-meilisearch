import { MedusaContainer } from '@medusajs/framework'
import { syncDocumentsWorkflow } from '../workflows/sync-documents'

export type IndexSyncJobData = {
  indexKey: string
  filters?: Record<string, unknown>
  limit?: number
  offset?: number
  batchSize?: number
}

export default async function meilisearchIndexSyncJob(container: MedusaContainer, data?: IndexSyncJobData) {
  const logger = container.resolve('logger')

  // If no data provided, this job shouldn't run
  if (!data || !data.indexKey) {
    logger.warn('meilisearch-index-sync job called without indexKey data. Skipping.')
    return
  }

  const { indexKey, filters, limit, offset, batchSize = 100 } = data

  logger.info(`Starting document indexing for index: ${indexKey}...`)

  // If limit is specified, use it directly
  if (limit) {
    const { result } = await syncDocumentsWorkflow(container).run({
      input: {
        indexKey,
        filters,
        limit,
        offset,
      },
    })

    logger.info(
      `Successfully indexed ${result.added} documents and removed ${result.deleted} documents for index: ${indexKey}`,
    )
    return
  }

  // Otherwise, sync in batches
  let currentOffset = offset || 0
  let totalAdded = 0
  let totalDeleted = 0
  let hasMore = true

  while (hasMore) {
    const { result } = await syncDocumentsWorkflow(container).run({
      input: {
        indexKey,
        filters,
        limit: batchSize,
        offset: currentOffset,
      },
    })

    totalAdded += result.added || 0
    totalDeleted += result.deleted || 0

    // Check if we got less than batchSize documents (meaning we've reached the end)
    if (!result.documents || result.documents.length < batchSize) {
      hasMore = false
    } else {
      currentOffset += batchSize
    }
  }

  logger.info(
    `Successfully indexed ${totalAdded} documents and removed ${totalDeleted} documents for index: ${indexKey}`,
  )
}

// This is a template - copy this file to your jobs/ directory and customize it
// Example job config (don't export to prevent auto-registration):
//
// export const config: CronJobConfig = {
//   name: 'sync-search-suggestions',
//   schedule: '0 */6 * * *', // Every 6 hours
//   numberOfExecutions: 1,
// }
