export function getLocationSecuritySignals({
  currentLocation,
  previousLocation,
  allowedRadius,
  distanceFromSchool,
  eventTime,
  serverTime,
  priorDeviceId,
  currentDeviceId,
}) {
  const suspiciousSignals = [];
  const blockingSignals = [];

  if (currentLocation?.mocked === true) {
    blockingSignals.push('MOCK_LOCATION');
  }

  if (typeof currentLocation?.accuracy === 'number' && currentLocation.accuracy < 5) {
    suspiciousSignals.push('ACCURACY_TOO_PERFECT');
  }

  if (typeof currentLocation?.accuracy === 'number' && currentLocation.accuracy > Math.max(allowedRadius || 0, 500)) {
    suspiciousSignals.push('LOW_GPS_ACCURACY');
  }

  if (typeof distanceFromSchool === 'number' && typeof allowedRadius === 'number' && distanceFromSchool > allowedRadius) {
    blockingSignals.push('OUTSIDE_GEOFENCE');
  }

  if (previousLocation?.timestamp && currentLocation?.latitude && currentLocation?.longitude) {
    const elapsedSeconds = Math.max(1, (new Date(eventTime).getTime() - new Date(previousLocation.timestamp).getTime()) / 1000);
    const distanceMeters = calculateDistance(
      previousLocation.latitude,
      previousLocation.longitude,
      currentLocation.latitude,
      currentLocation.longitude
    );
    const speedMps = distanceMeters / elapsedSeconds;

    if (speedMps > 120) {
      suspiciousSignals.push('UNREALISTIC_MOVEMENT');
    }
  }

  const clientTimestamp = currentLocation?.capturedAt || eventTime;
  const timeDriftMinutes = Math.abs(new Date(serverTime).getTime() - new Date(clientTimestamp).getTime()) / 60000;
  if (timeDriftMinutes > 10) {
    suspiciousSignals.push('CLIENT_TIME_DRIFT');
  }

  if (priorDeviceId && currentDeviceId && priorDeviceId !== currentDeviceId) {
    suspiciousSignals.push('NEW_DEVICE');
  }

  return {
    suspiciousSignals,
    blockingSignals,
    timeDriftMinutes: Number(timeDriftMinutes.toFixed(2)),
  };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
