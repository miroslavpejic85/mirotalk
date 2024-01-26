// Haversine formula to calculate distance between two points
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// Function to chunk the array into smaller arrays of a specific size
function chunkArray(array, chunkSize) {
    let result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize));
    }
    return result;
}

// Function to get sorted chunks of locations
function getSortedLocationChunks(locations, target, chunkSize = 5) {
    // Sort locations by distance from the target
    const sortedLocations = locations.sort((a, b) => {
        const distanceA = getDistance(target.lat, target.lon, a.location.lat, a.location.lon);
        const distanceB = getDistance(target.lat, target.lon, b.location.lat, b.location.lon);
        return distanceA - distanceB;
    });

    // Chunk the sorted array
    return chunkArray(sortedLocations, chunkSize);
}

async function fetchLocationCoordinates(locationString) {
    const queryString = encodeURIComponent(locationString);
    const res = await window.fetch(`/location-coords?${queryString}`);
    return await res.json();
}

async function fetchProperties() {
    const res = await window.fetch(`/properties`);
    return await res.json();
}
