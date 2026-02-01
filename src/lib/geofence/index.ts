export type GeoPoint = {
  lat: number
  lng: number
}

const toRadians = (value: number) => (value * Math.PI) / 180

export const isInsideGeofence = (
  lat: number,
  lng: number,
  officeLat: number,
  officeLng: number,
  radiusMeters: number,
) => {
  const earthRadius = 6371000
  const dLat = toRadians(officeLat - lat)
  const dLng = toRadians(officeLng - lng)
  const lat1 = toRadians(lat)
  const lat2 = toRadians(officeLat)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) *
      Math.sin(dLng / 2) *
      Math.cos(lat1) *
      Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = earthRadius * c

  return distance <= radiusMeters
}
