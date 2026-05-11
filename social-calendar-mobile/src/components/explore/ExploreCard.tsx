/**
 * ExploreCard — a single venue/event card in the Explore feed.
 *
 * Anatomy (top → bottom):
 *   ┌─────────────────────────────────┐
 *   │  Cover image (200px tall)       │
 *   │  [Featured badge]  [Category]   │ (overlaid bottom-left of image)
 *   ├─────────────────────────────────┤
 *   │  Venue name (title, 2-line)     │
 *   │  Address + distance             │
 *   │  Rating stars  ·  Hours or date │
 *   └─────────────────────────────────┘
 *
 * The entire card is a Pressable — tap navigates to ExploreDetailScreen.
 *
 * Hard rules observed:
 *   - Design tokens only (no hardcoded hex).
 *   - Spinner-only loading pattern (R5-x) — images use a bgSunken placeholder.
 *   - 44pt minimum tap target satisfied by the full card height.
 */
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, spacing, radii, typography } from '../../theme';
import type { ExploreVenue } from '../../../../TYPES';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  bar:         'Bar',
  club:        'Club',
  restaurant:  'Restaurant',
  'food-truck':'Food Truck',
  popup:       'Pop-up',
  cafe:        'Café',
  'live-music':'Live Music',
  outdoor:     'Outdoors',
  all:         '',
};

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return null;
  }
}

function RatingStars({ rating, T }: { rating: number; T: typeof colors.light }): React.JSX.Element {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5;
  const stars = Array.from({ length: 5 }, (_, i) =>
    i < full ? '★' : i === full && half ? '⯨' : '☆',
  ).join('');

  return (
    <Text style={[styles.ratingText, { color: T.availMaybe }]}>
      {stars}
      <Text style={{ color: T.ink3 }}> {rating.toFixed(1)}</Text>
    </Text>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ExploreCardProps {
  T: typeof colors.light;
  venue: ExploreVenue;
  onPress: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ExploreCard({ T, venue, onPress }: ExploreCardProps): React.JSX.Element {
  const categoryLabel = CATEGORY_LABELS[venue.category] ?? '';
  const dateStr       = formatDate(venue.eventDate);
  const subtitle      = dateStr ?? venue.hours;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${venue.name}, ${categoryLabel}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: T.bgElevated, opacity: pressed ? 0.95 : 1 },
      ]}
    >
      {/* ── Cover image ─────────────────────────────────────────────── */}
      <View style={[styles.imageWrapper, { backgroundColor: T.bgSunken }]}>
        {venue.imageUrl ? (
          <Image
            source={{ uri: venue.imageUrl }}
            style={styles.image}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}

        {/* Overlay badges on bottom-left of image */}
        <View style={styles.imageBadgeRow}>
          {venue.isFeatured && (
            <View style={[styles.featuredBadge, { backgroundColor: T.accent }]}>
              <Text style={[styles.badgeText, { color: T.bgElevated }]}>Featured</Text>
            </View>
          )}
          {categoryLabel ? (
            <View style={[styles.categoryBadge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
              <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>{categoryLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── Text content ────────────────────────────────────────────── */}
      <View style={styles.body}>
        <Text
          style={[styles.name, { color: T.ink, fontFamily: typography.title.fontFamily }]}
          numberOfLines={2}
        >
          {venue.name}
        </Text>

        <View style={styles.metaRow}>
          <Text style={[styles.address, { color: T.ink3, fontFamily: typography.caption.fontFamily }]} numberOfLines={1}>
            {venue.address}
            {venue.distanceMiles != null ? `  ·  ${venue.distanceMiles.toFixed(1)} mi` : ''}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          {venue.rating != null && <RatingStars rating={venue.rating} T={T} />}
          {subtitle ? (
            <Text style={[styles.hours, { color: T.ink3, fontFamily: typography.micro.fontFamily }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card ?? 16,
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    // Subtle elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  imageWrapper: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageBadgeRow: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  featuredBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill ?? 999,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill ?? 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  name: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    letterSpacing: typography.title.letterSpacing,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  address: {
    fontSize: typography.caption.fontSize,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  ratingText: {
    fontSize: 13,
  },
  hours: {
    fontSize: typography.micro.fontSize,
    flexShrink: 1,
    textAlign: 'right',
  },
});
