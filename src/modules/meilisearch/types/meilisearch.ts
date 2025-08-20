import { ProductDTO, SearchTypes } from '@medusajs/types'
import { Config, Settings } from 'meilisearch'
import { TransformOptions } from '../utils/transformer'
import { TranslatableField } from './translation'

export const meilisearchErrorCodes = {
  INDEX_NOT_FOUND: 'index_not_found',
}

export type I18nStrategy = 'separate-index' | 'field-suffix'

export interface I18nConfig {
  /**
   * The i18n strategy to use
   * - separate-index: Creates separate indexes for each language
   * - field-suffix: Adds language suffix to translatable fields
   */
  strategy: I18nStrategy

  /**
   * List of supported languages (e.g. ['en', 'fr', 'de'])
   */
  languages: string[]

  /**
   * Default language to use when no language is specified
   */
  defaultLanguage: string

  /**
   * Fields that should be translated
   * Only used when the strategy is 'field-suffix'
   */
  translatableFields?: (string | TranslatableField)[]
}

export type TransformedProduct = Record<string, any>

export type DefaultProductTransformer<Result extends TransformedProduct = TransformedProduct> = (
  document: ProductDTO,
  options?: TransformOptions,
) => Result

export type ProductTransformer<Result extends TransformedProduct = TransformedProduct> = (
  document: ProductDTO,
  container: any,
  defaultTransformer: DefaultProductTransformer,
  options?: TransformOptions,
) => Promise<Result>

export type DocumentFetcherOptions = {
  filters?: Record<string, unknown>
  limit?: number
  offset?: number
  language?: string
}

export type DocumentFetcher<T = any> = (container: any, options: DocumentFetcherOptions) => Promise<T[]>

export type DocumentTransformer<T = any, Result = Record<string, any>> = (
  document: T,
  container: any,
  defaultTransformer?: (doc: T, options?: TransformOptions) => Result,
  options?: TransformOptions,
) => Promise<Result> | Result

export interface MeilisearchPluginOptions {
  /**
   * Meilisearch client configuration
   */
  config: Config

  /**
   * Index settings
   */
  settings?: {
    [key: string]: Omit<SearchTypes.IndexSettings, 'transformer'> & {
      type?: string
      enabled?: boolean
      fields?: string[]
      indexSettings: Settings
      transformer?: ProductTransformer<Record<string, any>> | DocumentTransformer<any, Record<string, any>>
      /**
       * Custom function to fetch documents for this index.
       * If not provided, will use default fetcher based on type (e.g., products).
       */
      fetcher?: DocumentFetcher
    }
  }

  /**
   * I18n configuration
   */
  i18n?: I18nConfig
}
