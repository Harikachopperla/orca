/**
 * ORCA – Interactive Ocean Map Module
 * Uses Leaflet.js with multi-layer oceanic basemaps and fallback reliability.
 */

window.orcaMapManager = null;
let leafletMapInstance = null;
let mapMarkers = [];
let currentTileLayer = null;

// Available reliable tile providers
const TILE_PROVIDERS = {
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        options: {
            attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
            subdomains: 'abcd',
            maxZoom: 19
        }
    },
    ocean: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
        options: {
            attribution: '&copy; Esri, GEBCO, NOAA, National Geographic, DeLorme',
            maxZoom: 13
        }
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        options: {
            attribution: '&copy; Esri, Maxar, Earthstar Geographics, USDA, USGS',
            maxZoom: 18
        }
    },
    osm: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }
    }
};

window.initOceanMap = function(stations) {
    const mapElement = document.getElementById('oceanMap');
    if (!mapElement) return;

    // If map already initialized, just update markers and resize
    if (leafletMapInstance) {
        if (stations && stations.length > 0) {
            renderMapMarkers(stations);
        }
        setTimeout(() => {
            leafletMapInstance.invalidateSize(true);
        }, 100);
        return;
    }

    try {
        // Create Leaflet instance
        leafletMapInstance = L.map('oceanMap', {
            center: [15.0, 30.0],
            zoom: 2,
            minZoom: 2,
            maxZoom: 16,
            zoomControl: true,
            worldCopyJump: true
        });

        // Set default Dark Nautical layer with automatic OSM fallback
        currentTileLayer = L.tileLayer(TILE_PROVIDERS.dark.url, TILE_PROVIDERS.dark.options);
        
        // Error fallback: if Carto fails, switch to standard OSM
        currentTileLayer.on('tileerror', function() {
            console.warn('Dark tile failed to load, switching to OpenStreetMap fallback.');
            if (leafletMapInstance && currentTileLayer) {
                leafletMapInstance.removeLayer(currentTileLayer);
                currentTileLayer = L.tileLayer(TILE_PROVIDERS.osm.url, TILE_PROVIDERS.osm.options).addTo(leafletMapInstance);
            }
        });

        currentTileLayer.addTo(leafletMapInstance);
        window.orcaMapManager = leafletMapInstance;

        // Render station markers
        const stationList = stations || (ORCA_STATE ? ORCA_STATE.stations : []);
        if (stationList && stationList.length > 0) {
            renderMapMarkers(stationList);
        }

        // Multiple invalidation calls to guarantee perfect rendering in any tab state
        setTimeout(() => leafletMapInstance.invalidateSize(true), 100);
        setTimeout(() => leafletMapInstance.invalidateSize(true), 350);
        setTimeout(() => leafletMapInstance.invalidateSize(true), 800);

    } catch (e) {
        console.error('Error initializing Leaflet map:', e);
    }
};

window.switchMapBasemap = function(type) {
    if (!leafletMapInstance) return;
    const provider = TILE_PROVIDERS[type] || TILE_PROVIDERS.dark;

    if (currentTileLayer) {
        leafletMapInstance.removeLayer(currentTileLayer);
    }

    currentTileLayer = L.tileLayer(provider.url, provider.options).addTo(leafletMapInstance);

    // Update active button state
    document.querySelectorAll('.btn-map-layer').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-layer') === type);
    });
};

function renderMapMarkers(stations) {
    if (!leafletMapInstance) return;

    // Clear existing markers
    mapMarkers.forEach(m => leafletMapInstance.removeLayer(m));
    mapMarkers = [];

    const latLngs = [];

    stations.forEach(stn => {
        const isAlert = stn.status === 'NEEDS_VERIFICATION' || stn.status === 'INVESTIGATION';
        const markerColor = isAlert ? '#f59e0b' : '#00f2fe';
        const pulseEffect = isAlert ? 'animation: pulseGlow 1.5s infinite;' : '';

        // Glowing buoy icon
        const customIcon = L.divIcon({
            className: 'orca-station-icon',
            html: `
                <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                    <div style="position: absolute; width: 28px; height: 28px; background: ${markerColor}; opacity: 0.35; border-radius: 50%; ${pulseEffect}"></div>
                    <div style="width: 14px; height: 14px; background: ${markerColor}; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 0 12px ${markerColor};"></div>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const r = stn.latest_reading || {};
        const popupContent = `
            <div style="padding: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #040c1a; min-width: 230px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="color: #040c1a; font-size: 13px;">${stn.id}</strong>
                    <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; background: ${isAlert ? '#fef3c7' : '#d1fae5'}; color: ${isAlert ? '#b45309' : '#065f46'};">
                        ${stn.status}
                    </span>
                </div>
                <h4 style="font-size: 13.5px; margin: 0 0 4px 0; color: #0f2b48; line-height: 1.3;">${stn.name}</h4>
                <div style="font-size: 11px; color: #64748b; margin-bottom: 10px;">${stn.region} • Depth: ${stn.depth_m}m</div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; margin-bottom: 10px;">
                    <div>Temp: <strong style="color: #0f2b48;">${r.temperature_c ?? '--'}°C</strong></div>
                    <div>Turbidity: <strong style="color: ${(r.turbidity_ntu || 0) > 8 ? '#dc2626' : '#0f2b48'};">${r.turbidity_ntu ?? '--'} NTU</strong></div>
                    <div>Salinity: <strong style="color: #0f2b48;">${r.salinity_psu ?? '--'} PSU</strong></div>
                    <div>DO: <strong style="color: ${(r.dissolved_oxygen_mgl || 0) < 5 ? '#d97706' : '#0f2b48'};">${r.dissolved_oxygen_mgl ?? '--'} mg/L</strong></div>
                </div>

                <div style="font-size: 10px; color: #94a3b8; margin-bottom: 10px;">Source: ${stn.source_authority}</div>

                <button onclick="inspectStation('${stn.id}')" style="width: 100%; background: linear-gradient(135deg, #0284c7 0%, #1e60ff 100%); color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 11.5px; font-weight: 700; box-shadow: 0 2px 8px rgba(2,132,199,0.3);">
                    Inspect Telemetry & Baselines →
                </button>
            </div>
        `;

        const marker = L.marker([stn.lat, stn.lon], { icon: customIcon })
            .bindPopup(popupContent, { maxWidth: 280, closeButton: true })
            .addTo(leafletMapInstance);

        mapMarkers.push(marker);
        latLngs.push([stn.lat, stn.lon]);
    });

    // Fit map bounds if multiple markers exist
    if (latLngs.length > 1 && !isPlumeConeActive) {
        try {
            leafletMapInstance.fitBounds(latLngs, { padding: [50, 50], maxZoom: 5 });
        } catch (e) {}
    }
}

// Plume Dispersion Cone Overlay
let plumeLayerGroup = null;
let isPlumeConeActive = false;

window.togglePlumeDispersionCone = function() {
    if (!leafletMapInstance) return;

    if (isPlumeConeActive && plumeLayerGroup) {
        leafletMapInstance.removeLayer(plumeLayerGroup);
        plumeLayerGroup = null;
        isPlumeConeActive = false;
        leafletMapInstance.flyTo([15.0, 30.0], 2, { duration: 1.2 });
        const btn = document.getElementById('btnTogglePlumeCone');
        if (btn) btn.innerHTML = '🌊 Toggle Plume Drift Cone';
        return;
    }

    const originLat = 9.15;
    const originLon = 79.20;

    plumeLayerGroup = L.layerGroup();

    const coneCoords = [
        [originLat, originLon],
        [9.35, 79.48],
        [9.55, 79.65],
        [9.70, 79.50],
        [9.40, 79.25],
        [originLat, originLon]
    ];

    const plumePolygon = L.polygon(coneCoords, {
        color: '#f59e0b',
        weight: 2,
        fillColor: '#f59e0b',
        fillOpacity: 0.28,
        dashArray: '5, 5'
    }).bindPopup(`
        <div style="font-size: 12px; color: #040c1a;">
            <strong style="color: #b45309;">Simulated Particulate Plume Dispersion Cone</strong><br>
            • Velocity: 0.72 m/s @ 045° (NE)<br>
            • 12h Downstream Area: ~42 km²<br>
            • High Risk: Palk Bay Seagrass Beds
        </div>
    `);

    const ring6h = L.circle([originLat, originLon], {
        radius: 15500,
        color: '#fbbf24',
        weight: 1.5,
        fillOpacity: 0.08,
        dashArray: '4, 4'
    }).bindTooltip("6h Reach (15.5 km)", { permanent: true, direction: "right" });

    const ring12h = L.circle([originLat, originLon], {
        radius: 31000,
        color: '#f87171',
        weight: 1.5,
        fillOpacity: 0.05,
        dashArray: '4, 4'
    }).bindTooltip("12h Reach (31 km)", { permanent: true, direction: "right" });

    plumeLayerGroup.addLayer(plumePolygon);
    plumeLayerGroup.addLayer(ring6h);
    plumeLayerGroup.addLayer(ring12h);

    plumeLayerGroup.addTo(leafletMapInstance);
    isPlumeConeActive = true;

    leafletMapInstance.flyTo([9.40, 79.35], 9, { duration: 1.5 });

    const btn = document.getElementById('btnTogglePlumeCone');
    if (btn) btn.innerHTML = '✕ Clear Dispersion Cone';
};

window.filterMapStations = function(filterType) {
    if (!ORCA_STATE.stations || !leafletMapInstance) return;

    let filtered = ORCA_STATE.stations;
    if (filterType === 'alerts') {
        filtered = ORCA_STATE.stations.filter(s => s.status === 'NEEDS_VERIFICATION' || s.status === 'INVESTIGATION');
    } else if (filterType === 'normal') {
        filtered = ORCA_STATE.stations.filter(s => s.status === 'NORMAL');
    }
    renderMapMarkers(filtered);
};
