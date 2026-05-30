/**
 * ProfileSettingsScreen — Profile and settings.
 *
 * SCREENS.md Profile & Settings layout (per ANCHOR):
 *  1. FlowHeader "Profile"
 *  2. Profile card: 72px RingAvatar + accent edit FAB + name (h2) + handle
 *     (mono ink3) + Edit pill + bio + 4-up StatTile row
 *  3. AVAILABILITY group: Availability editor / Broadcast settings
 *  4. ACCOUNT group: Email / Phone / Change password
 *  5. NOTIFICATIONS group: 6 toggles (one per NotificationSettings field)
 *  6. PRIVACY group: Who can find me / Who can invite me
 *  7. APPEARANCE group: ThemePicker (no onPress on row → renders <View>)
 *  8. SUPPORT group: Help & support
 *  9. Destructive Log out row (single-tap; OS confirm in prod per spec)
 * 10. Footer mono "SYNCUP · 2.2.0"
 *
 * Hard rules: Hard Rule 16 (SettingsRow renders <View> when no onPress —
 * Notification toggle rows have Toggle trailing and no onPress; ThemePicker
 * row has no onPress).
 *
 * Haptics: toggle flip → medium (fired by Toggle); ThemePicker change →
 * light (fired by ThemePicker); Log out → behaves as single-tap destructive.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import {
  ErrorState,
  FlowHeader,
  LoadingOverlay,
  Overline,
  PillBtn,
  RingAvatar,
  SettingsGroup,
  SettingsRow,
  StatTile,
  ThemePicker,
  Toggle,
} from '../../components';
import { colors, radii, spacing, typography, useHaptic } from '../../theme';
import {
  useBroadcastSettings,
  useMyProfile,
  useNotificationSettings,
  usePrivacySettings,
  useUpdateNotificationSettings,
  useUpdatePrivacySettings,
} from '../../api';
import type { ProfileSettingsScreenProps } from '../../navigation/types';
import type {
  NotificationSettings,
  ThemePreference,
} from '../../../../TYPES';

const NOTIF_LABELS: Array<{ key: keyof NotificationSettings; label: string; sub?: string }> = [
  { key: 'eventInvites',   label: 'Event invites' },
  { key: 'friendRequests', label: 'Friend requests' },
  { key: 'groupInvites',   label: 'Group invites' },
  { key: 'rsvps',          label: 'RSVPs',           sub: 'On your events' },
  { key: 'eventReminders', label: 'Event reminders' },
  { key: 'availBroadcasts',label: 'Avail broadcasts',sub: 'Friends sharing availability' },
];

export default function ProfileSettingsScreen({
  navigation,
}: ProfileSettingsScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();

  const { data: profile, isLoading, error, refetch } = useMyProfile();
  const { data: notifSettings } = useNotificationSettings();
  const { data: privacySettings } = usePrivacySettings();
  const { data: broadcastSettings } = useBroadcastSettings();

  const [theme, setTheme] = useState<ThemePreference>('system');
  const [notifs, setNotifs] = useState<NotificationSettings | null>(null);

  const updateNotifs = useUpdateNotificationSettings();
  const updatePrivacy = useUpdatePrivacySettings();

  useEffect(() => {
    if (notifSettings) setNotifs(notifSettings);
  }, [notifSettings]);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Profile" />
        <LoadingOverlay T={T} caption="LOADING ·" />
      </SafeAreaView>
    );
  }
  if (error || !profile) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
        <FlowHeader T={T} title="Profile" />
        <View style={styles.fill}>
          <ErrorState T={T} kind="server" onPrimary={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  const broadcastsActive = broadcastSettings
    ? Object.values(broadcastSettings).filter((r) => r.on).length
    : 0;

  const notifValue = notifs ?? notifSettings;
  const handleNotifFlip = (key: keyof NotificationSettings, next: boolean): void => {
    if (!notifValue) return;
    const updated: NotificationSettings = { ...notifValue, [key]: next };
    setNotifs(updated);
    updateNotifs.mutate(updated);
  };

  const handleLogOut = (): void => {
    fire('heavy');
    // OS-level confirm in production. Stub-phase: no-op.
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: T.bg }]}>
      <FlowHeader T={T} title="Profile" />

      <ScrollView contentContainerStyle={styles.body}>
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: T.bgElevated, borderColor: T.hair }]}>
          <View style={styles.avatarRow}>
            <View>
              <RingAvatar
                T={T}
                letter={profile.letter}
                size={72}
                status="free"
                photoUrl={profile.avatarUrl ?? null}
              />
              <View
                accessibilityElementsHidden
                style={[styles.editFab, { backgroundColor: T.accent, borderColor: T.bgElevated }]}
              >
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M3 21h4l11-11-4-4L3 17v4z"
                    stroke={T.bgElevated}
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            </View>
            <View style={styles.profileBody}>
              <Text style={[typography.h2, { color: T.ink }]} numberOfLines={1}>
                {profile.name}
              </Text>
              <Text style={[typography.micro, { color: T.ink3 }]} numberOfLines={1}>
                {profile.handle}
              </Text>
            </View>
            <PillBtn T={T} label="Edit" variant="ghost" size="sm" onPress={() => fire('light')} />
          </View>
          <Text style={[typography.caption, { color: T.ink2, fontSize: 13 }]}>{profile.bio}</Text>
          <View style={styles.statsRow}>
            <StatTile T={T} n={profile.stats.hosted} label="HOSTED" />
            <StatTile T={T} n={profile.stats.attended} label="ATTENDED" />
            <StatTile T={T} n={profile.stats.friends} label="FRIENDS" />
            <StatTile T={T} n={profile.stats.groups} label="GROUPS" />
          </View>
        </View>

        {/* AVAILABILITY */}
        <SettingsGroup T={T} label="AVAILABILITY">
          <SettingsRow
            T={T}
            label="Availability editor"
            onPress={() => navigation.navigate('AvailabilityEditor')}
          />
          <SettingsRow
            T={T}
            label="Broadcast settings"
            sub={`${broadcastsActive} of 3 active`}
            onPress={() => navigation.navigate('BroadcastSettings')}
            last
          />
        </SettingsGroup>

        {/* ACCOUNT */}
        <SettingsGroup T={T} label="ACCOUNT">
          <SettingsRow T={T} label="Email" sub={profile.email} onPress={() => fire('light')} />
          <SettingsRow T={T} label="Phone" sub={profile.phone} onPress={() => fire('light')} />
          <SettingsRow T={T} label="Change password" onPress={() => fire('light')} last />
        </SettingsGroup>

        {/* NOTIFICATIONS — Hard Rule 16: rows have Toggle trailing, no onPress → <View> */}
        <SettingsGroup T={T} label="NOTIFICATIONS">
          {NOTIF_LABELS.map((row, i) => {
            const isLast = i === NOTIF_LABELS.length - 1;
            return (
              <SettingsRow
                key={row.key}
                T={T}
                label={row.label}
                sub={row.sub}
                trailing={
                  <Toggle
                    T={T}
                    value={notifValue?.[row.key] ?? false}
                    onChange={(v) => handleNotifFlip(row.key, v)}
                  />
                }
                last={isLast}
              />
            );
          })}
        </SettingsGroup>

        {/* PRIVACY */}
        <SettingsGroup T={T} label="PRIVACY">
          <SettingsRow
            T={T}
            label="Who can find me"
            sub={privacySettings?.findableBy ?? 'friends-of-friends'}
            onPress={() => {
              if (!privacySettings) return;
              fire('medium');
              const next = privacySettings.findableBy === 'everyone' ? 'friends-of-friends' : 'everyone';
              updatePrivacy.mutate({ ...privacySettings, findableBy: next });
            }}
          />
          <SettingsRow
            T={T}
            label="Who can invite me"
            sub={privacySettings?.invitableBy ?? 'friends'}
            onPress={() => {
              if (!privacySettings) return;
              fire('medium');
              const next = privacySettings.invitableBy === 'everyone' ? 'friends' : 'everyone';
              updatePrivacy.mutate({ ...privacySettings, invitableBy: next });
            }}
            last
          />
        </SettingsGroup>

        {/* APPEARANCE — ThemePicker inset; row has no onPress → renders <View> (Hard Rule 16) */}
        <SettingsGroup T={T} label="APPEARANCE">
          <SettingsRow
            T={T}
            label="Theme"
            trailing={null}
            last
          />
          <View style={styles.themeWrap}>
            <ThemePicker T={T} value={theme} onChange={setTheme} />
          </View>
        </SettingsGroup>

        {/* SUPPORT */}
        <SettingsGroup T={T} label="SUPPORT">
          <SettingsRow
            T={T}
            label="Help & support"
            onPress={() => fire('light')}
            last
          />
        </SettingsGroup>

        {/* Destructive Log out — single-tap; OS confirm in prod per spec */}
        <SettingsGroup T={T}>
          <SettingsRow
            T={T}
            label="Log out"
            destructive
            onPress={handleLogOut}
            last
          />
        </SettingsGroup>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Overline T={T} color="ink3">SYNCUP · 2.2.0</Overline>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  body: {
    padding: spacing.mdl,
    gap: spacing.lg,
    paddingBottom: spacing['4xl'] * 2,
  },
  profileCard: {
    padding: spacing.lg,
    borderRadius: radii.hero,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  editFab: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  themeWrap: {
    padding: spacing.mdl,
  },
  footerRow: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
});

