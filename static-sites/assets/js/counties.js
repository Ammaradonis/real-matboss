const STATE_CENTROIDS = {
  Alabama: [32.8, -86.8], Alaska: [64.2, -149.5], Arizona: [34.3, -111.7], Arkansas: [35.1, -92.4],
  California: [37.3, -119.7], Colorado: [39.0, -105.5], Connecticut: [41.6, -72.7], Delaware: [38.9, -75.5],
  Florida: [27.8, -81.7], Georgia: [32.7, -83.3], Hawaii: [20.8, -157.5], Idaho: [44.2, -114.1],
  Illinois: [40.0, -89.2], Indiana: [39.9, -86.2], Iowa: [42.0, -93.4], Kansas: [38.5, -98.0],
  Kentucky: [37.8, -85.8], Louisiana: [31.1, -92.0], Maine: [45.3, -69.2], Maryland: [39.0, -76.7],
  Massachusetts: [42.3, -71.8], Michigan: [44.3, -85.5], Minnesota: [46.3, -94.2], Mississippi: [32.7, -89.7],
  Missouri: [38.5, -92.6], Montana: [46.9, -110.4], Nebraska: [41.5, -99.8], Nevada: [39.3, -116.6],
  'New Hampshire': [43.8, -71.6], 'New Jersey': [40.1, -74.7], 'New Mexico': [34.5, -106.2], 'New York': [42.9, -75.0],
  'North Carolina': [35.6, -79.8], 'North Dakota': [47.5, -100.5], Ohio: [40.3, -82.8], Oklahoma: [35.6, -97.5],
  Oregon: [43.9, -120.6], Pennsylvania: [41.2, -77.2], 'Rhode Island': [41.7, -71.5], 'South Carolina': [33.8, -80.9],
  'South Dakota': [44.4, -100.2], Tennessee: [35.8, -86.4], Texas: [31.4, -99.3], Utah: [39.3, -111.7],
  Vermont: [44.0, -72.7], Virginia: [37.5, -78.8], Washington: [47.4, -120.5], 'West Virginia': [38.6, -80.6],
  Wisconsin: [44.5, -89.6], Wyoming: [43.1, -107.6], 'District of Columbia': [38.9, -77.0], 'Puerto Rico': [18.2, -66.5],
};

function normalizeLine(value) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();
}

export function parseCounties(raw) {
  const pattern = /The\s+(.+?)\s+in\s+([A-Za-z\s'.-]+)\s+are:\s+([\s\S]*?)(?:\.\s*\n|\.$)/g;
  const rows = [];
  let match = pattern.exec(raw);
  while (match) {
    const state = normalizeLine(match[2]);
    const names = match[3]
      .replace(/\band\b/gi, ',')
      .split(',')
      .map((part) => normalizeLine(part))
      .filter(Boolean)
      .map((name) => {
        if (/(County|Parish|Borough|Census Area|Planning Region|Municipio|Municipality|City)$/i.test(name)) {
          return name;
        }
        return `${name} County`;
      });

    rows.push({
      state,
      counties: names,
    });

    match = pattern.exec(raw);
  }
  return rows;
}

function hashNumber(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 2147483647;
  }
  return hash;
}

export function countyToCoord(state, county) {
  const [baseLat, baseLon] = STATE_CENTROIDS[state] || [39.8, -98.6];
  const h = hashNumber(`${state}:${county}`);
  const spreadLat = ((h % 1000) / 1000 - 0.5) * 2.8;
  const spreadLon = (((h / 1000) % 1000) / 1000 - 0.5) * 4.4;
  return {
    lat: Math.max(-72, Math.min(72, baseLat + spreadLat)),
    lon: Math.max(-179, Math.min(179, baseLon + spreadLon)),
  };
}

function toPointCloud(stateRows, limit = 1200) {
  const points = [];
  for (const row of stateRows) {
    for (const county of row.counties) {
      const c = countyToCoord(row.state, county);
      points.push({ state: row.state, county, lat: c.lat, lon: c.lon });
      if (points.length >= limit) {
        return points;
      }
    }
  }
  return points;
}

function toStateCoverage(stateRows) {
  return stateRows
    .map((row) => ({ state: row.state, count: row.counties.length }))
    .sort((a, b) => b.count - a.count);
}

export async function loadCountyData(path = '/data/all-us-counties.txt') {
  const response = await fetch(path);
  const raw = await response.text();
  const states = parseCounties(raw);
  return {
    states,
    stateNames: states.map((row) => row.state).sort((a, b) => a.localeCompare(b)),
    stateCoverage: toStateCoverage(states),
    pointCloud: toPointCloud(states),
  };
}

export function countiesForState(data, state) {
  return data.states.find((row) => row.state === state)?.counties ?? [];
}
