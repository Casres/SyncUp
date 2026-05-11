/**
 * MiniMap — Compact static map preview thumbnail.
 *
 * Hard Rule R5-3: NO parallax. Static rendering only.
 *
 * Map rendering itself is a screen-level concern (we don't ship a tile loader
 * inside the component library). The component renders a placeholder surface
 * with an optional `imageUri` if the screen wants to drop in a static tile.
 */

import React from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, radii } from '../../theme';

type Theme = typeof colors.light;

export interface MiniMapProps {
  T?: Theme;
  lat: number;
  lng: number;
  height?: number;
  /** Optional pre-rendered map tile image. If omitted, renders a sunken placeholder. */
  imageSource?: ImageSourcePropType;
  accessibilityLabel?: string;
}

export function MiniMap({
  T = colors.light,
  lat,
  lng,
  height = 140,
  imageSource,
  accessibilityLabel,
}: MiniMapProps): React.JSX.Element {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        accessibilityLabel ?? `Map preview at ${lat.toFixed(4)}, ${lng.toFixed(4)}`
      }
      style={[
        styles.root,
        { height, backgroundColor: T.bgSunken, borderColor: T.hair },
      ]}
    >
      {imageSource ? (
        <Image source={imageSource} style={styles.tile} resizeMode="cover" />
      ) : null}
      <View pointerEvents="none" style={styles.pinWrap}>
        <Svg width={28} height={32} viewBox="0 0 28 32" fill="none">
          <Path
            d="M14 2c-5.5 0-10 4.3-10 9.6 0 7.2 10 18.4 10 18.4S24 18.8 24 11.6C24 6.3 19.5 2 14 2z"
            fill={T.accent}
            stroke={T.bgElevated}
            strokeWidth={1.5}
          />
          <Circle cx={14} cy={11.6} r={3.2} fill={T.bgElevated} />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    borderRadius: radii.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    ...StyleSheet.absoluteFillObject,
  },
  pinWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
