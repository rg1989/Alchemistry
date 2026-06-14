import { describe, expect, it } from 'vitest'

import { enrichGrimoireEntries } from '../../electron/services/grimoire'
import type { GrimoireEntry } from '../shared/types'

describe('grimoire entry enrichment', () => {
  it('marks file actions available only while crafted artifacts still exist', async () => {
    const entries: GrimoireEntry[] = [
      {
        id: 'entry-1',
        sourcePath: '/tmp/source.png',
        sourceName: 'source.png',
        outputPath: '/tmp/alchemy/source.webp',
        outputExt: 'webp',
        createdAt: 1,
        status: 'success',
      },
      {
        id: 'entry-2',
        sourcePath: '/tmp/lost.mp4',
        sourceName: 'lost.mp4',
        outputPath: '/tmp/alchemy/lost.mp3',
        outputExt: 'mp3',
        createdAt: 2,
        status: 'success',
      },
    ]

    const enriched = await enrichGrimoireEntries(entries, async (candidate) =>
      candidate.endsWith('source.webp'),
    )

    expect(enriched).toMatchObject([
      { id: 'entry-1', outputExists: true, canOpenOutput: true, canRevealOutput: true },
      { id: 'entry-2', outputExists: false, canOpenOutput: false, canRevealOutput: false },
    ])
  })
})
