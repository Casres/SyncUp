/**
 * BroadcastSettingsScreen — 3-card stacked broadcast IA (Hard Rule 12 LOCKED).
 *
 * SCREENS.md Broadcast Settings layout:
 *  1. FlowHeader "Broadcasts"
 *  2. Header overline + explainer: "BROADCASTS · N ACTIVE" + 14/ink2 explainer
 *  3. Three stacked cards (radius 16) — one per state (Free / Maybe / Busy):
 *     - OFF: state dot + state title overline + 12/ink3 body + Toggle
 *     - ON (springs open with flow-fade-up):
 *       - SEND TO + AudienceSwitcher
 *       - When audience !== 'everyone': sheet preview row → AudiencePickerSheet
 *       - "Preview toast" pill → fires BroadcastToast
 *  4. Footnote
 *
 * Hard rules: Hard Rule 12 (3-card stacked LOCKED), Hard Rule 13 (BroadcastToast
 * leading marker = state-colored dot), R5-1 (subtitle pairs dot + text).
 *
 * Local state pattern: localSettings holds an editable copy; flush to API
 * via useUpdateBroadcastSettings on change. Toggle haptic fired by Toggle.
 *
 * Edge cases: long audience-targets label → 1-line ellipsis on preview row.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AvailDot,
  AudienceSwitcher,
  BroadcastToast,
  ErrorState,
  FlowHeader,
  LoadingOverlay,
  Overline,
  TOAST_POSITION_DEFAULTS,
  Toggle,
} from '../../components';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import {
  useBroadcastSettings,
  useFriends,
  useFriendTypes,
  useUpdateBroadcastSettings,
} from '../../api';
import type { BroadcastSettingsScreenProps } from '../../navigation/types';
import type {
  AudienceMode,
  AvailState,
  BroadcastRule,
  BroadcastSettings,
  Friend,
  FriendType,
} from '../../../../TYPES';

const STATE_ORDER: Array<{ key: AvailState; title: string; body: string }> = [
  { key: 'free',  title: 'FREE',  body: 'Let the audience know you are free.' },
  { key: 'maybe', title: 'MAYBE', body: 'Soft signal — open if plans line up.' },
  { key: 'busy',  title: 'BUSY',  body: 'Heads-up — likely unavailable.' },
];

export default function BroadcastSettingsScreen({
  navigation,
}: BroadcastSettingsScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();

  const { data: serverSettings, isLoading, error, refetch } = useBroadcastSettings();
  const update = useUpdateBroadcastSettings();
  const { data: friendTypes = [] } = useFriendTypes();
  const { data: friends = [] } = useFriends();

  const [local, setLocal] = useState<BroadcastSettings | null>(null);
  const [toastState, setToastState] = useState<AvailState | null>(null);

  useEffect(() => {
    if (serverSettings) setLocal(serverSettings);
  }, [serverSettings]);

  if (isLoading || !local) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Broadcasts" onBack={() => navigation.goBack()} />
        <LoadingOverlay T={T} caption="LOADING ·" />
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Broadcasts" onBack={() => navigation.goBack()} />
        <View style={styles.fill}>
          <ErrorState T={T} kind="server" onPrimary={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  const activeCount = (Object.values(local) as BroadcastRule[]).filter((r) => r.on).length;

  const writeRule = (key: AvailState, patch: Partial<BroadcastRule>): void => {
    const updated: BroadcastSettings = {
      ...local,
      [key]: { ...local[key], ...patch },
    };
    setLocal(updated);
    update.mutate(updated);
  };

  const previewToast = (key: AvailState): void => {
    fire('medium');
    setToastState(key);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader T={T} title="Broadcasts" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.headerCol}>
          <Overline T={T} color="ink2">{`BROADCASTS · ${activeCount} ACTIVE`}</Overline>
          <Text style={[typography.body, { color: T.ink2, fontSize: 14 }]}>
            Send a one-tap status to a chosen audience whenever your availability changes.
          </Text>
        </View>

        {STATE_ORDER.map(({ key, title, body }) => {
          const rule = local[key];
          return (
            <BroadcastCard
              key={key}
              T={T}
              state={key}
              title={title}
              body={body}
              rule={rule}
              friendTypes={friendTypes}
              friends={friends}
              onToggle={(v) => writeRule(key, { on: v })}
              onAudienceChange={(audience) =>
                writeRule(key, {
                  audience,
                  // Reset targets when leaving 'everyone'/changing mode.
                  targets: audience === 'everyone' ? [] : rule.targets,
                })
              }
              onOpenPicker={() => {
                if (rule.audience === 'everyone') return;
                navigation.navigate('AudiencePickerSheet', {
                  mode: rule.audience === 'types' ? 'types' : 'friends',
                  selected: rule.targets,
                  ruleState: key,
                  onConfirm: (selected) => {
                    writeRule(key, { targets: selected });
                  },
                });
              }}
              onPreview={() => previewToast(key)}
            />
          );
        })}

        <Text style={[typography.caption, { color: T.ink3, fontSize: 12 }]}>
          Broadcasts send once per status change, with a 60-second undo toast.
          Edit anytime.
        </Text>
      </ScrollView>

      <View pointerEvents="box-none" style={TOAST_POSITION_DEFAULTS}>
        <BroadcastToast
          T={T}
          visible={toastState !== null}
          status={toastState ?? 'free'}
          audienceLabel={
            toastState ? audienceLabel(local[toastState], friendTypes, friends) : ''
          }
          onUndo={() => setToastState(null)}
          onDismiss={() => setToastState(null)}
        />
      </View>
    </SafeAreaView>
  );
}

interface BroadcastCardProps {
  T: typeof colors.light;
  state: AvailState;
  title: string;
  body: string;
  rule: BroadcastRule;
  friendTypes: FriendType[];
  friends: Friend[];
  onToggle: (v: boolean) => void;
  onAudienceChange: (m: AudienceMode) => void;
  onOpenPicker: () => void;
  onPreview: () => void;
}

function BroadcastCard({
  T,
  state,
  title,
  body,
  rule,
  friendTypes,
  friends,
  onToggle,
  onAudienceChange,
  onOpenPicker,
  onPreview,
}: BroadcastCardProps): React.JSX.Element {
  return (
    <View
      style={[
        cardStyles.root,
        { backgroundColor: T.bgElevated, borderColor: T.hair },
      ]}
    >
      <View style={cardStyles.head}>
        <AvailDot T={T} status={state} />
        <View style={cardStyles.headBody}>
          <Overline T={T} color="ink2">{title}</Overline>
          <Text style={[typography.caption, { color: T.ink3, fontSize: 12 }]} numberOfLines={2}>
            {body}
          </Text>
        </View>
        <Toggle T={T} value={rule.on} onChange={onToggle} accessibilityLabel={`${title} broadcast`} />
      </View>

      {rule.on ? (
        <View style={cardStyles.expanded}>
          <Overline T={T} color="ink2">SEND TO</Overline>
          <AudienceSwitcher T={T} value={rule.audience} onChange={onAudienceChange} />

          {rule.audience !== 'everyone' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit audience"
              onPress={onOpenPicker}
              style={({ pressed }) => [
                cardStyles.previewRow,
                { backgroundColor: T.bgSunken, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text
                style={[typography.caption, { color: T.ink, fontWeight: '600' }]}
                numberOfLines={1}
              >
                {audienceLabel(rule, friendTypes, friends)}
              </Text>
              <Text style={[typography.caption, { color: T.ink2 }]}>Tap to edit</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Preview toast"
            onPress={onPreview}
            style={({ pressed }) => [
              cardStyles.previewBtn,
              { borderColor: T.hair, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[typography.caption, { color: T.ink2, fontWeight: '700', fontSize: 11 }]}>
              Preview toast
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function audienceLabel(
  rule: BroadcastRule,
  friendTypes: FriendType[],
  friends: Friend[],
): string {
  if (rule.audience === 'everyone') return 'Everyone';
  if (rule.targets.length === 0) {
    return rule.audience === 'types' ? 'No types selected' : 'No friends selected';
  }
  if (rule.audience === 'types') {
    return rule.targets
      .map((id) => friendTypes.find((t) => t.id === id)?.label ?? id)
      .join(', ');
  }
  return rule.targets
    .map((id) => friends.find((f) => f.id === id)?.name ?? id)
    .join(', ');
}

const cardStyles = StyleSheet.create({
  root: {
    padding: spacing.mdl,
    borderRadius: radii.hero,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  expanded: {
    gap: spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.input,
  },
  previewBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  body: {
    padding: spacing.mdl,
    gap: spacing.md,
    paddingBottom: spacing['4xl'] * 2,
  },
  headerCol: {
    gap: spacing.xs,
  },
});
