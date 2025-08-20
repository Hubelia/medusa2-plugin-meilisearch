import { MedusaContainer } from '@medusajs/framework'
import { bulkSyncDocumentsWorkflow } from '../workflows/bulk-sync-documents'
import { CronJobConfig } from '../models/CronJobConfig'

export default async function meilisearchBulkIndexJob(container: MedusaContainer) {
  const logger = container.resolve('logger')

  logger.info('Starting bulk indexing for all custom documents...')

  try {
    const {
      result: { totalProcessed, totalSuccessful, totalFailed, results },
    } = await bulkSyncDocumentsWorkflow(container).run({
      input: {
        // You can customize these parameters as needed
        // filters: {},
        // limit: 1000,
        // offset: 0,
        // language: 'en',
        // indexKeys: ['specific-index'], // Optional: limit to specific indexes
      },
    })

    // Log detailed results
    logger.info(`Total indexes processed: ${totalProcessed}`)
    logger.info(`Successful: ${totalSuccessful}`)
    logger.info(`Failed: ${totalFailed}`)

    // Log any failures
    const failures = results.filter((r) => !r.success)
    if (failures.length > 0) {
      logger.warn('=== Failed Indexes ===')
      failures.forEach((failure) => {
        const langSuffix = failure.language ? ` (${failure.language})` : ''
        logger.warn(`${failure.indexKey}${langSuffix}: ${failure.error}`)
      })
    }

    logger.info(`Bulk indexing completed successfully for ${totalSuccessful}/${totalProcessed} indexes`)
  } catch (error) {
    logger.error('Bulk indexing failed:', error)
    throw error
  }
}

export const config: CronJobConfig = {
  name: 'meilisearch-bulk-index',
  schedule: '* * * * *', // Run daily at 2 AM
  numberOfExecutions: 1,
}
