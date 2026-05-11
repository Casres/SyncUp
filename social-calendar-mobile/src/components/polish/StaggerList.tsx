/**
 * StaggerList — Wraps a list of children with entrance stagger animation.
 *
 * Per-item delay: staggerItemBase (60ms) + index × staggerItemStep (30ms),
 * capped at staggerItemCap (12). Item 13+ animate together at cap delay.
 *
 * Honours `prefers-reduced-motion` via `AccessibilityInfo.isReduceMotionEnabled`
 * — falls back to a 200ms easeOut opacity-only fade (A-11).
 *
 * NOT used on day grids (would feel laggy on a 30-cell month view).
 */

import React, { Children, useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { durations, easings, springs, stagger } from '../../theme';

export interface StaggerListProps {
  children: React.ReactNode;
  /** Defaults to `stagger.capItems` (12). */
  capItems?: number;
}

export function StaggerList({ children, capItems = stagger.capItems }: StaggerListProps): React.JSX.Element {
  const [reduceMotion, setReduceMotion] = useState(false);

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

  const items = Children.toArray(children);
  return (
    <View>
      {items.map((child, index) => (
        <StaggerItem
          key={getKey(child, index)}
          index={Math.min(index, capItems)}
          reduceMotion={reduceMotion}
        >
          {child}
        </StaggerItem>
      ))}
    </View>
  );
}

interface StaggerItemProps {
  children: React.ReactNode;
  index: number;
  reduceMotion: boolean;
}

function StaggerItem({ children, index, reduceMotion }: StaggerItemProps): React.JSX.Element {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    const delay = stagger.baseMs + index * stagger.perItemMs;
    if (reduceMotion) {
      opacity.value = withDelay(delay, withTiming(1, { duration: 200, easing: easings.easeOut }));
      translateY.value = 0;
      return;
    }
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: durations.staggerList, easing: easings.easeStd }),
    );
    translateY.value = withDelay(delay, withSpring(0, springs.spring));
  }, [opacity, translateY, index, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

function getKey(child: React.ReactNode, index: number): React.Key {
  if (React.isValidElement(child) && child.key !== null && child.key !== undefined) {
    return child.key;
  }
  return index;
}
