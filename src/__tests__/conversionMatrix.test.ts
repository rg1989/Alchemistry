import { describe, expect, it } from 'vitest'

import {
  ALLOWED_INPUT_EXTENSIONS,
  getAllowedOutputs,
  isAllowedInputExtension,
} from '../shared/conversionMatrix'

describe('conversion matrix', () => {
  it('offers audio extraction elixirs for video reagents', () => {
    const mp4Outputs = getAllowedOutputs('mp4').map((output) => output.ext)

    expect(mp4Outputs).toContain('webm')
    expect(mp4Outputs).toContain('mp3')
    expect(mp4Outputs).toContain('wav')
    expect(mp4Outputs).toContain('m4a')
  })

  it('keeps document transmutations asymmetric', () => {
    const csvOutputs = getAllowedOutputs('csv').map((output) => output.ext)
    const jsonOutputs = getAllowedOutputs('json').map((output) => output.ext)

    expect(csvOutputs).toContain('json')
    expect(jsonOutputs).not.toContain('csv')
  })

  it('normalizes extension checks for selected files', () => {
    expect(isAllowedInputExtension('.PNG')).toBe(true)
    expect(isAllowedInputExtension('mov')).toBe(true)
    expect(isAllowedInputExtension('exe')).toBe(false)
    expect(ALLOWED_INPUT_EXTENSIONS).toContain('pdf')
  })
})
