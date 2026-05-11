/**
 * SearchContext — open/close control for the global Search overlay (R8-1).
 *
 * Mounted by RootNavigator. Any screen (HomeScreen, FriendsListScreen,
 * GroupsListScreen) can call useSearch().openSearch() from its FlowHeader
 * search icon. Same shape as NotifSheetContext.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { useHaptic } from '../../theme';

export interface SearchContextValue {
  open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

interface ProviderProps {
  children: React.ReactNode;
}

export function SearchProvider({ children }: ProviderProps): React.JSX.Element {
  const fire = useHaptic();
  const [open, setOpen] = useState(false);

  const openSearch = useCallback(() => {
    fire('light');
    setOpen(true);
  }, [fire]);

  const closeSearch = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo<SearchContextValue>(
    () => ({ open, openSearch, closeSearch }),
    [open, openSearch, closeSearch],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error('useSearch must be used inside <SearchProvider>.');
  }
  return ctx;
}
