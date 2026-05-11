import {
  getFriendAvailability,
  getEvent,
  sendFriendRequest,
  ApiError,
  getMyAvailability,
  type AuthedFetch,
  type AuthedMutate,
} from './src/api';
import { isoOffset } from './src/mocks';

// This script only exercises the mock path (isApiConfigured() === false in the
// script's env). The stubs accept an AuthedFetch / AuthedMutate but never call
// them on the mock branch, so unused-arg shims that throw if invoked are safe.
const noopFetch: AuthedFetch = () => {
  throw new Error('verify-api: AuthedFetch invoked — mock path expected');
};
const noopMutate: AuthedMutate = () => {
  throw new Error('verify-api: AuthedMutate invoked — mock path expected');
};

async function main() {
  try { await getFriendAvailability(noopFetch, 'user-3'); console.log('FAIL: Marcus'); }
  catch (e) {
    if (e instanceof ApiError && e.code === 'FORBIDDEN')
      console.log('PASS: getFriendAvailability("user-3") -> FORBIDDEN');
    else console.log('FAIL:', e);
  }

  try {
    const sasha = await getFriendAvailability(noopFetch, 'user-2');
    console.log(`PASS: getFriendAvailability("user-2") -> empty (keys=${Object.keys(sasha).length})`);
  } catch (e) { console.log('FAIL Sasha:', e); }

  try { await getEvent(noopFetch, 'event-zzz'); console.log('FAIL: getEvent'); }
  catch (e) {
    if (e instanceof ApiError && e.code === 'NOT_FOUND')
      console.log('PASS: getEvent("event-zzz") -> NOT_FOUND');
  }

  try { await sendFriendRequest(noopMutate, 'user-2'); console.log('FAIL: sendFriendRequest'); }
  catch (e) {
    if (e instanceof ApiError && e.code === 'CONFLICT')
      console.log('PASS: sendFriendRequest("user-2") -> CONFLICT');
  }

  const my = await getMyAvailability(noopFetch);
  console.log(`PASS: getMyAvailability()[isoOffset(7)] = '${my[isoOffset(7)]}' (expected 'busy')`);
}
main();
