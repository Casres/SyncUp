/**
 * ExploreScreen — main Explore feed.
 *
 * Layout:
 *   1. FlowHeader — "Explore" title (no right action)
 *   2. FilterBar  — horizontal category chips
 *   3. FlatList   — ExploreCard items, paginated, featured first
 *   4. Footer spinner while loading next page
 *   5. EmptyState when filter returns no results
 *
 * State:
 *   - activeCategory: local component state (never touches the network)
 *   - venue feed: useExploreVenues (React Query infinite, see api/explore.ts)
 *
 * Cost controls at a glance:
 *   - GPS defaults to (0, 0) if location is unavailable — no location
 *     permission required for MVP. In production, swap for expo-location.
 *   - The category filter switch happens client-side on cached data first;
 *     only a cache miss triggers a new network call.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExploreCard, FilterBar, FlowHeader, Spinner } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { useExploreVenues } from '../../api';
import type { ExploreCategory, ExploreVenue } from '../../../../TYPES';
import type { ExploreScreenProps } from '../../navigation/types';

// ─── Placeholder location ─────────────────────────────────────────────────────
// In production replace with expo-location getCurrentPositionAsync().
// Bucketing means a fallback of (0,0) simply means all users without location
// share one cache slot — no cost impact, just slightly less relevant distance.
const FALLBACK_LAT = 0;
const FALLBACK_LNG = 0;

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExploreScreen({ navigation }: ExploreScreenProps): React.JSX.Element {
  const T = colors.light;

  const [activeCategory, setActiveCategory] = useState<ExploreCategory>('all');

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
  } = useExploreVenues(activeCategory, FALLBACK_LAT, FALLBACK_LNG);

  // Flatten infinite-query pages into one list.
  const venues: ExploreVenue[] = data?.pages.flatMap((p) => p.venues) ?? [];

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: ExploreVenue }) => (
      <ExploreCard
        T={T}
        venue={item}
        onPress={() => navigation.navigate('ExploreDetail', { venueId: item.id })}
      />
    ),
    [T, navigation],
  );

  const keyExtractor = useCallback((item: ExploreVenue) => item.id, []);

  const ListEmptyComponent = (): React.JSX.Element | null => {
    if (isLoading) return null; // Spinner shown below instead
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyTitle, { color: T.ink, fontFamily: typography.h3.fontFamily }]}>
          Nothing here yet
        </Text>
        <Text style={[styles.emptyBody, { color: T.ink3, fontFamily: typography.body.fontFamily }]}>
          Try a different category or check back soon.
        </Text>
      </View>
    );
  };

  const ListFooterComponent = (): React.JSX.Element | null => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={T.accent} />
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader T={T} title="Explore" />

      <FilterBar T={T} active={activeCategory} onChange={setActiveCategory} />

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <Spinner T={T} size="MD" />
        </View>
      ) : isError ? (
        <View style={styles.loadingCenter}>
          <Text style={[styles.emptyTitle, { color: T.ink, fontFamily: typography.h3.fontFamily }]}>
            Couldn't load venues
          </Text>
          <Text style={[styles.emptyBody, { color: T.ink3, fontFamily: typography.body.fontFamily }]}>
            Check your connection and try again.
          </Text>
        </View>
      ) : (
        <FlatList
          data={venues}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={ListEmptyComponent}
          ListFooterComponent={ListFooterComponent}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  list: {
    paddingTop: spacing.sm,
    paddingBottom: spacing['4xl'],
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  empty: {
    paddingTop: spacing['4xl'] * 2,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: typography.body.fontSize,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
