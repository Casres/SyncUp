/**
 * ConfirmCard — Hero summary card on the Confirm screen (post-creation).
 *
 * Inferred shape (spec lists `{ T, draft }` only):
 *   - Hero card surface (radius 16, bgElevated, hair border)
 *   - Glyph badge (44x44) + title (h2, 2-line clamp R5-6) + date/time + location
 *   - Used as the "lands" visual after Send Invites — parent fires `success` haptic on mount
 *
 * Purely presentational — no haptics fired here (parent screen owns the success ping
 * to keep the haptic firing exactly once per event creation).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import type { Draft } from '../../../../TYPES';

type Theme = typeof colors.light;

export interface ConfirmCardProps {
  T?: Theme;
  draft: Draft;
}

export function ConfirmCard({
  T = colors.light,
  draft,
}: ConfirmCardProps): React.JSX.Element {
  const meta = formatMeta(draft);
  return (
    <View style={[styles.root, { backgroundColor: T.bgElevated, borderColor: T.hair }]}>
      <View style={[styles.glyph, { backgroundColor: T.accentSoft }]}>
        <Text
          style={{
            color: T.accentInk,
            fontWeight: '800',
            fontSize: 18,
          }}
        >
          {glyphChar(draft)}
        </Text>
      </View>
      <View style={styles.body}>
        <Text
          style={[typography.h2, { color: T.ink }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {draft.title || 'Untitled event'}
        </Text>
        {meta ? (
          <Text style={[typography.body, { color: T.ink2 }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {draft.location ? (
          <Text style={[typography.caption, { color: T.ink2 }]} numberOfLines={1}>
            {draft.location}
          </Text>
        ) : null}
        {draft.inviteeIds.length > 0 ? (
          <Text style={[typography.caption, { color: T.ink3 }]} numberOfLines={1}>
            {`${draft.inviteeIds.length} invited`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function glyphChar(d: Draft): string {
  if (d.glyph && d.glyph.length > 0) return d.glyph[0]!.toUpperCase();
  return d.title.length > 0 ? d.title[0]!.toUpperCase() : '·';
}

function formatMeta(d: Draft): string {
  const date = d.eventIso ?? '';
  const start = formatTime(d.startAt);
  const end = formatTime(d.endAt);
  if (date && start && end) return `${date} · ${start}–${end}`;
  if (date && start) return `${date} · ${start}`;
  return date;
}

function formatTime(iso?: string): string | null {
  if (!iso) return null;
  const m = iso.match(/T(\d{2}):(\d{2})/);
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: spacing.mdl,
    padding: spacing.lg,
    borderRadius: radii.hero,
    borderWidth: StyleSheet.hairlineWidth,
  },
  glyph: {
    width: 44,
    height: 44,
    borderRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
});
