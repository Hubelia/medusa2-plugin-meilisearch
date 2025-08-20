import { SearchTypes } from '@medusajs/types'
import { SearchUtils } from '@medusajs/utils'
import { MeiliSearch } from 'meilisearch'
import {
  meilisearchErrorCodes,
  MeilisearchPluginOptions,
  DocumentFetcher,
  DocumentFetcherOptions,
  DocumentTransformer,
} from '../types'
import { transformProduct, TransformOptions } from '../utils/transformer'
import { Logger } from '@medusajs/medusa'

export class MeiliSearchService extends SearchUtils.AbstractSearchService {
  static identifier = 'index-meilisearch'

  isDefault = false

  protected readonly config_: MeilisearchPluginOptions
  protected readonly client_: MeiliSearch
  protected _logger: Logger
  protected container_: any

  constructor(container: any, options: MeilisearchPluginOptions) {
    super(container, options)

    this.config_ = options
    this._logger = container.logger
    this.container_ = container

    if (!options.config?.apiKey) {
      throw Error(
        'Meilisearch API key is missing in plugin config. See https://github.com/rokmohar/medusa-plugin-meilisearch',
      )
    }

    if (!options.config?.host) {
      throw Error(
        'Meilisearch host is missing in plugin config. See https://github.com/rokmohar/medusa-plugin-meilisearch',
      )
    }

    this.client_ = new MeiliSearch(options.config)
  }

  protected getLanguageIndexKey(baseKey: string, language?: string): string {
    const { i18n } = this.config_

    if (!i18n || i18n.strategy !== 'separate-index' || !language) {
      return baseKey
    }

    return `${baseKey}_${language}`
  }

  async getFieldsForType(type: string) {
    const fields = new Set<string>()

    Object.values(this.config_.settings || {})
      .filter((config) => config.type === type && config.enabled !== false)
      .forEach((config) => {
        if (Array.isArray(config.fields)) {
          config.fields.forEach((field) => fields.add(field))
        }
      })

    if (!fields.size) {
      fields.add('*')
    }

    return Array.from(fields)
  }

  async getFieldsForIndex(indexKey: string) {
    const indexConfig = this.config_.settings?.[indexKey]
    if (!indexConfig || indexConfig.enabled === false) {
      return ['*']
    }

    if (Array.isArray(indexConfig.fields)) {
      return indexConfig.fields
    }

    return ['*']
  }

  async getIndexesByType(type: string) {
    const { i18n } = this.config_
    const baseIndexes = Object.entries(this.config_.settings || {})
      .filter(([, config]) => config.type === type && config.enabled !== false)
      .map(([key]) => key)

    if (i18n?.strategy === 'separate-index') {
      const { languages } = i18n
      return baseIndexes.flatMap((baseIndex) => languages.map((lang) => this.getLanguageIndexKey(baseIndex, lang)))
    }

    return baseIndexes
  }

  async createIndex(indexKey: string, options: Record<string, unknown> = { primaryKey: 'id' }) {
    return this.client_.createIndex(indexKey, options)
  }

  getIndex(indexKey: string) {
    return this.client_.index(indexKey)
  }

  async addDocuments(indexKey: string, documents: any[], language?: string, container?: any) {
    const { i18n } = this.config_
    const i18nOptions = {
      i18n,
      language,
    }

    if (i18n?.strategy === 'separate-index') {
      const langIndexKey = this.getLanguageIndexKey(indexKey, language || i18n.defaultLanguage)
      const transformedDocuments = await this.getTransformedDocuments(indexKey, documents, i18nOptions, container)
      return this.client_.index(langIndexKey).addDocuments(transformedDocuments, { primaryKey: 'id' })
    } else {
      const transformedDocuments = await this.getTransformedDocuments(indexKey, documents, i18nOptions, container)
      this._logger.info('add documents')
      this._logger.info(JSON.stringify(transformedDocuments, null, 2))
      return this.client_.index(indexKey).addDocuments(transformedDocuments, { primaryKey: 'id' })
    }
  }

  async replaceDocuments(indexKey: string, documents: any[], language?: string, container?: any) {
    return this.addDocuments(indexKey, documents, language, container)
  }

  async deleteDocument(indexKey: string, documentId: string, language?: string) {
    const actualIndexKey = this.getLanguageIndexKey(indexKey, language)
    return this.client_.index(actualIndexKey).deleteDocument(documentId)
  }

  async deleteDocuments(indexKey: string, documentIds: string[], language?: string) {
    const actualIndexKey = this.getLanguageIndexKey(indexKey, language)
    return this.client_.index(actualIndexKey).deleteDocuments(documentIds)
  }

  async deleteAllDocuments(indexKey: string, language?: string) {
    const actualIndexKey = this.getLanguageIndexKey(indexKey, language)
    return this.client_.index(actualIndexKey).deleteAllDocuments()
  }

  async search(indexKey: string, query: string, options: Record<string, any> & { language?: string }) {
    const { language, paginationOptions, filter, additionalOptions } = options
    const actualIndexKey = this.getLanguageIndexKey(indexKey, language)
    return this.client_.index(actualIndexKey).search(query, { filter, ...paginationOptions, ...additionalOptions })
  }

  async updateSettings(indexKey: string, settings: Pick<SearchTypes.IndexSettings, 'indexSettings' | 'primaryKey'>) {
    const indexConfig = this.config_.settings?.[indexKey]
    if (indexConfig?.enabled === false) {
      return
    }

    const { i18n } = this.config_

    if (i18n?.strategy === 'separate-index') {
      const { languages } = i18n
      return Promise.all(
        languages.map(async (lang) => {
          const langIndexKey = this.getLanguageIndexKey(indexKey, lang)
          await this.upsertIndex(langIndexKey, settings)
          return this.client_.index(langIndexKey).updateSettings(settings.indexSettings ?? {})
        }),
      )
    } else {
      await this.upsertIndex(indexKey, settings)
      return this.client_.index(indexKey).updateSettings(settings.indexSettings ?? {})
    }
  }

  async upsertIndex(indexKey: string, settings: Pick<SearchTypes.IndexSettings, 'primaryKey'>) {
    const indexConfig = this.config_.settings?.[indexKey]
    if (indexConfig?.enabled === false) {
      return
    }
    try {
      await this.client_.getIndex(indexKey)
    } catch (error) {
      if (error.code === meilisearchErrorCodes.INDEX_NOT_FOUND) {
        await this.createIndex(indexKey, {
          primaryKey: settings.primaryKey ?? 'id',
        })
      }
    }
  }

  async getDocumentFetcher(indexKey: string): Promise<DocumentFetcher | null> {
    const indexConfig = this.config_.settings?.[indexKey]
    if (!indexConfig || indexConfig.enabled === false) {
      return null
    }

    // Return custom fetcher if provided
    if (indexConfig.fetcher) {
      return indexConfig.fetcher
    }

    // Default fetcher for products
    if (indexConfig.type === SearchUtils.indexTypes.PRODUCTS) {
      // Use arrow function to preserve 'this' context
      return async (container: any, options: DocumentFetcherOptions) => {
        const queryService = container.resolve('query')
        const fields = await this.getFieldsForType(SearchUtils.indexTypes.PRODUCTS)

        const { data: products } = await queryService.graph({
          entity: 'product',
          fields: fields,
          pagination: {
            take: options.limit,
            skip: options.offset,
          },
          filters: {
            status: 'published',
            ...options.filters,
          },
        })

        return products
      }
    }

    // No fetcher available for this index type
    return null
  }

  async fetchDocuments(indexKey: string, container: any, options: DocumentFetcherOptions = {}): Promise<any[]> {
    const fetcher = await this.getDocumentFetcher(indexKey)
    if (!fetcher) {
      console.log(`No document fetcher configured for index: ${indexKey}. Returning empty array.`)
      return []
    }

    return fetcher(container, options)
  }

  private async getTransformedDocuments(
    indexKey: string,
    documents: any[],
    options?: TransformOptions,
    container?: any,
  ) {
    if (!documents?.length) {
      return []
    }

    const indexConfig = (this.config_.settings || {})[indexKey]
    const transformerContainer = container || this.container_

    // If a custom transformer is provided, use it
    if (indexConfig?.transformer) {
      // For products, provide the default transformer after container
      if (indexConfig.type === SearchUtils.indexTypes.PRODUCTS) {
        return Promise.all(
          documents.map((doc) => indexConfig.transformer!(doc, transformerContainer, transformProduct, { ...options })),
        )
      }

      // For other types, transformer handles everything
      return Promise.all(
        documents.map((doc) =>
          (indexConfig.transformer! as DocumentTransformer)(doc, transformerContainer, undefined, { ...options }),
        ),
      )
    }

    // Default transformations based on type
    switch (indexConfig?.type) {
      case SearchUtils.indexTypes.PRODUCTS:
        return Promise.all(documents.map((doc) => transformProduct(doc, options)))

      default:
        // For custom types without transformers, return documents as-is
        return documents
    }
  }
}
