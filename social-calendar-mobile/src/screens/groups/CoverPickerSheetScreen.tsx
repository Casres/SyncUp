/**
 * CoverPickerSheetScreen — Modal sheet for picking group cover art.
 *
 * SCREENS.md Cover Picker layout:
 *  1. 38×4 grab handle + sheet header "Choose cover" (h3)
 *  2. Grid of CoverArt tiles (selectable)
 *  3. Footer "Done" PillBtn primary
 *
 * Stub implementation: a small bundled catalog of placeholder Cover entries.
 * Real bundled artwork would come via a sprite or asset map (deferred per
 * Component Library handoff item #1 — Hard Rule 3 forbids generic gradients).
 *
 * Haptics: tile select → light; Done → medium; cover saved → success.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoverArt, FlowHeader, Overline, PillBtn } from '../../components';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import type { CoverPickerSheetScreenProps } from '../../navigation/types';
import type { Cover } from '../../../../TYPES';

const CATALOG: Cover[] = [
  { id: 'cover-weekend', label: 'Sunset stripes', art: 'covers/weekend-sunset.svg' },
  { id: 'cover-book',    label: 'Library spine',  art: 'covers/book-spine.svg' },
  { id: 'cover-trail',   label: 'Trail stripes',  art: 'covers/trail.svg' },
  { id: 'cover-dinner',  label: 'Dinner table',   art: 'covers/dinner.svg' },
  { id: 'cover-coffee',  label: 'Steamy mug',     art: 'covers/coffee.svg' },
  { id: 'cover-bike',    label: 'Spokes',         art: 'covers/bike.svg' },
];

export default function CoverPickerSheetScreen({
  navigation,
  route,
}: CoverPickerSheetScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const [selectedId, setSelectedId] = useState<string | undefined>(
    route.params?.selectedCoverId
  );

  const handleDone = (): void => {
    fire('medium');
    if (selectedId) fire('success');
    navigation.goBack();
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader T={T} title="Choose cover" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.body}>
        <Overline T={T} color="ink2">CATALOG</Overline>
        <View style={styles.grid}>
          {CATALOG.map((cover) => {
            const active = cover.id === selectedId;
            return (
              <Pressable
                key={cover.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${cover.label} cover`}
                onPress={() => {
                  fire('light');
                  setSelectedId(cover.id);
                }}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    backgroundColor: T.bgElevated,
                    borderColor: active ? T.accent : T.hair,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <CoverArt T={T} cover={cover} size={80} />
                <Text
                  style={[typography.caption, { color: T.ink2 }]}
                  numberOfLines={1}
                >
                  {cover.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.ctaRow, { backgroundColor: T.bgElevated, borderTopColor: T.hair }]}>
        <PillBtn
          T={T}
          label="Done"
          variant="primary"
          size="lg"
          onPress={handleDone}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    padding: spacing.mdl,
    gap: spacing.md,
    paddingBottom: spacing['4xl'] * 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  tile: {
    width: 110,
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  ctaRow: {
    padding: spacing.mdl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
