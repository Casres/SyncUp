/**
 * ExploreDetailScreen — venue/event detail view.
 *
 * Layout:
 *   Scrollable body:
 *     1. Hero image (full width, 260pt tall)
 *     2. Source badge (Eventbrite / Google / Featured)
 *     3. Venue name (h2)
 *     4. Category · Distance
 *     5. Rating (Google venues only)
 *     6. Event date or hours
 *     7. Address
 *     8. Description (full, no clamp)
 *     9. Spacer — clears the floating CTA
 *
 *   Floating CTA (always visible, does not scroll):
 *     "Create Event" pill pinned above the tab bar.
 *     On press:
 *       1. Seeds draftStore with venue name, description, location, geo.
 *       2. Navigates to CreateEventModal (Step1Screen will be pre-filled).
 *
 * Navigation chain from ExploreDetailScreen → CreateEventModal:
 *   ExploreDetailScreen is inside ExploreStack (NativeStack).
 *   ExploreStack is mounted as ExploreTab inside the Tab navigator.
 *   Tab navigator is mounted as "Tabs" inside RootStack.
 *   CreateEventModal is a sibling of "Tabs" in RootStack.
 *   So: navigation.getParent()?.getParent()?.navigate('CreateEventModal')
 *
 * Haptics: medium on "Create Event" press (R5-8, matches normal create flow).
 */
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { FlowHeader, PillBtn, Spinner } from '../../components';
import { colors, spacing, radii, typography, useHaptic } from '../../theme';
// radii used in styles below
import { useExploreVenueDetail } from '../../api';
import { updateDraft } from '../create/draftStore';
import type { ExploreDetailScreenProps } from '../../navigation/types';
import type { ExploreSource } from '../../../../TYPES';

// ─── Source badge labels ──────────────────────────────────────────────────────

const SOURCE_LABELS: Record<ExploreSource, string> = {
  eventbrite: 'Eventbrite',
  google:     'Google',
  featured:   'Featured',
};

// ─── Date formatter ───────────────────────────────────────────────────────────

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short',
      month:   'long',
      day:     'numeric',
      hour:    'numeric',
      minute:  '2-digit',
    });
  } catch {
    return iso;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExploreDetailScreen({
  navigation,
  route,
}: ExploreDetailScreenProps): React.JSX.Element {
  const T      = colors.light;
  const insets = useSafeAreaInsets();
  const fire   = useHaptic();

  const { venueId } = route.params;
  const { data: venue, isLoading, isError } = useExploreVenueDetail(venueId);

  /** Seeds the draft and opens the create flow. */
  const handleCreateEvent = (): void => {
    if (!venue) return;
    fire('medium');

    // Populate the draft with everything we know from the venue.
    // draftStore is always reset in Step1Screen.useEffect, so seeding
    // it here (before navigation) is the correct pattern.
    updateDraft({
      title:       venue.name,
      description: venue.description,
      location:    venue.address,
      geo:         venue.geo,
    });

    // Navigate two levels up: ExploreStack → Tabs → RootStack, then to modal.
    navigation.getParent()?.getParent()?.navigate('CreateEventModal' as never);
  };

  // ── Loading / error states ──────────────────────────────────────────────
  if (isLoading || !venue) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Spinner T={T} size="MD" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: T.ink }]}>Couldn't load this venue.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sourceLabel  = SOURCE_LABELS[venue.source as ExploreSource] ?? venue.source;
  const categoryLabel = venue.category !== 'all' ? venue.category.replace(/-/g, ' ') : '';
  const ctaBottom    = insets.bottom + spacing.mdl;

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <FlowHeader T={T} title="" onBack={() => navigation.goBack()} />

      {/* ── Scrollable body ─────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <View style={[styles.hero, { backgroundColor: T.bgSunken }]}>
          {venue.imageUrl ? (
            <Image
              source={{ uri: venue.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}
          {venue.isFeatured && (
            <View style={[styles.featuredOverlay, { backgroundColor: T.accent }]}>
              <Text style={[styles.featuredText, { color: T.bgElevated }]}>Featured</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Source pill */}
          <View style={[styles.sourcePill, { backgroundColor: T.accentSoft }]}>
            <Text style={[styles.sourceText, { color: T.accentInk, fontFamily: typography.overline.fontFamily }]}>
              {sourceLabel}
            </Text>
          </View>

          {/* Name */}
          <Text style={[styles.name, { color: T.ink, fontFamily: typography.h2.fontFamily }]}>
            {venue.name}
          </Text>

          {/* Category · Distance */}
          {(categoryLabel || venue.distanceMiles != null) && (
            <Text style={[styles.meta, { color: T.ink3, fontFamily: typography.body.fontFamily }]}>
              {[
                categoryLabel,
                venue.distanceMiles != null ? `${venue.distanceMiles.toFixed(1)} mi away` : null,
              ].filter(Boolean).join('  ·  ')}
            </Text>
          )}

          {/* Rating */}
          {venue.rating != null && (
            <Text style={[styles.rating, { color: T.availMaybe }]}>
              {'★'.repeat(Math.round(venue.rating))}
              <Text style={{ color: T.ink3 }}>
                {'  '}{venue.rating.toFixed(1)}
                {venue.ratingCount != null ? `  (${venue.ratingCount.toLocaleString()})` : ''}
              </Text>
            </Text>
          )}

          <View style={[styles.divider, { backgroundColor: T.hair }]} />

          {/* Date or hours */}
          {(venue.eventDate ?? venue.hours) && (
            <InfoRow
              T={T}
              icon={<ClockIcon color={T.ink3} />}
              text={venue.eventDate ? formatEventDate(venue.eventDate) : (venue.hours ?? '')}
            />
          )}

          {/* Address */}
          <InfoRow
            T={T}
            icon={<PinIcon color={T.ink3} />}
            text={venue.address}
          />

          <View style={[styles.divider, { backgroundColor: T.hair }]} />

          {/* Description */}
          <Text style={[styles.description, { color: T.ink2, fontFamily: typography.body.fontFamily }]}>
            {venue.description}
          </Text>
        </View>
      </ScrollView>

      {/* ── Floating CTA ───────────────────────────────────────────── */}
      <View
        style={[
          styles.ctaWrapper,
          {
            bottom:          ctaBottom,
            paddingHorizontal: spacing.lg,
          },
        ]}
        pointerEvents="box-none"
      >
        <PillBtn
          T={T}
          label="Create Event"
          variant="primary"
          size="lg"
          onPress={handleCreateEvent}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Info row helper ──────────────────────────────────────────────────────────

function InfoRow({
  T,
  icon,
  text,
}: {
  T: typeof colors.light;
  icon: React.ReactNode;
  text: string;
}): React.JSX.Element {
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.icon}>{icon}</View>
      <Text style={[infoStyles.text, { color: T.ink2, fontFamily: typography.body.fontFamily }]}>
        {text}
      </Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  icon: {
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
});

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

function ClockIcon({ color }: { color: string }): React.JSX.Element {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke={color} strokeWidth={2} />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function PinIcon({ color }: { color: string }): React.JSX.Element {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21C12 21 4 13.5 4 8.5a8 8 0 0116 0C20 13.5 12 21 12 21z" stroke={color} strokeWidth={2} />
      <Path d="M12 11a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: typography.body.fontSize,
  },
  scroll: {
    // paddingBottom set dynamically to clear floating CTA
  },
  hero: {
    width: '100%',
    height: 260,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill ?? 999,
  },
  featuredText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sourcePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill ?? 999,
  },
  sourceText: {
    fontSize: typography.overline.fontSize,
    fontWeight: typography.overline.fontWeight,
    letterSpacing: typography.overline.letterSpacing,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    letterSpacing: typography.h2.letterSpacing,
  },
  meta: {
    fontSize: typography.body.fontSize,
    letterSpacing: -0.1,
  },
  rating: {
    fontSize: 15,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  description: {
    fontSize: typography.body.fontSize,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  ctaWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
