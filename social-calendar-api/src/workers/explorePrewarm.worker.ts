/**
 * Explore pre-warm worker.
 *
 * Runs on a node-cron schedule (default: every 2 hours) and calls
 * exploreService.getFeed for every city in EXPLORE_PREWARM_CITIES so the
 * feed cache is always warm on user request.
 *
 * Design notes:
 * - Cities are processed serially (one at a time) to respect Eventbrite and
 *   Google Places per-key QPS limits. Parallelizing the upstream calls would
 *   risk burst-throttling during the pre-warm sweep.
 * - The 'all' category is used so every downstream category benefits from the
 *   cached full list that getFeed internally splits by category.
 * - Pre-warmer only runs in NODE_ENV === 'production'. Dev/test environments
 *   skip it to avoid burning API quota on non-user traffic.
 * - Cache writeback flows through exploreCache.setFeed with the same key
 *   schema as request-path writes — no separate write path.
 *
 * Tradeoff: with default TTL 600 s (10 min) and cron every 2 hours, cache
 * will go cold between runs for most location buckets. Pre-warming covers
 * popular city centroids; off-centroid queries still pay the live-fetch cost.
 * Increase EXPLORE_PREWARM_CRON frequency (e.g. "0 * * * *") if the cold-hit
 * rate becomes unacceptable, at the cost of more upstream API calls per day.
 */

import cron from 'node-cron';
import { env } from '../config/env.js';
import { exploreService } from '../services/explore.service.js';

// ── City centroid registry ────────────────────────────────────────────────────

interface CityCentroid {
  id: string;
  lat: number;
  lng: number;
}

const CITY_CENTROIDS: Record<string, CityCentroid> = {
  nyc: { id: 'nyc', lat: 40.71,  lng: -74.01 },
  sf:  { id: 'sf',  lat: 37.77,  lng: -122.42 },
  la:  { id: 'la',  lat: 34.05,  lng: -118.24 },
  chi: { id: 'chi', lat: 41.88,  lng: -87.63 },
  sea: { id: 'sea', lat: 47.61,  lng: -122.33 },
  atx: { id: 'atx', lat: 30.27,  lng: -97.74 },
};

function parseCities(): CityCentroid[] {
  return env.EXPLORE_PREWARM_CITIES
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(slug => CITY_CENTROIDS[slug])
    .filter((c): c is CityCentroid => Boolean(c));
}

// ── Worker ────────────────────────────────────────────────────────────────────

export function startExplorePrewarmWorker(): ReturnType<typeof cron.schedule> {
  if (!cron.validate(env.EXPLORE_PREWARM_CRON)) {
    throw new Error(`Invalid EXPLORE_PREWARM_CRON: "${env.EXPLORE_PREWARM_CRON}"`);
  }

  const task = cron.schedule(env.EXPLORE_PREWARM_CRON, async () => {
    const startedAt = Date.now();
    const cities = parseCities();
    let ok = 0;
    let failed = 0;

    for (const city of cities) {
      try {
        // Cursor 0 fetches the first page; the full merged list is written to
        // the feed cache as a side effect, warming subsequent page requests too.
        await exploreService.getFeed(city.lat, city.lng, 'all', 0);
        ok++;
      } catch (err) {
        failed++;
        console.error('[explore-prewarm] city failed', { cityId: city.id, err: String(err) });
      }
    }

    console.log('[explore-prewarm] complete', {
      ms: Date.now() - startedAt,
      ok,
      failed,
      cities: cities.map(c => c.id),
    });
  });

  task.start();
  return task;
}

export function stopExplorePrewarmWorker(task: ReturnType<typeof cron.schedule>): void {
  task.stop();
}
