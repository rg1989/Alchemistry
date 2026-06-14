import type { GrimoireEntry, GrimoireEntryWithExistence } from '../../src/shared/types'

export async function enrichGrimoireEntries(
  entries: GrimoireEntry[],
  exists: (candidate: string) => Promise<boolean>,
): Promise<GrimoireEntryWithExistence[]> {
  return Promise.all(
    entries.map(async (entry) => {
      const outputExists = entry.status === 'success' && (await exists(entry.outputPath))

      return {
        ...entry,
        outputExists,
        canOpenOutput: outputExists,
        canRevealOutput: outputExists,
      }
    }),
  )
}
