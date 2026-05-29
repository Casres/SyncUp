/**
 * YoureInScreen — R15-12 — last pre-app beat.
 *
 * 96px RingAvatar + lime checkmark badge + "Go" CTA.
 * Avatar + badge animate in via flow-fade-up (320ms spring).
 * Reduced-motion fallback: 200ms easeOut translate, no overshoot.
 * No back arrow · no 6-dot indicator.
 * "Go" fires success haptic then hands off to main app shell via Clerk.
 */

import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { PillBtn } from '../../components/foundation/PillBtn';
import { RingAvatar } from '../../components/foundation/RingAvatar';
import { colors, durations, easings, radii, spacing, springs, useHaptic } from '../../theme';
import { useMyProfile, useUploadAvatar } from '../../api/profile';
import type { YoureInScreenProps } from '../../navigation/types';
import {
  clearSignupAvatarUri,
  getSignupAvatarUri,
} from './signupAvatarStore';

const TRANSLATE_START = 20;
const BADGE_SIZE = 24;
const BADGE_BORDER = 2;

export default function YoureInScreen({
  navigation: _navigation,
}: YoureInScreenProps): React.JSX.Element {
  const T = colors.light;
  const fire = useHaptic();
  const { data: me } = useMyProfile();
  const uploadAvatar = useUploadAvatar();
  const [reduceMotion, setReduceMotion] = useState(false);

  const firstName = me ? me.name.trim().split(/\s+/)[0] : '';

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(TRANSLATE_START);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      if (mounted) setReduceMotion(v);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = withTiming(1, { duration: 200, easing: easings.easeOut });
      translateY.value = withTiming(0, { duration: 200, easing: easings.easeOut });
    } else {
      opacity.value = withTiming(1, { duration: durations.toastFadeUp });
      translateY.value = withSpring(0, springs.spring);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const avatarStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  async function onGo() {
    fire('success');
    // TODO (real Clerk): setActive({ session }) hands off to RootNavigator,
    // which unmounts AuthNavigator and renders the main shell.
    // InviteContext routing (push EventDetail or HomeTab root) is wired here
    // once session management is fully integrated.

    // Now that the Clerk session is active, flush any avatar queued during
    // sign-up (SignUpStep5). Signed Cloudinary upload + PATCH /me avatarUrl.
    // Best-effort: a failed avatar upload must not block entering the app.
    const queuedUri = getSignupAvatarUri();
    if (queuedUri) {
      try {
        await uploadAvatar.mutateAsync(queuedUri);
      } catch {
        // Swallow — user can set a photo later from their profile.
      } finally {
        clearSignupAvatarUri();
      }
    }
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: T.bg }]}
      accessibilityRole="none"
    >
      {/* Avatar + badge */}
      <Animated.View style={[styles.avatarWrap, avatarStyle]}>
        <RingAvatar
          T={T}
          size={96}
          status={null}
          letter={me?.letter ?? '?'}
        />
        {/* Lime checkmark badge docked bottom-right of avatar */}
        <View
          style={[
            styles.badge,
            {
              backgroundColor: T.lime,
              borderRadius: radii.pill,
              borderColor: T.bg,
            },
          ]}
        >
          <Ionicons name="checkmark" size={14} color={T.bg} />
        </View>
      </Animated.View>

      <Text
        style={[styles.heading, { color: T.ink }]}
        accessibilityRole="header"
      >
        {`You're in, ${firstName}.`}
      </Text>
      <Text style={[styles.sub, { color: T.ink2 }]}>
        Now go plan something.
      </Text>

      <View style={{ flex: 1 }} />

      <View style={styles.ctas}>
        <PillBtn
          T={T}
          label="Go"
          variant="primary"
          size="lg"
          onPress={onGo}
          accessibilityLabel="Go to SyncUp"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  avatarWrap: {
    marginTop: 96,
    alignSelf: 'center',
    width: 96,
    height: 96,
  },
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BADGE_BORDER,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: spacing.md,
  },
  sub: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  ctas: {
    paddingHorizontal: spacing.md,
    paddingBottom: 32,
  },
});
