export function latLonToCartesian(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return {
    x: -(radius * Math.sin(phi) * Math.cos(theta)),
    z: radius * Math.sin(phi) * Math.sin(theta),
    y: radius * Math.cos(phi),
  };
}

export function nextRotation(current, speed = 0.0022) {
  return current + speed;
}
