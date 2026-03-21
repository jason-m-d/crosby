'use client'

import { useState, useCallback } from 'react'
import { CardTrack } from '@/components/card-track'
import { ActionItemDataCard } from '@/components/action-item-data-card'
import { SuggestedActions } from '@/components/suggested-actions'
import type { CardTrackEvent, SuggestedAction } from '@/lib/types'

interface CardTrackGroupProps {
  tracks: CardTrackEvent[]
  onSendMessage: (text: string) => void
}

export function CardTrackGroup({ tracks, onSendMessage }: CardTrackGroupProps) {
  const [handledIds, setHandledIds] = useState<Set<string>>(new Set())

  const handleItemHandled = useCallback((itemId: string) => {
    setHandledIds(prev => new Set(prev).add(itemId))
  }, [])

  // Sort tracks by section priority
  const sortedTracks = [...tracks].sort((a, b) => a.section_priority - b.section_priority)

  // Collect all suggested actions from all tracks
  const allSuggestedActions: SuggestedAction[] = sortedTracks
    .flatMap(t => t.suggested_actions || [])

  return (
    <div>
      {sortedTracks.map(track => {
        const visibleItems = track.items.filter(i => !handledIds.has(i.id))
        if (visibleItems.length === 0) return null

        return (
          <CardTrack
            key={track.track_id}
            label={track.section_label}
            count={visibleItems.length}
          >
            {visibleItems.map(item => {
              if (item.type === 'action_item') {
                return (
                  <ActionItemDataCard
                    key={item.id}
                    item={item.data}
                    onHandled={handleItemHandled}
                  />
                )
              }
              return null
            })}
          </CardTrack>
        )
      })}

      {allSuggestedActions.length > 0 && (
        <SuggestedActions
          actions={allSuggestedActions}
          onSendMessage={onSendMessage}
        />
      )}
    </div>
  )
}
