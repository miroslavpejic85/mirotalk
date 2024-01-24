function toRadians(degrees) {
    return degrees * Math.PI / 180;
  }
  
  function haversineDistance(coords1, coords2) {
    const earthRadiusKm = 6371;
  
    const dLat = toRadians(coords2.latitude - coords1.latitude);
    const dLon = toRadians(coords2.longitude - coords1.longitude);
  
    const lat1 = toRadians(coords1.latitude);
    const lat2 = toRadians(coords2.latitude);
  
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return earthRadiusKm * c;
  }
  
  function findNearestLocation(targetCoords, locations) {
    return locations.reduce((nearest, location) => {
      const distance = haversineDistance(targetCoords, location);
      if (distance < nearest.distance) {
        return { location: location, distance: distance };
      }
      return nearest;
    }, { location: null, distance: Number.MAX_VALUE });
  }
  
  // Example usage:
  const targetCoords = { latitude: 52.5200, longitude: 13.4050 }; // Berlin, for example
  const locations = [
    { latitude: 48.8566, longitude: 2.3522 }, // Paris
    { latitude: 51.5074, longitude: -0.1278 }, // London
    // ... other locations
  ];
  
  const nearest = findNearestLocation(targetCoords, locations);
  console.log(nearest);
  