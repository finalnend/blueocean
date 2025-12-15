import axios from 'axios';
import getDatabase from '../database/db.js';

const db = getDatabase();

const OCEANS = [
  { id: 'Q98', slug: 'pacific' }, // Pacific Ocean
  { id: 'Q97', slug: 'atlantic' }, // Atlantic Ocean
  { id: 'Q1239', slug: 'indian' }, // Indian Ocean
  { id: 'Q7354', slug: 'southern' }, // Southern Ocean
  { id: 'Q788', slug: 'arctic' }, // Arctic Ocean
];

const UNIT_LABELS = {
  'http://www.wikidata.org/entity/Q712226': 'km²', // square kilometre
  'http://www.wikidata.org/entity/Q11573': 'm', // metre
  'http://www.wikidata.org/entity/Q4243638': 'km³', // cubic kilometre
};

function cacheGet(key) {
  const stmt = db.prepare(`
    SELECT cache_data
    FROM data_cache
    WHERE cache_key = ? AND expires_at > datetime('now')
  `);
  const row = stmt.get(key);
  return row ? JSON.parse(row.cache_data) : null;
}

function cacheSet(key, data, expiresInHours = 24) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO data_cache (cache_key, cache_data, expires_at)
    VALUES (?, ?, datetime('now', '+' || ? || ' hours'))
  `);
  stmt.run(key, JSON.stringify(data), expiresInHours);
}

function pickBestClaim(claims) {
  if (!Array.isArray(claims) || claims.length === 0) return null;
  const rankOrder = { preferred: 0, normal: 1, deprecated: 2 };
  return [...claims].sort(
    (a, b) => (rankOrder[a.rank] ?? 1) - (rankOrder[b.rank] ?? 1)
  )[0];
}

function readQuantity(entity, propertyId) {
  const claims = entity?.claims?.[propertyId];
  const best = pickBestClaim(claims);
  const dv = best?.mainsnak?.datavalue?.value;
  if (!dv || typeof dv !== 'object') return null;
  if (typeof dv.amount !== 'string' || typeof dv.unit !== 'string') return null;

  const value = Number.parseFloat(dv.amount);
  if (!Number.isFinite(value)) return null;

  const unitLabel = UNIT_LABELS[dv.unit];
  if (!unitLabel) return null;

  return { value, unit: unitLabel };
}

function readEnLabel(entity) {
  return entity?.labels?.en?.value || null;
}

function readEnDescription(entity) {
  return entity?.descriptions?.en?.value || null;
}

function readWikipediaUrl(entity) {
  const title = entity?.sitelinks?.enwiki?.title;
  if (!title) return null;
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

async function fetchWikidataEntity(qid) {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
  const res = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'BlueEarthWatch/1.0',
      Accept: 'application/json',
    },
  });
  return res.data?.entities?.[qid] || null;
}

export const getOceanStats = async (req, res) => {
  try {
    const cacheKey = 'ocean_stats_v1';
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const oceans = [];

    for (const ocean of OCEANS) {
      try {
        const entity = await fetchWikidataEntity(ocean.id);
        if (!entity) continue;

        const name = readEnLabel(entity);
        if (!name || !/Ocean\b/i.test(name)) continue;

        const area = readQuantity(entity, 'P2046'); // area
        const meanDepth = readQuantity(entity, 'P4511'); // mean depth
        const volume = readQuantity(entity, 'P2234'); // volume

        const stats = {};
        if (area) stats.area = area;
        if (meanDepth) stats.meanDepth = meanDepth;
        if (volume) stats.volume = volume;

        if (Object.keys(stats).length === 0) continue;

        oceans.push({
          id: ocean.id,
          slug: ocean.slug,
          name,
          description: readEnDescription(entity),
          wikipediaUrl: readWikipediaUrl(entity),
          wikidataUrl: `https://www.wikidata.org/wiki/${ocean.id}`,
          stats,
        });
      } catch (err) {
        console.warn('[oceanController] failed ocean fetch', ocean.id, err?.message || err);
      }
    }

    const payload = {
      source: 'Wikidata (Special:EntityData)',
      fetchedAt: new Date().toISOString(),
      oceans,
    };

    cacheSet(cacheKey, payload, 24);
    res.json(payload);
  } catch (error) {
    console.error('Error in getOceanStats:', error);
    res.status(500).json({ error: 'Failed to load ocean stats' });
  }
};
