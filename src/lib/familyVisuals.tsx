import type { IconType } from 'react-icons'
import {
  GiCrystalGrowth,
  GiFilmStrip,
  GiMusicalNotes,
  GiScrollUnfurled,
  GiSpellBook,
} from 'react-icons/gi'

import type { ConversionFamily } from '../shared/types'

export interface FamilyVisual {
  icon: IconType
  noun: string
  hue: string
  glow: string
}

const FAMILY_VISUALS: Record<ConversionFamily, FamilyVisual> = {
  image: {
    icon: GiCrystalGrowth,
    noun: 'Crystal',
    hue: '#5ad7c6',
    glow: 'rgba(90, 215, 198, 0.45)',
  },
  video: {
    icon: GiFilmStrip,
    noun: 'Moving Rune',
    hue: '#b793ff',
    glow: 'rgba(183, 147, 255, 0.45)',
  },
  audio: {
    icon: GiMusicalNotes,
    noun: 'Echo',
    hue: '#ff93c4',
    glow: 'rgba(255, 147, 196, 0.45)',
  },
  document: {
    icon: GiScrollUnfurled,
    noun: 'Scroll',
    hue: '#f0c860',
    glow: 'rgba(240, 200, 96, 0.45)',
  },
  pdf: {
    icon: GiSpellBook,
    noun: 'Tome',
    hue: '#7fd194',
    glow: 'rgba(127, 209, 148, 0.45)',
  },
}

export function getFamilyVisual(family: ConversionFamily): FamilyVisual {
  return FAMILY_VISUALS[family] ?? FAMILY_VISUALS.document
}
