/**
 * SegmentCarousel — the horizontally-swipeable body behind the 3-way
 * Friends · Groups · Messages SegmentedSwitcher (R17-1).
 *
 * Renders its children side-by-side, one pane per full screen width, and
 * translates the track to the active `index`. A horizontal pan swipes between
 * adjacent panes and WRAPS in both directions (swipe past the first pane →
 * last; past the last → first), per R17-1's "NEVER break the both-directions
 * carousel wrap." Tapping the switcher sets `index` directly (any-to-any);
 * this component keeps the track in sync via `withTiming`.
 *
 * The live drag is CLAMPED to the real pane range so an over-swipe at an edge
 * shows no blank gutter; the wrap still fires on release from the gesture's
 * translation/velocity. The pan only engages on horizontal intent
 * (`activeOffsetX` + `failOffsetY`) so the vertical lists inside each pane
 * scroll normally.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const SWIPE_DISTANCE_RATIO = 0.25; // fraction of width to trigger a page change
const SWIPE_VELOCITY = 500; // px/s fling threshold
const ANIM_MS = 220;

export interface SegmentCarouselProps {
  index: number;
  onIndexChange: (next: number) => void;
  /** Exactly one node per segment, in switcher order. */
  children: React.ReactNode[];
}

export function SegmentCarousel({
  index,
  onIndexChange,
  children,
}: SegmentCarouselProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const count = children.length;
  const minX = -(count - 1) * width;

  const translateX = useSharedValue(-index * width);
  const startX = useSharedValue(0);

  // Keep the track aligned when the index changes from outside (switcher tap).
  useEffect(() => {
    translateX.value = withTiming(-index * width, { duration: ANIM_MS });
  }, [index, width, translateX]);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      const raw = startX.value + e.translationX;
      // Clamp to the real range so edge over-swipe shows no empty gutter.
      translateX.value = Math.max(minX, Math.min(0, raw));
    })
    .onEnd((e) => {
      const past =
        Math.abs(e.translationX) > width * SWIPE_DISTANCE_RATIO ||
        Math.abs(e.velocityX) > SWIPE_VELOCITY;
      let next = index;
      if (past) next = e.translationX < 0 ? index + 1 : index - 1;
      const wrapped = (next + count) % count;
      translateX.value = withTiming(-wrapped * width, { duration: ANIM_MS });
      if (wrapped !== index) runOnJS(onIndexChange)(wrapped);
    });

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.track, { width: width * count }, trackStyle]}>
        {children.map((child, i) => (
          <View key={i} style={{ width }}>
            {child}
          </View>
        ))}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    flexDirection: 'row',
  },
});
