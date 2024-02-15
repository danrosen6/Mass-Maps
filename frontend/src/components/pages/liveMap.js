// Import necessary hooks and libraries
import React, { useState, useEffect, useRef } from 'react';
import { Map, View } from 'ol'; // OpenLayers for the map and view
import TileLayer from 'ol/layer/Tile'; // Tile layer for base map
import { OSM } from 'ol/source'; // OpenStreetMap as the source for the tile layer
import 'ol/ol.css'; // OpenLayers CSS
import VectorLayer from 'ol/layer/Vector'; // Vector layer for displaying features like stops and vehicles
import VectorSource from 'ol/source/Vector'; // Source for vector data
import Point from 'ol/geom/Point'; // Point geometry for features
import Feature from 'ol/Feature'; // Feature for vector data
import Style from 'ol/style/Style'; // Style for vector features
import Icon from 'ol/style/Icon'; // Icon style for features
import axios from 'axios'; // Axios for making HTTP requests
import { fromLonLat } from 'ol/proj'; // Helper to transform coordinates

// Main React component for the TrainMap
const LiveMap = () => {
  const mapRef = useRef(); // Holds the map container element
  const [map, setMap] = useState(); // State to keep the map instance
  const [selectedTransit, setSelectedTransit] = useState(''); // Tracks user-selected transit type
  const [selectedRoute, setSelectedRoute] = useState(''); // Tracks user-selected route
  const [routes, setRoutes] = useState([]); // Stores fetched routes

  // Fetch routes based on selected transit type
  useEffect(() => {
    async function fetchRoutes() {
      try {
        if (selectedTransit !== '') {
          const response = await axios.get(
            `https://api-v3.mbta.com/routes?filter[type]=${selectedTransit}`
          );
          setRoutes(response.data.data); // Update state with fetched routes
        } else {
          setRoutes([]); // Clear routes if no transit type is selected
        }
      } catch (error) {
        console.error('Error fetching routes:', error);
      }
    }

    fetchRoutes(); // Invoke the async function
  }, [selectedTransit]); // This effect depends on selectedTransit

  // Initialize the map
  useEffect(() => {
    if (!mapRef.current) return; // Exit if the ref is not attached

    // Create a new map instance
    const initialMap = new Map({
      target: mapRef.current, // Attach to the ref's current element
      layers: [
        new TileLayer({
          source: new OSM(), // Use OpenStreetMap base tiles
        }),
      ],
      view: new View({
        center: [-7910361.335273651, 5215196.272155075], // Example center in Web Mercator projection
        zoom: 15,
        maxZoom: 40, // Maximum zoom level
        minZoom: 10, // Minimum zoom level
      }),
    });

    setMap(initialMap); // Update the map state

    return () => {
      initialMap.setTarget(null); // Clean up by removing the map's target on component unmount
    };
  }, []); // This effect runs only once on mount

  // Update the map with new data when necessary
  useEffect(() => {
    if (!map) return; // Exit if map is not initialized

    // Define sources and layers for different transit types and their locations
    const trainSource = new VectorSource();
    const subwaySource = new VectorSource();
    const trainLocationsSource = new VectorSource();
    const subwayLocationsSource = new VectorSource();
    const busSource = new VectorSource();
    const busLocationsSource = new VectorSource();

    // Create layers for stops and vehicles with specific icons and scales
    const trainStopLayer = createVectorLayer(trainSource, '/trainFacility.png', 0.02);
    const subwayStopLayer = createVectorLayer(subwaySource, '/subwayStops.png', 0.09);
    const trainLocationsLayer = createVectorLayer(trainLocationsSource, '/train.png', 0.025, [0.5, 1]);
    const subwayLocationsLayer = createVectorLayer(subwayLocationsSource, '/subway.png', 0.015, [0.5, 1]);
    const busStopLayer = createVectorLayer(busSource, '/busStop.png', 0.02);
    const busLocationsLayer = createVectorLayer(busLocationsSource, '/bus.png', 0.12, [0.5, 1]);

    // Update map layers based on selected transit
    updateLayers(selectedTransit, map, subwayStopLayer, subwayLocationsLayer, trainStopLayer, trainLocationsLayer, busStopLayer, busLocationsLayer);

    // Fetch stops and update locations based on selected transit and route
    fetchStops(selectedTransit, selectedRoute, subwaySource, trainSource, busSource);
    updateLocations(selectedTransit, selectedRoute, subwayLocationsSource, trainLocationsSource, busLocationsSource);

    // Set an interval to periodically update locations
    const intervalId = setInterval(() => {
      updateLocations(selectedTransit, selectedRoute, subwayLocationsSource, trainLocationsSource, busLocationsSource);
    }, 5000);

    // Cleanup: clear interval and remove layers on dependency change or component unmount
    return () => {
      clearInterval(intervalId);
      removeLayers(map, [subwayStopLayer, subwayLocationsLayer, trainStopLayer, trainLocationsLayer, busStopLayer, busLocationsLayer]);
    };
  }, [map, selectedTransit, selectedRoute]); // This effect depends on map, selectedTransit, and selectedRoute

  // Component rendering logic
  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1 }}>
        {/* Dropdowns for selecting transit type and route */}
        <select value={selectedTransit} onChange={(e) => setSelectedTransit(e.target.value)}>
          <option value="">Select Transit</option>
          {/* Options for transit types */}
          <option value="0">Subway Light Rail</option>
          <option value="1">Subway Heavy Rail</option>
          <option value="2">Commuter Rail</option>
          <option value="3">Bus</option>
        </select>
        {selectedTransit !== '' && (
          <select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
            <option value="">Select Route</option>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.attributes.long_name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
    </div>
  );
};

// Supporting functions for creating vector layers, updating layers, adding/removing layers, fetching stops, and updating locations are defined below.

// Utility function to create a vector layer with specified properties
function createVectorLayer(source, iconSrc, scale, anchor = [0.5, 0.5]) {
  return new VectorLayer({
    source: source, // VectorSource containing the features to be rendered
    style: new Style({
      image: new Icon({
        anchor: anchor, // Anchor point of the icon (center by default)
        src: iconSrc, // Path to the icon image
        scale: scale, // Scale factor to size the icon appropriately
      }),
    }),
  });
}

// Function to add or remove layers based on the selected transit type
function updateLayers(
  selectedTransit,
  map,
  subwayStopLayer,
  subwayLocationsLayer,
  trainStopLayer,
  trainLocationsLayer,
  busStopLayer,
  busLocationsLayer
) {
  // First, remove all layers to reset the state
  removeLayers(map, [
    subwayStopLayer,
    subwayLocationsLayer,
    trainStopLayer,
    trainLocationsLayer,
    busStopLayer,
    busLocationsLayer,
  ]);

  // Based on the selected transit type, add the appropriate layers back to the map
  if (selectedTransit === '0') { // For Subway Light Rail
    addLayers(map, [subwayStopLayer, subwayLocationsLayer]);
  } else if (selectedTransit === '1') { // For Subway Heavy Rail
    addLayers(map, [subwayStopLayer, subwayLocationsLayer]);
  } else if (selectedTransit === '2') { // For Commuter Rail
    addLayers(map, [trainStopLayer, trainLocationsLayer]);
  } else if (selectedTransit === '3') { // For Bus
    addLayers(map, [busStopLayer, busLocationsLayer]);
  }
}

// Removes specified layers from the map
function removeLayers(map, layers) {
  layers.forEach(layer => map.removeLayer(layer)); // Iterate over and remove each layer
}

// Adds specified layers to the map
function addLayers(map, layers) {
  layers.forEach(layer => map.addLayer(layer)); // Iterate over and add each layer
}

// Fetches and displays stops for the selected transit type and route
async function fetchStops(selectedTransit, selectedRoute, subwaySource, trainSource, busSource) {
  try {
    const response = await axios.get(
      `https://api-v3.mbta.com/stops?filter[route]=${selectedRoute}`
    );
    const stops = response.data.data; // Extract stops data from response
    // Convert stop data to OpenLayers features with appropriate geometry
    const features = stops.map(stop => {
      const coordinates = fromLonLat([
        parseFloat(stop.attributes.longitude),
        parseFloat(stop.attributes.latitude),
      ]);
      return new Feature({
        geometry: new Point(coordinates),
      });
    });
    // Depending on the selected transit type, add features to the appropriate source
    if (selectedTransit === '0' || selectedTransit === '1') {
      subwaySource.clear();
      subwaySource.addFeatures(features);
    } else if (selectedTransit === '2') {
      trainSource.clear();
      trainSource.addFeatures(features);
    } else if (selectedTransit === '3') {
      busSource.clear();
      busSource.addFeatures(features);
    }
  } catch (error) {
    console.error('Error fetching stops:', error);
  }
}

// Updates the vehicle locations on the map for the selected route
async function updateLocations(
  selectedTransit,
  selectedRoute,
  subwayLocationsSource,
  trainLocationsSource,
  busLocationsSource
) {
  try {
    const response = await axios.get(
      `https://api-v3.mbta.com/vehicles?filter[route]=${selectedRoute}`
    );
    const vehicles = response.data.data; // Extract vehicle data from response
    // Convert vehicle data to OpenLayers features with appropriate geometry
    const features = vehicles.map(vehicle => {
      const coordinates = fromLonLat([
        parseFloat(vehicle.attributes.longitude),
        parseFloat(vehicle.attributes.latitude),
      ]);
      return new Feature({
        geometry: new Point(coordinates),
      });
    });
    // Depending on the selected transit type, update the appropriate source with new locations
    if (selectedTransit === '0' || selectedTransit === '1') {
      subwayLocationsSource.clear();
      subwayLocationsSource.addFeatures(features);
    } else if (selectedTransit === '2') {
      trainLocationsSource.clear();
      trainLocationsSource.addFeatures(features);
    } else if (selectedTransit === '3') {
      busLocationsSource.clear();
      busLocationsSource.addFeatures(features);
    }
  } catch (error) {
    console.error('Error updating vehicle locations:', error);
  }
}

export default LiveMap;
