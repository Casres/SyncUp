/**
 * Step1Screen — Create Event Flow / Basic info.
 *
 * SCREENS.md Step 1 layout:
 *  1. FlowHeader title "New event" + Cancel (X) on left
 *  2. ProgressBar (step 1 of 3)
 *  3. FormField — Event title
 *  4. FormField — Description (multiline)
 *  5. FormField — Location
 *  6. PriceSelector
 *  7. Footer "Next" pill
 *
 * State pattern:
 *  - draft state lives in `draftStore.ts` (transient, per prompt)
 *  - useDraft() subscribes; updateDraft() patches fields
 *
 * Hard rules: Hard Rule 2 (44pt hit), R5-6 (truncation downstream).
 *
 * Haptics: medium on Step 1 → Step 2 advance.
 */
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import {
  FlowHeader,
  FormField,
  Overline,
  PillBtn,
  PriceSelector,
  ProgressBar,
} from '../../components';
import { colors, radii, spacing, useHaptic } from '../../theme';
import type { Step1ScreenProps } from '../../navigation/types';
import { resetDraft, updateDraft, useDraft } from './draftStore';

export default function Step1Screen({
  navigation,
  route,
}: Step1ScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const draft = useDraft();

  // Reset the singleton draft once when the modal lands on Step 1, then
  // hydrate from any prefill params.
  //
  // Two prefill sources:
  //   1. Calendar/invite prefill (prefilledIso, prefilledInviteeIds) — existing.
  //   2. Explore prefill (prefilledTitle, prefilledDescription,
  //      prefilledLocation, prefilledGeo) — seeded by ExploreDetailScreen
  //      via updateDraft() BEFORE navigation, so the draft is already set
  //      when we arrive. We only apply param-based prefill here when params
  //      are present; draftStore retains the Explore values otherwise.
  useEffect(() => {
    const prefill = route.params;

    // If coming from Explore, draftStore was pre-seeded by ExploreDetailScreen.
    // Only reset if we have no Explore prefill (avoid clobbering it).
    const hasExplorePrefill =
      prefill?.prefilledTitle ||
      prefill?.prefilledDescription ||
      prefill?.prefilledLocation ||
      prefill?.prefilledGeo;

    if (!hasExplorePrefill) {
      resetDraft();
    }

    // Apply standard calendar/invite params if present.
    if (prefill?.prefilledIso || prefill?.prefilledInviteeIds) {
      updateDraft({
        eventIso:   prefill.prefilledIso,
        inviteeIds: prefill.prefilledInviteeIds ?? [],
      });
    }

    // Apply Explore venue params if present (fallback for param-based prefill).
    if (hasExplorePrefill) {
      updateDraft({
        title:       prefill?.prefilledTitle,
        description: prefill?.prefilledDescription,
        location:    prefill?.prefilledLocation,
        geo:         prefill?.prefilledGeo,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canAdvance = draft.title.trim().length > 0;

  const handleNext = (): void => {
    if (!canAdvance) return;
    fire('medium');
    navigation.navigate('Step2');
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader
        T={T}
        title="New event"
        right={<CloseBtn T={T} onPress={() => navigation.getParent()?.goBack()} />}
      />
      <ProgressBar T={T} step={1} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <FormField
          T={T}
          label="Event title"
          value={draft.title}
          onChange={(title) => updateDraft({ title })}
          placeholder="Rooftop Dinner"
        />

        <FormField
          T={T}
          label="Description"
          value={draft.description ?? ''}
          onChange={(description) => updateDraft({ description })}
          placeholder="What should people know?"
          multiline
        />

        <FormField
          T={T}
          label="Location"
          value={draft.location ?? ''}
          onChange={(location) => updateDraft({ location })}
          placeholder="Add an address"
        />

        <View style={styles.priceRow}>
          <Overline T={T} color="ink2">PRICE</Overline>
          <PriceSelector
            T={T}
            value={draft.price ?? 0}
            onChange={(price) => updateDraft({ price })}
          />
        </View>
      </ScrollView>

      <View style={[styles.ctaRow, { backgroundColor: T.bgElevated, borderTopColor: T.hair }]}>
        <PillBtn
          T={T}
          label="Next"
          variant="primary"
          size="lg"
          onPress={handleNext}
          disabled={!canAdvance}
        />
      </View>
    </SafeAreaView>
  );
}

interface CloseBtnProps { T: typeof colors.light; onPress: () => void }
function CloseBtn({ T, onPress }: CloseBtnProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cancel"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        closeStyles.btn,
        { backgroundColor: T.bgSunken, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6 6l12 12M18 6L6 18"
          stroke={T.ink}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    </Pressable>
  );
}

const closeStyles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    padding: spacing.mdl,
    gap: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  priceRow: {
    gap: spacing.sm,
  },
  ctaRow: {
    padding: spacing.mdl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
