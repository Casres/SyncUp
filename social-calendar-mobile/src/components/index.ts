/**
 * SyncUp Component Library — barrel export.
 *
 * Single import surface for screens:
 *   import { PillBtn, EventCard, EmptyHome } from '../../components';
 *
 * Categories: foundation / polish / eventFlow / social / profile / emptyStates.
 * 63 components total. See COMPONENTS_HANDOFF.md for the full inventory.
 */

// ────────────────────────────────────────────────────────────────────────────
// Foundation (11)
// ────────────────────────────────────────────────────────────────────────────
export { Field } from './foundation/Field';
export type { FieldProps } from './foundation/Field';

export { FlowHeader } from './foundation/FlowHeader';
export type { FlowHeaderProps } from './foundation/FlowHeader';

export { FormField } from './foundation/FormField';

export { MiniMap } from './foundation/MiniMap';

export { Overline } from './foundation/Overline';
export type { OverlineProps } from './foundation/Overline';

export { PillBtn } from './foundation/PillBtn';
export type { PillBtnProps, PillBtnVariant, PillBtnSize } from './foundation/PillBtn';

export { PriceSelector } from './foundation/PriceSelector';

export { ProgressBar } from './foundation/ProgressBar';
export type { ProgressBarProps } from './foundation/ProgressBar';

export { RingAvatar } from './foundation/RingAvatar';
export type { RingAvatarProps } from './foundation/RingAvatar';

export { SectionHeader } from './foundation/SectionHeader';
export type { SectionHeaderProps } from './foundation/SectionHeader';

export { Toggle } from './foundation/Toggle';
export type { ToggleProps } from './foundation/Toggle';

// ────────────────────────────────────────────────────────────────────────────
// Polish (8)
// ────────────────────────────────────────────────────────────────────────────
export { A11yLive } from './polish/A11yLive';

export { ButtonLoading } from './polish/ButtonLoading';

export { ErrorState } from './polish/ErrorState';

export { ErrorToast, TOAST_POSITION_DEFAULTS } from './polish/ErrorToast';
export type { ErrorToastProps } from './polish/ErrorToast';

export { LoadingOverlay } from './polish/LoadingOverlay';

export { OfflineBar } from './polish/OfflineBar';

export { Spinner, SPINNER_PIXEL_SIZE } from './polish/Spinner';
export type { SpinnerProps } from './polish/Spinner';

export { StaggerList } from './polish/StaggerList';
export type { StaggerListProps } from './polish/StaggerList';

// ────────────────────────────────────────────────────────────────────────────
// Event Flow (7)
// ────────────────────────────────────────────────────────────────────────────
export { AvailabilitySummaryBar } from './eventFlow/AvailabilitySummaryBar';
export type {
  AvailabilitySummaryBarProps,
  FriendsAvailMap,
} from './eventFlow/AvailabilitySummaryBar';

export { ConfirmCard } from './eventFlow/ConfirmCard';
export type { ConfirmCardProps } from './eventFlow/ConfirmCard';

export { EventCard } from './eventFlow/EventCard';
export type { EventCardProps } from './eventFlow/EventCard';

export { FilterChipRow } from './eventFlow/FilterChipRow';
export type {
  FilterChip,
  FilterChipRowProps,
} from './eventFlow/FilterChipRow';

export { RSVPSheet } from './eventFlow/RSVPSheet';
export type { RSVPSheetProps } from './eventFlow/RSVPSheet';

export { Step3AvailChip } from './eventFlow/Step3AvailChip';
export type { Step3AvailChipProps } from './eventFlow/Step3AvailChip';

export { Step3BusyBanner } from './eventFlow/Step3BusyBanner';
export type { Step3BusyBannerProps } from './eventFlow/Step3BusyBanner';

// ────────────────────────────────────────────────────────────────────────────
// Social (15)
// ────────────────────────────────────────────────────────────────────────────
export { AdminBar } from './social/AdminBar';
export type { AdminBarProps } from './social/AdminBar';

export { AdminInviteRow } from './social/AdminInviteRow';
export type { AdminInviteRowProps } from './social/AdminInviteRow';

export { CategoryBadge } from './social/CategoryBadge';
export type { CategoryBadgeProps } from './social/CategoryBadge';

export { CoverArt } from './social/CoverArt';
export type { CoverArtProps } from './social/CoverArt';

export { EmptyStateBlock } from './social/EmptyStateBlock';
export type {
  EmptyStateBlockProps,
  EmptyStateAction,
} from './social/EmptyStateBlock';

export { FGTabBar } from './social/FGTabBar';
export type { FGTabBarProps, FGTabId } from './social/FGTabBar';

export { FilterChipRowMulti } from './social/FilterChipRowMulti';
export type { FilterChipRowMultiProps } from './social/FilterChipRowMulti';

export { PlanningModeToggle } from './social/PlanningModeToggle';
export type {
  PlanningModeToggleProps,
  PlanningMode,
} from './social/PlanningModeToggle';

export { PollRow } from './social/PollRow';
export type { PollRowProps } from './social/PollRow';

export { PrivateBadge } from './social/PrivateBadge';
export type { PrivateBadgeProps } from './social/PrivateBadge';

export { QRArt } from './social/QRArt';
export type { QRArtProps } from './social/QRArt';

export { SegmentedSwitcher } from './social/SegmentedSwitcher';
export type {
  SegmentedSwitcherProps,
  SegmentedOption,
} from './social/SegmentedSwitcher';

export { SuggestionRow } from './social/SuggestionRow';
export type { SuggestionRowProps } from './social/SuggestionRow';

export { TabPills } from './social/TabPills';
export type { TabPillsProps, TabPillsTab } from './social/TabPills';

export { TwoTapDestructive } from './social/TwoTapDestructive';
export type { TwoTapDestructiveProps } from './social/TwoTapDestructive';

// ── GAP 3 — AttendeesSheet + co-host surface ────────────────────────────────
export { AttendeesSheet } from './social/AttendeesSheet';
export type { AttendeesSheetProps } from './social/AttendeesSheet';

export { AttendeeRow } from './social/AttendeeRow';
export type {
  AttendeeRowProps,
  AttendeeRowData,
  AttendeeViewerRole,
} from './social/AttendeeRow';

export { RowOverflowMenu } from './social/RowOverflowMenu';
export type {
  RowOverflowMenuProps,
  OverflowMenuItem,
} from './social/RowOverflowMenu';

export { CoHostBadge } from './social/CoHostBadge';
export type { CoHostBadgeProps } from './social/CoHostBadge';

export { CoHostToast } from './social/CoHostToast';
export type { CoHostToastProps } from './social/CoHostToast';

// ── GAP 4 — QuickProfileSheet (public mini-profile) ─────────────────────────
export { QuickProfileSheet } from './social/QuickProfileSheet';
export type {
  QuickProfileSheetProps,
  QuickProfilePerson,
  QuickProfileMutualFriend,
  QuickProfileStats,
  FriendRequestStatus,
} from './social/QuickProfileSheet';

// ────────────────────────────────────────────────────────────────────────────
// Profile (13)
// ────────────────────────────────────────────────────────────────────────────
export { AudiencePickerSheet } from './profile/AudiencePickerSheet';
export type { AudiencePickerSheetProps } from './profile/AudiencePickerSheet';

export { AudienceSwitcher } from './profile/AudienceSwitcher';
export type { AudienceSwitcherProps } from './profile/AudienceSwitcher';

export { AvailDot } from './profile/AvailDot';
export type { AvailDotProps } from './profile/AvailDot';

export { BroadcastToast } from './profile/BroadcastToast';
export type { BroadcastToastProps } from './profile/BroadcastToast';

export { BrushPicker } from './profile/BrushPicker';
export type { BrushPickerProps } from './profile/BrushPicker';

export { DayView } from './profile/DayView';
export type { DayViewProps } from './profile/DayView';

export { MonthGrid } from './profile/MonthGrid';
export type { MonthGridProps } from './profile/MonthGrid';

export { QuicksetGrid, BUILTIN_QUICKSETS } from './profile/QuicksetGrid';
export type { QuicksetGridProps } from './profile/QuicksetGrid';

export { QuicksetNameSheet } from './profile/QuicksetNameSheet';
export type {
  QuicksetNameSheetProps,
  QuicksetNameSheetMode,
} from './profile/QuicksetNameSheet';

export { SettingsGroup } from './profile/SettingsGroup';
export type { SettingsGroupProps } from './profile/SettingsGroup';

export { SettingsRow } from './profile/SettingsRow';
export type { SettingsRowProps } from './profile/SettingsRow';

export { StatTile } from './profile/StatTile';
export type { StatTileProps } from './profile/StatTile';

export { ThemePicker } from './profile/ThemePicker';
export type { ThemePickerProps } from './profile/ThemePicker';

export { WeekView } from './profile/WeekView';
export type { WeekViewProps } from './profile/WeekView';

// ────────────────────────────────────────────────────────────────────────────
// Empty States (9)
// ────────────────────────────────────────────────────────────────────────────
export { EmptyAttendees } from './emptyStates/EmptyAttendees';
export type { EmptyAttendeesProps } from './emptyStates/EmptyAttendees';

export { EmptyAvailability } from './emptyStates/EmptyAvailability';
export type { EmptyAvailabilityProps } from './emptyStates/EmptyAvailability';

export { EmptyFriends } from './emptyStates/EmptyFriends';
export type { EmptyFriendsProps } from './emptyStates/EmptyFriends';

export { EmptyGroups } from './emptyStates/EmptyGroups';
export type { EmptyGroupsProps } from './emptyStates/EmptyGroups';

export { EmptyHome } from './emptyStates/EmptyHome';
export type {
  EmptyHomeProps,
  EmptyHomeVariant,
} from './emptyStates/EmptyHome';

export { EmptyMutualEvents } from './emptyStates/EmptyMutualEvents';
export type { EmptyMutualEventsProps } from './emptyStates/EmptyMutualEvents';

export { EmptyPolls } from './emptyStates/EmptyPolls';
export type { EmptyPollsProps } from './emptyStates/EmptyPolls';

export { EmptySearch } from './emptyStates/EmptySearch';
export type { EmptySearchProps } from './emptyStates/EmptySearch';

export { EmptySuggestions } from './emptyStates/EmptySuggestions';
export type { EmptySuggestionsProps } from './emptyStates/EmptySuggestions';

// ────────────────────────────────────────────────────────────────────────────
// Explore (2)
// ────────────────────────────────────────────────────────────────────────────
export { ExploreCard } from './explore/ExploreCard';
export type { ExploreCardProps } from './explore/ExploreCard';

export { FilterBar } from './explore/FilterBar';
export type { FilterBarProps } from './explore/FilterBar';
