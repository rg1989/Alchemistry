import type { AlchemistryApi } from './types'

declare global {
  interface Window {
    alchemistry: AlchemistryApi
  }
}

export {}
