import { createStep, StepResponse } from '@medusajs/workflows-sdk'
import { MEILISEARCH_MODULE, MeiliSearchService } from '../../modules/meilisearch'

export type GetIndexesWithFetchersStepInput = {
  language?: string
}

export type IndexWithFetcher = {
  indexKey: string
  type?: string
  language?: string
}

export type GetIndexesWithFetchersStepResult = {
  indexes: IndexWithFetcher[]
}

export const getIndexesWithFetchersStep = createStep(
  'get-indexes-with-fetchers',
  async ({ language }: GetIndexesWithFetchersStepInput, { container }) => {
    const meilisearchService: MeiliSearchService = container.resolve(MEILISEARCH_MODULE)
    const logger = container.resolve('logger')

    const config = meilisearchService['config_']
    const settings = config.settings || {}
    const { i18n } = config

    const indexes: IndexWithFetcher[] = []

    for (const [indexKey, indexConfig] of Object.entries(settings)) {
      // Skip disabled indexes
      if (indexConfig.enabled === false) {
        logger.info(`Skipping disabled index: ${indexKey}`)
        continue
      }

      // Only include indexes with custom fetchers (not default product fetcher)
      if (!indexConfig.fetcher) {
        continue
      }

      // Handle i18n strategy
      if (i18n?.strategy === 'separate-index' && i18n.languages?.length > 0) {
        const targetLanguages = language ? [language] : i18n.languages

        for (const lang of targetLanguages) {
          indexes.push({
            indexKey,
            type: indexConfig.type,
            language: lang,
          })
        }
      } else {
        indexes.push({
          indexKey,
          type: indexConfig.type,
          language,
        })
      }
    }

    logger.info(`Found ${indexes.length} processable indexes`)

    return new StepResponse<GetIndexesWithFetchersStepResult>({
      indexes,
    })
  },
)
