import { AvailabilityGranularity, Prisma } from '@prisma/client';
import type {
  AvailState,
  BroadcastAudienceMode,
  BroadcastSettings,
  UserAvailability,
} from '@prisma/client';
import type { Db } from './_types.js';

/**
 * Availability + Broadcast repository.
 *
 * Two physical tables, but they're paired at the service layer (a
 * broadcast rule targets an availability state). The mobile contract
 * stores availability as a flat `{ [iso]: state }` map; we materialise
 * one `UserAvailability` row per day with `granularity=DAY` and a
 * unique `(userId, windowStart, granularity)` key so upsert is
 * idempotent.
 *
 * Until `prisma generate` runs against the schema added in migration
 * `20260525000001_notif_avail_broadcast`, the typed delegates for
 * `userAvailability.upsert` (new unique key) and the entire
 * `broadcastSettings` table are stubbed via the same `(db as any)`
 * boundary cast pattern used in `notifications.repository.ts`. Once
 * the client is regenerated, the casts become no-ops.
 */

// ── UserAvailability delegate (augmented) ──────────────────────────────

type UserAvailabilityDelegate = {
  findMany(args: {
    where: {
      userId: string;
      granularity?: AvailabilityGranularity;
      state?: { not: null } | AvailState;
    };
    orderBy?: { windowStart?: 'asc' | 'desc' };
  }): Promise<UserAvailability[]>;

  upsert(args: {
    where: {
      userId_windowStart_granularity: {
        userId: string;
        windowStart: Date;
        granularity: AvailabilityGranularity;
      };
    };
    create: {
      userId: string;
      windowStart: Date;
      windowEnd: Date;
      granularity: AvailabilityGranularity;
      state: AvailState;
    };
    update: { state: AvailState };
  }): Promise<UserAvailability>;

  deleteMany(args: {
    where: {
      userId: string;
      windowStart?: Date;
      granularity?: AvailabilityGranularity;
    };
  }): Promise<{ count: number }>;
};

// ── BroadcastSettings delegate ─────────────────────────────────────────

type BroadcastSettingsDelegate = {
  findUnique(args: {
    where: { userId: string };
  }): Promise<BroadcastSettings | null>;

  upsert(args: {
    where: { userId: string };
    create: Omit<BroadcastSettings, 'id' | 'createdAt' | 'updatedAt'>;
    update: Partial<
      Omit<BroadcastSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
    >;
  }): Promise<BroadcastSettings>;
};

function availability(db: Db): UserAvailabilityDelegate {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).userAvailability as UserAvailabilityDelegate;
}

function broadcasts(db: Db): BroadcastSettingsDelegate {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).broadcastSettings as BroadcastSettingsDelegate;
}

// ── Date helpers ───────────────────────────────────────────────────────

/**
 * Parse an ISO date string (YYYY-MM-DD) into a UTC midnight Date. The
 * mobile client always sends day-granularity ISO; storing as UTC
 * midnight keeps the unique key deterministic across timezones.
 */
function isoDateToUtcMidnight(iso: string): Date {
  // Defensive — accept either YYYY-MM-DD or full ISO and truncate.
  const dayPart = iso.length >= 10 ? iso.slice(0, 10) : iso;
  // `new Date('YYYY-MM-DD')` is interpreted as UTC by spec — good.
  const d = new Date(`${dayPart}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return d;
}

function utcMidnightToIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Public types ───────────────────────────────────────────────────────

export type AvailabilityMap = Record<string, AvailState>;

export type BroadcastRuleData = {
  on: boolean;
  audience: BroadcastAudienceMode;
  targets: string[];
};

export type BroadcastSettingsData = {
  free: BroadcastRuleData;
  maybe: BroadcastRuleData;
  busy: BroadcastRuleData;
};

// ── Mapping helpers ────────────────────────────────────────────────────

function rowsToMap(rows: UserAvailability[]): AvailabilityMap {
  const out: AvailabilityMap = {};
  for (const row of rows) {
    if (row.state === null) continue;
    out[utcMidnightToIso(row.windowStart)] = row.state;
  }
  return out;
}

function rowToSettings(row: BroadcastSettings | null): BroadcastSettingsData {
  if (!row) {
    const empty: BroadcastRuleData = {
      on: false,
      audience: 'FRIENDS' as BroadcastAudienceMode,
      targets: [],
    };
    return { free: { ...empty }, maybe: { ...empty }, busy: { ...empty } };
  }
  const targetsToArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  return {
    free: {
      on: row.freeOn,
      audience: row.freeAudience,
      targets: targetsToArray(row.freeTargets),
    },
    maybe: {
      on: row.maybeOn,
      audience: row.maybeAudience,
      targets: targetsToArray(row.maybeTargets),
    },
    busy: {
      on: row.busyOn,
      audience: row.busyAudience,
      targets: targetsToArray(row.busyTargets),
    },
  };
}

// ── Repository methods ─────────────────────────────────────────────────

export const availabilityRepository = {
  // Re-exported helpers for the service layer.
  isoDateToUtcMidnight,
  utcMidnightToIso,
  rowsToMap,
  rowToSettings,

  /**
   * Fetch every DAY-granularity availability row for the given user and
   * shape into the mobile contract's flat `{ iso: state }` map. RLS on
   * `UserAvailability` enforces ownership at the row level; we still
   * pass `userId` for index hits and intent-clear queries.
   */
  async getMap(db: Db, userId: string): Promise<AvailabilityMap> {
    const rows = await availability(db).findMany({
      where: {
        userId,
        granularity: AvailabilityGranularity.DAY,
        state: { not: null },
      },
      orderBy: { windowStart: 'asc' },
    });
    return rowsToMap(rows);
  },

  /**
   * Upsert a single day's state. The DAY-granularity unique key keeps
   * this idempotent — repeated PUTs for the same date overwrite.
   */
  upsertDay(db: Db, userId: string, date: Date, state: AvailState) {
    return availability(db).upsert({
      where: {
        userId_windowStart_granularity: {
          userId,
          windowStart: date,
          granularity: AvailabilityGranularity.DAY,
        },
      },
      create: {
        userId,
        windowStart: date,
        windowEnd: date,
        granularity: AvailabilityGranularity.DAY,
        state,
      },
      update: { state },
    });
  },

  /**
   * Clear a single day. Hard-delete (not soft-delete) per Hard Rule 14
   * — absent row == unset.
   */
  async clearDay(db: Db, userId: string, date: Date) {
    const result = await availability(db).deleteMany({
      where: {
        userId,
        windowStart: date,
        granularity: AvailabilityGranularity.DAY,
      },
    });
    return result.count;
  },

  /**
   * Bulk replace: wipes every DAY row for the user then re-inserts the
   * given map. Runs inside whatever transaction the caller already
   * owns (`db` is `request.prismaTransaction`). The caller is expected
   * to feed this from `PUT /me/availability` which is a full-map
   * replace.
   */
  async replaceMap(db: Db, userId: string, map: AvailabilityMap) {
    await availability(db).deleteMany({
      where: { userId, granularity: AvailabilityGranularity.DAY },
    });
    for (const [iso, state] of Object.entries(map)) {
      const date = isoDateToUtcMidnight(iso);
      await availability(db).upsert({
        where: {
          userId_windowStart_granularity: {
            userId,
            windowStart: date,
            granularity: AvailabilityGranularity.DAY,
          },
        },
        create: {
          userId,
          windowStart: date,
          windowEnd: date,
          granularity: AvailabilityGranularity.DAY,
          state,
        },
        update: { state },
      });
    }
  },

  /**
   * Apply a partial patch (delta map). Keys with a state value upsert;
   * keys with the special `null` sentinel clear. Used by PATCH bulk
   * brush.
   */
  async patchMap(
    db: Db,
    userId: string,
    patch: Record<string, AvailState | null>,
  ) {
    for (const [iso, state] of Object.entries(patch)) {
      const date = isoDateToUtcMidnight(iso);
      if (state === null) {
        await availability(db).deleteMany({
          where: {
            userId,
            windowStart: date,
            granularity: AvailabilityGranularity.DAY,
          },
        });
      } else {
        await availability(db).upsert({
          where: {
            userId_windowStart_granularity: {
              userId,
              windowStart: date,
              granularity: AvailabilityGranularity.DAY,
            },
          },
          create: {
            userId,
            windowStart: date,
            windowEnd: date,
            granularity: AvailabilityGranularity.DAY,
            state,
          },
          update: { state },
        });
      }
    }
  },

  // ── Broadcast settings ────────────────────────────────────────────────

  async getSettings(db: Db, userId: string): Promise<BroadcastSettingsData> {
    const row = await broadcasts(db).findUnique({ where: { userId } });
    return rowToSettings(row);
  },

  /**
   * Upsert broadcast settings as a full replace. The mobile client
   * always sends the full BroadcastSettings shape (all three rules).
   */
  async upsertSettings(
    db: Db,
    userId: string,
    data: BroadcastSettingsData,
  ): Promise<BroadcastSettingsData> {
    const payload = {
      userId,
      freeOn: data.free.on,
      freeAudience: data.free.audience,
      freeTargets: data.free.targets as unknown as Prisma.InputJsonValue,
      maybeOn: data.maybe.on,
      maybeAudience: data.maybe.audience,
      maybeTargets: data.maybe.targets as unknown as Prisma.InputJsonValue,
      busyOn: data.busy.on,
      busyAudience: data.busy.audience,
      busyTargets: data.busy.targets as unknown as Prisma.InputJsonValue,
    };
    const row = await broadcasts(db).upsert({
      where: { userId },
      // The `create` payload satisfies the model row shape modulo PK +
      // timestamps which Prisma fills in.
      create: payload as unknown as Omit<
        BroadcastSettings,
        'id' | 'createdAt' | 'updatedAt'
      >,
      update: {
        freeOn: data.free.on,
        freeAudience: data.free.audience,
        freeTargets: data.free.targets as unknown as Prisma.InputJsonValue,
        maybeOn: data.maybe.on,
        maybeAudience: data.maybe.audience,
        maybeTargets: data.maybe.targets as unknown as Prisma.InputJsonValue,
        busyOn: data.busy.on,
        busyAudience: data.busy.audience,
        busyTargets: data.busy.targets as unknown as Prisma.InputJsonValue,
      } as unknown as Partial<
        Omit<BroadcastSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
      >,
    });
    return rowToSettings(row);
  },
};
