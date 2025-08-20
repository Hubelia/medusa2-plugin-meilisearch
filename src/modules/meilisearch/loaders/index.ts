import { LoaderOptions } from '@medusajs/types'
import { MeiliSearchService } from '../services'
import { MeilisearchPluginOptions } from '../types'
import { asValue } from 'awilix'

export default async ({ container, options }: LoaderOptions<MeilisearchPluginOptions>): Promise<void> => {
  if (!options) {
    throw new Error('Missing meilisearch configuration')
  }

  const meilisearchService: MeiliSearchService = new MeiliSearchService(container, options)
  const { settings } = options

  container.register({
    meilisearchService: asValue(meilisearchService),
  })

  // Initialize index settings
  await Promise.all(
    Object.entries(settings || {}).map(async ([indexName, value]) => {
      return await meilisearchService.updateSettings(indexName, value)
    }),
  )

  // Register sync jobs for indexes with custom fetchers
  const logger = container.resolve('logger')

  Object.entries(settings || {}).forEach(([indexName, config]) => {
    if (config.enabled !== false && config.fetcher) {
      // Log that we've detected a custom fetcher
      logger.info(`Detected custom fetcher for index: ${indexName}`)

      // Note: Actual job registration would need to be done through Medusa's job scheduling system
      // This is typically done at the plugin level, not in the loader
      // Users would need to manually create jobs or we'd need to expose a registration API
    }
  })
}
