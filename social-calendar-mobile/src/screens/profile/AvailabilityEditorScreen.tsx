/**
 * AvailabilityEditorScreen — Flow 6 (Availability Editor).
 *
 * SCREENS.md / ANCHOR §"02 Availability Editor" + Decision #6 (Locked
 * 2026-05-04 — Option C, Inline collapse). Calendar is the primary surface;
 * broadcast rules tuck under it and expand on tap.
 *
 * Layout (per ANCHOR + Decision #6 Option C):
 *   1. FlowHeader "Availability"
 *   2. Mode tabs (Month / Week / Day) via TabPills
 *   3. Optional onboarding hint card (accentSoft, dismissible — ephemeral, no
 *      persistence in scope)
 *   4. BrushPicker row
 *   5. Body: MonthGrid | WeekView | DayView (per mode)
 *   6. QUICK-SET overline + QuicksetGrid
 *   7. INLINE COLLAPSE — "Broadcast rules" toggle row (chevron + state-overline
 *      header). Tap → animated flow-fade-up 320ms expand showing 3 stacked
 *      preview cards (FREE / MAYBE / BUSY) + "Manage" PillBtn → BroadcastSettings.
 *   8. Empty state when avail map is empty: <EmptyAvailability />
 *
 * Hard rules:
 *   - HR-14 (delete-on-clear): `setDay(iso, next)` parent mapper deletes the
 *     key when `next === null`. NEVER persists null.
 *   - HR-12 (3-card stacked broadcast IA): preview section iterates the
 *     canonical STATE_ORDER (free / maybe / busy) — read-only summaries here;
 *     full edit lives at BroadcastSettings.
 *   - R5-1 (paired dot + label): every broadcast preview row + brush option
 *     pairs an AvailDot with a text label.
 *   - R5-2 (Spinner only): LoadingOverlay on initial fetch — no skeletons.
 *
 * Haptic ownership:
 *   - MonthGrid fires `light` on each cell entered + `heavy` on no-op repaint.
 *     Parent does NOT fire on cell enter.
 *   - QuicksetGrid fires `medium` (apply) + `success` (confirm). Parent does
 *     NOT fire on Quickset apply.
 *   - BroadcastToast (rendered by BroadcastSettings, not here) fires no
 *     haptic itself — N/A on this screen.
 *   - Parent fires `light` on broadcast-section toggle and `light` on Manage
 *     PillBtn tap. Mode tabs `light` is fired internally by TabPills.
 *
 * Edge cases:
 *   - Drag outside the grid: handled inside MonthGrid (PanResponder release).
 *   - Mode switch resets `dragging` (preserves `brush`).
 *   - Empty map → EmptyAvailability with "Set today" CTA wiring to setDay.
 *
 * Deferrals (non-blockers, recorded in SCREENS_HANDOFF.md):
 *   - Onboarding hint dismissal is ephemeral useState only (no persistence).
 *   - The 38px broadcast shortcut button described in ANCHOR §02 is replaced
 *     by the inline collapse pattern per Decision #6 Option C.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing as RNEasing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import {
  AvailDot,
  BrushPicker,
  BUILTIN_QUICKSETS,
  DayView,
  EmptyAvailability,
  ErrorState,
  FlowHeader,
  LoadingOverlay,
  MonthGrid,
  Overline,
  PillBtn,
  QuicksetGrid,
  QuicksetNameSheet,
  TabPills,
  WeekView,
  type TabPillsTab,
} from '../../components';
import { colors, durations, radii, spacing, typography, useHaptic } from '../../theme';
import {
  useBroadcastSettings,
  useMyAvailability,
  useUpdateAvailability,
} from '../../api';
import { MOCK_FRIENDS, MOCK_FRIEND_TYPES } from '../../mocks';
import type { AvailabilityEditorScreenProps } from '../../navigation/types';
import type {
  AvailState,
  AvailabilityBrush,
  AvailabilityEntry,
  BroadcastRule,
  BroadcastSettings,
  Quickset,
} from '../../../../TYPES';

// ────────────────────────────────────────────────────────────────────────────
// R7-1 / R12-2 — Quicksets are USER-EXTENSIBLE. The 4 built-in presets come
// from `BUILTIN_QUICKSETS` (frozen, non-deletable). User-saved customs are
// kept in a local state slice and spread after the built-ins. The grid is
// NEVER fixed-length-4 internally — `QuicksetGrid` iterates whatever array
// we hand it (R12-3 — wraps via flexWrap for any count).
// ────────────────────────────────────────────────────────────────────────────

// State order for the inline broadcast preview section (Hard Rule 12).
const BROADCAST_STATE_ORDER: Array<{
  key: AvailState;
  title: string;
  body: string;
}> = [
  { key: 'free',  title: 'FREE',  body: 'Let the audience know you are free.' },
  { key: 'maybe', title: 'MAYBE', body: 'Soft signal — open if plans line up.' },
  { key: 'busy',  title: 'BUSY',  body: 'Heads-up — likely unavailable.' },
];

const MODE_TABS: TabPillsTab[] = [
  { id: 'month', label: 'Month' },
  { id: 'week',  label: 'Week'  },
  { id: 'day',   label: 'Day'   },
];

type ModeId = 'month' | 'week' | 'day';

export default function AvailabilityEditorScreen({
  navigation,
}: AvailabilityEditorScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();

  // ── Server data ────────────────────────────────────────────────────────
  const { data: avail, isLoading, error, refetch } = useMyAvailability();
  const { data: broadcastSettings } = useBroadcastSettings();
  const updateAvail = useUpdateAvailability();

  // ── Ephemeral UI state ─────────────────────────────────────────────────
  const [mode, setMode] = useState<ModeId>('month');
  const [brush, setBrush] = useState<AvailabilityBrush>('free');
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [dragging, setDragging] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [broadcastsExpanded, setBroadcastsExpanded] = useState(false);

  // R12-2 / R12-4 — custom quicksets + naming sheet state.
  const [customQuicksets, setCustomQuicksets] = useState<Quickset[]>([]);
  const [nameSheetOpen, setNameSheetOpen] = useState(false);
  const [nameSheetMode, setNameSheetMode] = useState<'new' | 'rename'>('new');
  const [renamingQuickset, setRenamingQuickset] = useState<Quickset | null>(null);

  const allQuicksets: Quickset[] = [...BUILTIN_QUICKSETS, ...customQuicksets];

  // Reset transient drag state on mode change (preserves brush).
  useEffect(() => {
    setDragging(false);
  }, [mode]);

  // ── Inline-collapse animation (320ms flow-fade-up per Anchor) ──────────
  const expandAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // RN's `Animated.timing` `easing` is `(t: number) => number`. The theme's
    // `easings` table is keyed for Reanimated; for the RN driver we use the
    // bundled `Easing.out(Easing.cubic)` which is the closest match to the
    // standard `easeStd` curve.
    Animated.timing(expandAnim, {
      toValue: broadcastsExpanded ? 1 : 0,
      duration: durations.broadcastCardOpen,
      easing: RNEasing.out(RNEasing.cubic),
      useNativeDriver: true,
    }).start();
  }, [broadcastsExpanded, expandAnim]);

  // ── Loading / error gates ──────────────────────────────────────────────
  if (isLoading || !avail) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Availability" onBack={() => navigation.goBack()} />
        <LoadingOverlay T={T} caption="LOADING ·" />
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Availability" onBack={() => navigation.goBack()} />
        <View style={styles.fill}>
          <ErrorState T={T} kind="network" onPrimary={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Hard Rule 14 — delete-on-clear setDay mapper ──────────────────────
  // The brush 'clear' translates to `null`; the parent mapper deletes the
  // key entirely instead of persisting `null`.
  const setDay = (iso: string): void => {
    const next: AvailState | null = brush === 'clear' ? null : brush;
    const updated: AvailabilityEntry = { ...avail };
    if (next === null) {
      delete updated[iso];
    } else {
      updated[iso] = next;
    }
    updateAvail.mutate(updated);
  };

  // DayView calls this when the user picks one of its 4 explicit options;
  // bypasses the brush so 'Clear' from DayView always deletes regardless of
  // the active BrushPicker selection.
  const setDayExplicit = (iso: string, choice: 'free' | 'maybe' | 'busy' | 'clear'): void => {
    const next: AvailState | null = choice === 'clear' ? null : choice;
    const updated: AvailabilityEntry = { ...avail };
    if (next === null) {
      delete updated[iso];
    } else {
      updated[iso] = next;
    }
    updateAvail.mutate(updated);
  };

  const handleQuicksetApply = (q: Quickset): void => {
    // Hard Rule 15 — quicksets are pure functions over the AvailabilityEntry
    // map, scoped to sensible windows. QuicksetGrid fires medium + success
    // internally; parent ONLY merges the patch.
    const patch = computeQuicksetPatch(avail, q, new Date());
    updateAvail.mutate(patch);
  };

  const handleSetTodayFromEmpty = (): void => {
    const todayIso = isoOf(new Date());
    const updated: AvailabilityEntry = { ...avail, [todayIso]: 'free' };
    updateAvail.mutate(updated);
  };

  const isEmpty = Object.keys(avail).length === 0;

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader T={T} title="Availability" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.body}
        scrollEnabled={!dragging}
      >
        {/* 2 — Mode tabs */}
        <View style={styles.tabsWrap}>
          <TabPills
            T={T}
            tabs={MODE_TABS}
            value={mode}
            onChange={(next) => setMode(next as ModeId)}
          />
        </View>

        {/* 3 — Onboarding hint card (ephemeral, dismissible) */}
        {!hintDismissed ? (
          <View
            accessibilityRole="text"
            style={[
              styles.hintCard,
              { backgroundColor: T.accentSoft, borderColor: T.accent },
            ]}
          >
            <View style={styles.hintBody}>
              <Overline T={T} color="accentInk">TIP</Overline>
              <Text style={[typography.caption, { color: T.ink, fontSize: 13 }]}>
                Pick a brush, then tap or drag across days to paint your
                availability.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss tip"
              hitSlop={10}
              onPress={() => {
                fire('light');
                setHintDismissed(true);
              }}
              style={({ pressed }) => [styles.hintDismiss, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 6l12 12M6 18L18 6"
                  stroke={T.accentInk}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </Pressable>
          </View>
        ) : null}

        {/* 4 — Brush row */}
        <BrushPicker T={T} value={brush} onChange={setBrush} />

        {/* 5 — Body per mode */}
        <View style={styles.bodyCard}>
          {mode === 'month' ? (
            <MonthGrid
              T={T}
              anchor={anchor}
              setAnchor={setAnchor}
              avail={avail}
              brush={brush}
              setDay={setDay}
              dragging={dragging}
              setDragging={setDragging}
            />
          ) : null}
          {mode === 'week' ? (
            <WeekView
              T={T}
              anchor={anchor}
              avail={avail}
              brush={brush}
              setDay={setDay}
            />
          ) : null}
          {mode === 'day' ? (
            <DayView
              T={T}
              anchor={anchor}
              setAnchor={setAnchor}
              avail={avail}
              setDay={(iso) => {
                // DayView pairs setDay with onChoose; the explicit variant
                // routes through setDayExplicit so 'Clear' always wipes
                // regardless of the active BrushPicker.
                // setDay here is a fallback — the real choice arrives via
                // onChoose below.
                void iso;
              }}
              onChoose={(choice) => {
                const iso = isoOf(anchor);
                setDayExplicit(iso, choice);
              }}
            />
          ) : null}
        </View>

        {/* 6 — Quickset section */}
        <View style={styles.section}>
          <Overline T={T}>QUICK-SET</Overline>
          <QuicksetGrid
            T={T}
            quicksets={allQuicksets}
            onApply={handleQuicksetApply}
            onRename={(q) => {
              setRenamingQuickset(q);
              setNameSheetMode('rename');
              setNameSheetOpen(true);
            }}
            onDelete={(id) => {
              setCustomQuicksets((prev) => prev.filter((q) => q.id !== id));
            }}
          />
          {/* R12-2 — Save as Quickset entry point. Enabled only when the
              availability map has at least one day set. */}
          <View style={styles.saveQuicksetWrap}>
            <PillBtn
              T={T}
              label="Save as Quickset"
              variant="ghost"
              size="md"
              disabled={isEmpty}
              onPress={() => {
                fire('medium');
                setRenamingQuickset(null);
                setNameSheetMode('new');
                setNameSheetOpen(true);
              }}
            />
          </View>
        </View>

        {/* 7 — INLINE COLLAPSE: Broadcast rules preview (Decision #6 Option C) */}
        <View style={styles.section}>
          <BroadcastInlineCollapse
            T={T}
            expanded={broadcastsExpanded}
            settings={broadcastSettings}
            expandAnim={expandAnim}
            onToggle={() => {
              fire('light');
              setBroadcastsExpanded((v) => !v);
            }}
            onManage={() => {
              fire('light');
              navigation.navigate('BroadcastSettings');
            }}
          />
        </View>

        {/* 8 — Empty state */}
        {isEmpty ? (
          <View style={styles.emptyWrap}>
            <EmptyAvailability T={T} onSetDay={handleSetTodayFromEmpty} />
          </View>
        ) : null}
      </ScrollView>

      {/* QuicksetNameSheet — mounted as a SafeAreaView sibling (outside the
          ScrollView) so it overlays the screen and not the scrolled content. */}
      <QuicksetNameSheet
        T={T}
        open={nameSheetOpen}
        mode={nameSheetMode}
        initialName={renamingQuickset?.label}
        existingNames={customQuicksets.map((q) => q.label)}
        onSave={(name) => {
          if (nameSheetMode === 'new') {
            const newQuickset: Quickset = {
              id: `custom-${Date.now()}`,
              label: name,
              detail: 'Custom quickset',
              status: 'free',
              isCustom: true,
            };
            setCustomQuicksets((prev) => [...prev, newQuickset]);
            fire('success');
          } else if (renamingQuickset !== null) {
            const idToRename = renamingQuickset.id;
            setCustomQuicksets((prev) =>
              prev.map((q) =>
                q.id === idToRename ? { ...q, label: name } : q,
              ),
            );
            fire('success');
          }
          setNameSheetOpen(false);
        }}
        onClose={() => setNameSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// BroadcastInlineCollapse — Decision #6 Option C
// Tappable header (chevron + state-overline) → animated expand reveals 3
// stacked preview cards (FREE / MAYBE / BUSY) + a Manage PillBtn that hands
// off to BroadcastSettings for full edit.
// ───────────────────────────────────────────────────────────────────────────
interface BroadcastInlineCollapseProps {
  T: typeof colors.light;
  expanded: boolean;
  settings: BroadcastSettings | undefined;
  expandAnim: Animated.Value;
  onToggle: () => void;
  onManage: () => void;
}

function BroadcastInlineCollapse({
  T,
  expanded,
  settings,
  expandAnim,
  onToggle,
  onManage,
}: BroadcastInlineCollapseProps): React.JSX.Element {
  const activeCount = settings
    ? (Object.values(settings) as BroadcastRule[]).filter((r) => r.on).length
    : 0;

  // flow-fade-up 320ms — translateY + opacity transform (RN Animated value
  // 0 → 1 over `durations.broadcastCardOpen` driven by parent useEffect).
  const translateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0],
  });

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Broadcast rules — ${activeCount} of 3 active`}
        accessibilityHint={expanded ? 'Tap to collapse' : 'Tap to expand'}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.collapseHeader,
          {
            backgroundColor: T.bgElevated,
            borderColor: T.hair,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.collapseHeaderBody}>
          <Overline T={T}>{`BROADCAST RULES · ${activeCount} OF 3 ACTIVE`}</Overline>
          <Text style={[typography.caption, { color: T.ink2, fontSize: 12 }]} numberOfLines={1}>
            {expanded ? 'Read-only preview · tap to collapse' : 'Tap to preview'}
          </Text>
        </View>
        <Chevron T={T} expanded={expanded} />
      </Pressable>

      {expanded ? (
        <Animated.View
          style={[
            styles.collapseBody,
            { opacity: expandAnim, transform: [{ translateY }] },
          ]}
        >
          {BROADCAST_STATE_ORDER.map(({ key, title, body }) => {
            const rule = settings?.[key];
            return (
              <PreviewCard
                key={key}
                T={T}
                state={key}
                title={title}
                body={body}
                rule={rule}
              />
            );
          })}
          <View style={styles.manageRow}>
            <PillBtn
              T={T}
              label="Manage broadcasts"
              variant="primary"
              size="sm"
              onPress={onManage}
            />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

interface PreviewCardProps {
  T: typeof colors.light;
  state: AvailState;
  title: string;
  body: string;
  rule: BroadcastRule | undefined;
}

function PreviewCard({ T, state, title, body, rule }: PreviewCardProps): React.JSX.Element {
  const summary = useMemo(() => formatSummary(rule), [rule]);
  const isOn = rule?.on ?? false;
  return (
    <View style={[styles.previewCard, { backgroundColor: T.bgElevated, borderColor: T.hair }]}>
      <View style={styles.previewHead}>
        <AvailDot T={T} status={state} />
        <View style={styles.previewHeadBody}>
          <Overline T={T} color="ink2">{title}</Overline>
          <Text style={[typography.caption, { color: T.ink3, fontSize: 12 }]} numberOfLines={2}>
            {body}
          </Text>
        </View>
        <View
          style={[
            styles.statePill,
            {
              backgroundColor: isOn ? T.accentSoft : T.bgSunken,
              borderColor: isOn ? T.accent : T.hair,
            },
          ]}
        >
          {/* R5-1 — paired dot + label, never color alone. */}
          <AvailDot T={T} status={isOn ? state : null} size={6} />
          <Text
            style={[
              typography.micro,
              {
                color: isOn ? T.accentInk : T.ink2,
                fontWeight: '700',
              },
            ]}
            numberOfLines={1}
          >
            {isOn ? 'ON' : 'OFF'}
          </Text>
        </View>
      </View>
      <Text
        style={[typography.caption, { color: T.ink2, fontSize: 12 }]}
        numberOfLines={1}
      >
        {`SEND TO · ${summary}`}
      </Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function Chevron({
  T,
  expanded,
}: {
  T: typeof colors.light;
  expanded: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.chevron}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path
          d={expanded ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}
          stroke={T.ink2}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Hard Rule 15 — Quicksets are pure functions over the AvailabilityEntry map,
 * scoped to sensible windows:
 *   - 'weekends-free'  : Sat + Sun · next 4 weeks
 *   - 'weekdays-5pm'   : Mon–Fri  · next 14 days
 *   - 'next30-maybe'   : every day · next 30 days
 *   - 'clear-month'    : delete every key in the current calendar month
 *
 * 'clear-month' deletes keys (Hard Rule 14: never persist null).
 */
function computeQuicksetPatch(
  current: AvailabilityEntry,
  q: Quickset,
  today: Date,
): AvailabilityEntry {
  const updated: AvailabilityEntry = { ...current };

  const writeOrClear = (iso: string): void => {
    if (q.status === null) {
      delete updated[iso];
    } else {
      updated[iso] = q.status;
    }
  };

  switch (q.id) {
    case 'weekends-free': {
      // Next 4 weeks of Sat + Sun.
      for (let i = 0; i < 28; i += 1) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dow = d.getDay();
        if (dow === 0 || dow === 6) writeOrClear(isoOf(d));
      }
      return updated;
    }
    case 'weekdays-5pm': {
      // Next 14 days, weekdays only.
      for (let i = 0; i < 14; i += 1) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dow = d.getDay();
        if (dow >= 1 && dow <= 5) writeOrClear(isoOf(d));
      }
      return updated;
    }
    case 'next30-maybe': {
      for (let i = 0; i < 30; i += 1) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        writeOrClear(isoOf(d));
      }
      return updated;
    }
    case 'clear-month': {
      // Delete every key in the current calendar month (Hard Rule 14 — keys
      // are removed, never set to null).
      const y = today.getFullYear();
      const m = today.getMonth();
      const prefix = `${y}-${String(m + 1).padStart(2, '0')}-`;
      for (const iso of Object.keys(updated)) {
        if (iso.startsWith(prefix)) delete updated[iso];
      }
      return updated;
    }
    default:
      return updated;
  }
}

function formatSummary(rule: BroadcastRule | undefined): string {
  if (!rule) return 'Off';
  if (!rule.on) return 'Off';
  if (rule.audience === 'everyone') return 'Everyone';
  if (rule.targets.length === 0) {
    return rule.audience === 'types' ? 'No types selected' : 'No friends selected';
  }
  if (rule.audience === 'types') {
    return rule.targets
      .map((id) => MOCK_FRIEND_TYPES.find((t) => t.id === id)?.label ?? id)
      .join(', ');
  }
  return rule.targets
    .map((id) => MOCK_FRIENDS.find((f) => f.id === id)?.name ?? id)
    .join(', ');
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  body: {
    padding: spacing.mdl,
    gap: spacing.lg,
    paddingBottom: spacing['4xl'] * 2,
  },
  tabsWrap: {
    alignItems: 'flex-start',
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.input,
    borderWidth: StyleSheet.hairlineWidth,
  },
  hintBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  hintDismiss: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyCard: {
    paddingVertical: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.mdl,
    paddingVertical: spacing.md,
    borderRadius: radii.input,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  collapseHeaderBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  collapseBody: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  chevron: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: {
    padding: spacing.mdl,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  previewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  previewHeadBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  manageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  emptyWrap: {
    paddingVertical: spacing.lg,
  },
  saveQuicksetWrap: {
    paddingTop: spacing.md,
  },
});
