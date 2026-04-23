import type { RemovedSegment } from '../../../shared/workflow'

export function formatRemovedSegments(segments: RemovedSegment[]): string {
  if (segments.length === 0) {
    return 'Nenhum trecho removido ainda.'
  }

  return segments
    .map((segment) => `#${segment.index} [${segment.start} - ${segment.end}] ${segment.text} (${segment.reason})`)
    .join('\n')
}
