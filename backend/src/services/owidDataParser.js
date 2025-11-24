import axios from 'axios';
import getDatabase from '../database/db.js';

const db = getDatabase();

const OWID_ENDPOINTS = {
  plasticWasteTonnes: 'https://ourworldindata.org/grapher/plastic-waste-generation-total.csv',
  mismanagedShare: 'https://ourworldindata.org/grapher/share-of-plastic-waste-that-is-mismanaged.csv'
};

const COUNTRY_COORDS = {
  China: { lat: 35.8617, lng: 104.1954 },
  'United States': { lat: 37.0902, lng: -95.7129 },
  India: { lat: 20.5937, lng: 78.9629 },
  Brazil: { lat: -14.235, lng: -51.9253 },
  Indonesia: { lat: -0.7893, lng: 113.9213 },
  Russia: { lat: 61.524, lng: 105.3188 },
  Germany: { lat: 51.1657, lng: 10.4515 },
  Japan: { lat: 36.2048, lng: 138.2529 },
  Philippines: { lat: 12.8797, lng: 121.774 },
  Vietnam: { lat: 14.0583, lng: 108.2772 }
};

function splitCSVLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseOwidCSV(csvText) {
  const rows = csvText.trim().split('\n');
  const header = splitCSVLine(rows[0]);
  const entityIndex = header.findIndex((col) => col.toLowerCase() === 'entity');
  const yearIndex = header.findIndex((col) => col.toLowerCase() === 'year');
  const valueIndex = header.length - 1;

  const records = [];

  for (let i = 1; i < rows.length; i++) {
    const line = rows[i].trim();
    if (!line) continue;

    const cells = splitCSVLine(line);
    const entity = cells[entityIndex];
    const year = Number.parseInt(cells[yearIndex], 10);
    const value = Number.parseFloat(cells[valueIndex]);

    if (!entity || Number.isNaN(year) || Number.isNaN(value)) continue;

    records.push({ entity, year, value });
  }

  return records;
}

async function fetchOwidDataset(url) {
  const response = await axios.get(url, { responseType: 'text' });
  return parseOwidCSV(response.data);
}

function buildShareMap(records) {
  const map = new Map();
  for (const row of records) {
    map.set(`${row.entity}-${row.year}`, row.value);
  }
  return map;
}

function combinePlasticData(wasteRows, shareRows) {
  const shareMap = buildShareMap(shareRows);

  return wasteRows.map((row) => {
    const share = shareMap.get(`${row.entity}-${row.year}`);
    const mismanagedTonnes = typeof share === 'number' ? (row.value * share) / 100 : null;

    return {
      country: row.entity,
      year: row.year,
      plasticWasteTonnes: row.value,
      mismanagedTonnes,
      mismanagedShare: share ?? null
    };
  });
}

export async function fetchOWIDPlasticWasteData() {
  try {
    console.log('Fetching OWID plastic waste datasets from grapher CSV endpoints...');

    const [wasteRows, shareRows] = await Promise.all([
      fetchOwidDataset(OWID_ENDPOINTS.plasticWasteTonnes),
      fetchOwidDataset(OWID_ENDPOINTS.mismanagedShare)
    ]);

    const combined = combinePlasticData(wasteRows, shareRows);

    return {
      lastUpdated: new Date().toISOString(),
      source: 'Our World in Data',
      data: combined
    };
  } catch (error) {
    console.error('Failed to fetch OWID data:', error.message);
    return { source: 'Our World in Data', lastUpdated: new Date().toISOString(), data: [] };
  }
}

export async function importOWIDDataToDatabase() {
  try {
    console.log('Importing OWID data into pollution_data...');

    const owidData = await fetchOWIDPlasticWasteData();

    if (!owidData || !owidData.data || owidData.data.length === 0) {
      console.log('No OWID data to import');
      return 0;
    }

    db.prepare(
      `DELETE FROM pollution_data WHERE source = 'Our World in Data' AND type = 'plastic'`
    ).run();

    const stmt = db.prepare(`
      INSERT INTO pollution_data 
      (source, type, lat, lng, value, unit, recorded_at, meta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        const coords = COUNTRY_COORDS[row.country] || { lat: 0, lng: 0 };
        stmt.run(
          'Our World in Data',
          'plastic',
          coords.lat,
          coords.lng,
          row.plasticWasteTonnes,
          'tonnes/year',
          `${row.year}-01-01`,
          JSON.stringify({
            country: row.country,
            mismanagedTonnes: row.mismanagedTonnes,
            mismanagedShare: row.mismanagedShare
          })
        );
        count += 1;
      }
    });

    insertMany(owidData.data);

    console.log(`Imported ${count} OWID plastic waste rows`);
    return count;
  } catch (error) {
    console.error('Failed to import OWID data:', error);
    return 0;
  }
}

export async function getGlobalPlasticStats() {
  try {
    const stmt = db.prepare(`
      SELECT 
        SUM(value) as total_waste,
        AVG(value) as avg_waste,
        COUNT(*) as countries,
        json_extract(meta, '$.country') as top_country,
        MAX(value) as max_waste
      FROM pollution_data
      WHERE source = 'Our World in Data'
        AND type = 'plastic'
        AND strftime('%Y', recorded_at) = (
          SELECT MAX(strftime('%Y', recorded_at)) 
          FROM pollution_data 
          WHERE source = 'Our World in Data'
        )
    `);

    return stmt.get();
  } catch (error) {
    console.error('Failed to compute global plastic stats:', error);
    return null;
  }
}

export default {
  fetchOWIDPlasticWasteData,
  importOWIDDataToDatabase,
  getGlobalPlasticStats
};
