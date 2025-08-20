import { createStep, StepResponse } from '@medusajs/workflows-sdk'
import { IndexWithFetcher } from './get-indexes-with-fetchers'

export type FilterIndexesStepInput = {
  indexes: IndexWithFetcher[]
  indexKeys?: string[]
}

export type FilterIndexesStepResult = {
  filteredIndexes: IndexWithFetcher[]
}

export const filterIndexesStep = createStep(
  'filter-indexes',
  async ({ indexes, indexKeys }: FilterIndexesStepInput, { container }) => {
    const logger = container.resolve('logger')

    // Filter to specific indexes if requested
    const filteredIndexes = indexKeys ? indexes.filter((index) => indexKeys.includes(index.indexKey)) : indexes

    logger.info(
      `Filtered indexes: ${filteredIndexes.length}/${indexes.length} indexes` +
        (indexKeys ? ` (filtered by: ${indexKeys.join(', ')})` : ''),
    )

    return new StepResponse<FilterIndexesStepResult>({
      filteredIndexes,
    })
  },
)
