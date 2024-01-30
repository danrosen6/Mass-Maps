
import React, { useEffect, useRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import "./MapContainer.css";

const MapContainer = () => {
    const mapRef = useRef();

    useEffect(() => {
        new Map({
            target: mapRef.current,
            layers: [
                new TileLayer({
                    source: new OSM()
                })
            ],
            view: new View({
                center: [-7910361.335273651, 5215196.272155075], 
                zoom: 15,
                maxZoom: 40,  
                minZoom: 10, 
            })
        });
    }, []);

    return <div className = "map-container" ref={mapRef} />;
};

export default MapContainer;