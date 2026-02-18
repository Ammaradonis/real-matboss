export function scoreByState(stateCoverage) {
  const map = new Map();
  stateCoverage.forEach((row) => map.set(row.state, row.count));
  return map;
}

export function limitPointCloud(points, limit = 1200) {
  return points.slice(0, Math.max(0, limit));
}

export function clusterBounds(points) {
  if (!points.length) {
    return {
      minLat: 0,
      maxLat: 0,
      minLon: 0,
      maxLon: 0,
    };
  }

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLon = points[0].lon;
  let maxLon = points[0].lon;

  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLon = Math.min(minLon, point.lon);
    maxLon = Math.max(maxLon, point.lon);
  }

  return { minLat, maxLat, minLon, maxLon };
}
