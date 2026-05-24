/**
 * R15-11: one-shot query of the iOS Contacts permission status.
 *
 * Not a React Query hook — this is a local OS query, not a server fetch.
 * Refreshed on FriendsListScreen focus via useFocusEffect.
 */

import { useState, useEffect } from 'react';
import * as Contacts from 'expo-contacts';

export type ContactsPermissionStatus = 'granted' | 'denied' | 'not_determined';

export function useContactsPermissionStatus(): ContactsPermissionStatus {
  const [status, setStatus] = useState<ContactsPermissionStatus>('not_determined');

  useEffect(() => {
    let cancelled = false;
    void Contacts.getPermissionsAsync().then((res) => {
      if (cancelled) return;
      if (res.status === 'granted') {
        setStatus('granted');
      } else if (res.status === 'denied') {
        setStatus('denied');
      } else {
        setStatus('not_determined');
      }
    });
    return () => { cancelled = true; };
  }, []);

  return status;
}
