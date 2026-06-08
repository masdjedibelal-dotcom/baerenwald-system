import 'server-only'

/** Für adirik/interior-design: niedriger = mehr Ist-Geometrie bleibt erhalten. */
export const VIZ_DEFAULT_PROMPT_STRENGTH = 0.58

export const VIZ_NEGATIVE_PROMPT =
  'changed room layout, moved walls, new windows or doors, extended partial tiles to full height, ' +
  'different room shape, extra walls, added fixtures, removed fixtures, wrong perspective, ' +
  'ugly, blurry, low quality, distorted, deformed'

const STRUCTURE_PREFIX =
  'Strict interior inpainting on the input photo: preserve exact room geometry, camera angle, ' +
  'openings, fixture positions and surface boundaries. Only change materials, colors, finishes and style on existing surfaces. '

export function buildRenderPrompt(userPrompt: string, istHinweis?: string | null): string {
  const core = userPrompt.trim()
  if (!core) return STRUCTURE_PREFIX

  const fix = istHinweis?.trim()
  if (fix) {
    return `${STRUCTURE_PREFIX}Must keep unchanged: ${fix}. Apply only: ${core}`
  }
  return `${STRUCTURE_PREFIX}${core}`
}
