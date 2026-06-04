/**
 * SyncUp Navigation Types
 *
 * Source of truth: NAVIGATION.md (monorepo root) + TYPES.ts.
 * Every navigator declares its param list here; every screen imports its props
 * type from this file (never from the navigator file directly).
 *
 * No `any`. All param shapes are explicit. The Create tab is intentionally
 * absent from any stack param list — it is a modal trigger, not a tab screen.
 */

import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type {
  AddFriendMethod,
  AudiencePickerMode,
  AvailabilityMode,
  AvailState,
  GroupDetailTab,
} from '../../../TYPES';

// ExploreStackParamList is declared below HomeStackParamList.

// ============================================================================
// STACK PARAM LISTS
// ============================================================================

/**
 * Auth stack — minimum shell for Clerk integration. Mounted by RootNavigator
 * when `useAuth().isSignedIn === false`. The full Round 9 onboarding flow
 * (Welcome, 6-step sign-up, forgot password) is GAP 1 and is tracked
 * separately; see ANCHOR-DESIGN.txt R9-1 through R9-10.
 */
/** Invite-first deep-link context (R9-8). */
export interface AuthInviteContext {
  inviterName: string;
  eventName?: string;
}

export type AuthStackParamList = {
  Welcome: { inviteContext?: AuthInviteContext } | undefined;
  SignIn: undefined;
  SignUpStep1: undefined;
  SignUpStep2: { credential: string };
  SignUpStep3: { credential: string };
  SignUpStep4: { credential: string; name: string; handle: string };
  SignUpStep5: {
    credential: string;
    name: string;
    handle: string;
    password: string;
  };
  SignUpStep6: { inviteContext?: AuthInviteContext };
  ForgotPassword: undefined;
  ForgotPasswordConfirm: { credential: string };
  // R15-7..R15-12: post-Step-6 onboarding tail
  PushPermissionGate: undefined;
  FriendFindDecision: undefined;
  FriendFindMatches: undefined;
  FriendFindNoWorries: undefined;
  YoureIn: { inviteContext?: AuthInviteContext } | undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  EventDetail: { eventId: string };
  /** Event chat thread (R18 / D2). Reached from EventDetail or a notif. */
  EventChat: { conversationId: string; eventId: string };
};

export type ExploreStackParamList = {
  Explore: undefined;
  ExploreDetail: { venueId: string };
};

export type CreateEventStackParamList = {
  /**
   * prefilledTitle / prefilledDescription / prefilledLocation / prefilledGeo
   * are populated when the user taps "Create Event" from ExploreDetailScreen.
   * Step1Screen seeds draftStore with these values on mount.
   */
  Step1:
    | {
        prefilledInviteeIds?: string[];
        prefilledIso?: string;
        /** Explore prefill — venue name → event title */
        prefilledTitle?: string;
        /** Explore prefill — venue description */
        prefilledDescription?: string;
        /** Explore prefill — venue address */
        prefilledLocation?: string;
        /** Explore prefill — venue lat/lng */
        prefilledGeo?: { lat: number; lng: number };
      }
    | undefined;
  Step2: undefined;
  Step3: undefined;
  Confirm: { eventId: string };
};

export type FriendsStackParamList = {
  FriendsList: undefined;
  AddFriend: { method?: AddFriendMethod } | undefined;
  FriendProfile: { friendId: string };
  FriendTypesManager: undefined;
  /** Messages inbox — the Friends-tab Messages segment surface (R17-1 / R18). */
  Messages: undefined;
  /**
   * DM + group chat thread (R18 / D2). EVENT chat lives in HomeStack
   * (EventChat) because event surfaces hang off the Home tab.
   */
  MessageThread: { conversationId: string; type: 'DIRECT' | 'GROUP' };
};

export type GroupsStackParamList = {
  GroupsList: undefined;
  CreateGroup: undefined;
  GroupDetail: { groupId: string; tab?: GroupDetailTab };
  CoverPickerSheet: { selectedCoverId?: string };
};

export type ProfileStackParamList = {
  ProfileSettings: undefined;
  AvailabilityEditor:
    | { initialMode?: AvailabilityMode; focusIso?: string }
    | undefined;
  BroadcastSettings: undefined;
  /**
   * `onConfirm` callback param is acceptable here per NAVIGATION.md guidance
   * (modal sheets only). Never use callback-in-params for non-sheet routes.
   */
  AudiencePickerSheet: {
    mode: AudiencePickerMode;
    selected: string[];
    ruleState: AvailState;
    onConfirm: (selected: string[]) => void;
  };
};

// ============================================================================
// ROOT TAB + ROOT NAVIGATOR PARAM LISTS
// ============================================================================

/**
 * Tabs receive `NavigatorScreenParams` so cross-stack navigation can target a
 * specific screen within a stack (e.g. `navigation.navigate('FriendsTab',
 * { screen: 'FriendProfile', params: { friendId } })`).
 *
 * `CreateTab` is `undefined` — pressing it triggers a modal via `tabPress`
 * listener; the screen itself is never displayed.
 */
/**
 * Tab bar order (locked — see TabBar.tsx canonical array):
 *   Home | Explore | [Create +] | Friends | Profile
 *
 * GroupsTab is intentionally kept in this type (and in the Tab.Navigator)
 * so GroupDetailScreen retains cross-tab navigation access. It is hidden
 * from the tab bar because it is absent from TabBar.tsx's canonical array.
 */
export type RootTabParamList = {
  HomeTab:    NavigatorScreenParams<HomeStackParamList>;
  ExploreTab: NavigatorScreenParams<ExploreStackParamList>;
  CreateTab:  undefined;
  FriendsTab: NavigatorScreenParams<FriendsStackParamList>;
  GroupsTab:  NavigatorScreenParams<GroupsStackParamList>; // hidden from TabBar
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

/**
 * Root navigator mounts the tab navigator and the Create Event modal stack
 * side-by-side so the modal renders ABOVE the tabs (full-screen).
 */
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList>;
  CreateEventModal: NavigatorScreenParams<CreateEventStackParamList>;
};

// ============================================================================
// COMPOSITE SCREEN PROP TYPES (one per route)
// ============================================================================

// --- Auth ---
export type WelcomeScreenProps = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;
export type SignInScreenProps = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;
export type SignUpStep1ScreenProps = NativeStackScreenProps<AuthStackParamList, 'SignUpStep1'>;
export type SignUpStep2ScreenProps = NativeStackScreenProps<AuthStackParamList, 'SignUpStep2'>;
export type SignUpStep3ScreenProps = NativeStackScreenProps<AuthStackParamList, 'SignUpStep3'>;
export type SignUpStep4ScreenProps = NativeStackScreenProps<AuthStackParamList, 'SignUpStep4'>;
export type SignUpStep5ScreenProps = NativeStackScreenProps<AuthStackParamList, 'SignUpStep5'>;
export type SignUpStep6ScreenProps = NativeStackScreenProps<AuthStackParamList, 'SignUpStep6'>;
export type ForgotPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;
export type ForgotPasswordConfirmScreenProps = NativeStackScreenProps<AuthStackParamList, 'ForgotPasswordConfirm'>;
// R15 post-Step-6 onboarding tail
export type PushPermissionGateScreenProps = NativeStackScreenProps<AuthStackParamList, 'PushPermissionGate'>;
export type FriendFindDecisionScreenProps  = NativeStackScreenProps<AuthStackParamList, 'FriendFindDecision'>;
export type FriendFindMatchesScreenProps   = NativeStackScreenProps<AuthStackParamList, 'FriendFindMatches'>;
export type FriendFindNoWorriesScreenProps = NativeStackScreenProps<AuthStackParamList, 'FriendFindNoWorries'>;
export type YoureInScreenProps             = NativeStackScreenProps<AuthStackParamList, 'YoureIn'>;

// --- Explore ---
export type ExploreScreenProps = CompositeScreenProps<
  NativeStackScreenProps<ExploreStackParamList, 'Explore'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'ExploreTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

export type ExploreDetailScreenProps = CompositeScreenProps<
  NativeStackScreenProps<ExploreStackParamList, 'ExploreDetail'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'ExploreTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

// --- Home ---
export type HomeScreenProps = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, 'Home'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'HomeTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

export type EventDetailScreenProps = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, 'EventDetail'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'HomeTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

export type EventChatScreenProps = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, 'EventChat'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'HomeTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

// --- Create Event (modal stack mounted at root) ---
export type Step1ScreenProps = CompositeScreenProps<
  NativeStackScreenProps<CreateEventStackParamList, 'Step1'>,
  NativeStackScreenProps<RootStackParamList, 'CreateEventModal'>
>;

export type Step2ScreenProps = CompositeScreenProps<
  NativeStackScreenProps<CreateEventStackParamList, 'Step2'>,
  NativeStackScreenProps<RootStackParamList, 'CreateEventModal'>
>;

export type Step3ScreenProps = CompositeScreenProps<
  NativeStackScreenProps<CreateEventStackParamList, 'Step3'>,
  NativeStackScreenProps<RootStackParamList, 'CreateEventModal'>
>;

export type ConfirmScreenProps = CompositeScreenProps<
  NativeStackScreenProps<CreateEventStackParamList, 'Confirm'>,
  NativeStackScreenProps<RootStackParamList, 'CreateEventModal'>
>;

// --- Friends ---
export type FriendsListScreenProps = CompositeScreenProps<
  NativeStackScreenProps<FriendsStackParamList, 'FriendsList'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'FriendsTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

export type AddFriendScreenProps = CompositeScreenProps<
  NativeStackScreenProps<FriendsStackParamList, 'AddFriend'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'FriendsTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

export type FriendProfileScreenProps = CompositeScreenProps<
  NativeStackScreenProps<FriendsStackParamList, 'FriendProfile'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'FriendsTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

export type FriendTypesManagerScreenProps = CompositeScreenProps<
  NativeStackScreenProps<FriendsStackParamList, 'FriendTypesManager'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'FriendsTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

export type MessagesScreenProps = CompositeScreenProps<
  NativeStackScreenProps<FriendsStackParamList, 'Messages'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'FriendsTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

export type MessageThreadScreenProps = CompositeScreenProps<
  NativeStackScreenProps<FriendsStackParamList, 'MessageThread'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'FriendsTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

// --- Groups (hidden from TabBar but still in navigator for cross-tab nav) ---
export type GroupsListScreenProps = CompositeScreenProps<
  NativeStackScreenProps<GroupsStackParamList, 'GroupsList'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'GroupsTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;
export type CreateGroupScreenProps = CompositeScreenProps<
  NativeStackScreenProps<GroupsStackParamList, 'CreateGroup'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'GroupsTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;
export type GroupDetailScreenProps = CompositeScreenProps<
  NativeStackScreenProps<GroupsStackParamList, 'GroupDetail'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'GroupsTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;
export type CoverPickerSheetScreenProps = CompositeScreenProps<
  NativeStackScreenProps<GroupsStackParamList, 'CoverPickerSheet'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'GroupsTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

// --- Profile ---
export type ProfileSettingsScreenProps = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, 'ProfileSettings'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'ProfileTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

export type AvailabilityEditorScreenProps = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, 'AvailabilityEditor'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'ProfileTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

export type BroadcastSettingsScreenProps = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, 'BroadcastSettings'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'ProfileTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;

export type AudiencePickerSheetScreenProps = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, 'AudiencePickerSheet'>,
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, 'ProfileTab'>,
    NativeStackScreenProps<RootStackParamList>
  >
>;
