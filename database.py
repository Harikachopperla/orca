"""
ORCA – Marine Ecosystem Intelligence
Database Module & Seed Data Generator
Using SQLite for structured storage of stations, readings, species, and alerts.
All sample datasets are clearly labelled as illustrative sample/historical data.
"""

import os
import sqlite3
import json
import random
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), 'orca.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Monitoring Stations
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS stations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        region TEXT NOT NULL,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        station_type TEXT NOT NULL,
        depth_m REAL NOT NULL,
        status TEXT NOT NULL,
        source_authority TEXT NOT NULL,
        baseline_temp_c REAL NOT NULL,
        baseline_turbidity_ntu REAL NOT NULL,
        baseline_salinity_psu REAL NOT NULL,
        baseline_dissolved_oxygen_mgl REAL NOT NULL,
        baseline_ph REAL NOT NULL,
        last_ping TEXT NOT NULL
    )
    ''')

    # 2. Environmental Readings (Time-series)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS environmental_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        temperature_c REAL NOT NULL,
        turbidity_ntu REAL NOT NULL,
        salinity_psu REAL NOT NULL,
        dissolved_oxygen_mgl REAL NOT NULL,
        ph_level REAL NOT NULL,
        chlorophyll_a REAL NOT NULL,
        ocean_current_speed_ms REAL NOT NULL,
        anomaly_score REAL DEFAULT 0.0,
        is_anomaly INTEGER DEFAULT 0,
        data_source TEXT NOT NULL,
        is_sample_data INTEGER DEFAULT 1,
        FOREIGN KEY (station_id) REFERENCES stations (id)
    )
    ''')

    # 3. Marine Species / Biodiversity Observations
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS marine_species (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id TEXT NOT NULL,
        species_name TEXT NOT NULL,
        common_name TEXT NOT NULL,
        category TEXT NOT NULL,
        conservation_status TEXT NOT NULL,
        count_observed INTEGER NOT NULL,
        habitat_health_index REAL NOT NULL,
        observation_date TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (station_id) REFERENCES stations (id)
    )
    ''')

    # 4. Alerts and Investigation Flags
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        station_id TEXT NOT NULL,
        station_name TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        anomaly_type TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        confidence_score REAL NOT NULL,
        supporting_evidence TEXT NOT NULL,
        recommended_actions TEXT NOT NULL,
        status TEXT NOT NULL,
        human_verified INTEGER DEFAULT 0,
        verifier_notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (station_id) REFERENCES stations (id)
    )
    ''')

    # 5. Multi-Agent Audit Log
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS agent_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        execution_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        station_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        status TEXT NOT NULL,
        summary TEXT NOT NULL,
        raw_payload_json TEXT NOT NULL
    )
    ''')

    conn.commit()
    conn.close()

def seed_database(force=False):
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if stations exist
    cursor.execute('SELECT COUNT(*) as count FROM stations')
    count = cursor.fetchone()['count']
    if count > 0 and not force:
        conn.close()
        return

    # Clear existing if force
    if force:
        cursor.execute('DELETE FROM agent_audit_logs')
        cursor.execute('DELETE FROM alerts')
        cursor.execute('DELETE FROM marine_species')
        cursor.execute('DELETE FROM environmental_readings')
        cursor.execute('DELETE FROM stations')

    # 8 Realistic Global & Regional Marine Monitoring Stations
    stations_data = [
        (
            'STN-001',
            'Gulf of Mannar Marine Biosphere - Buoy A1',
            'Indo-Pacific / Bay of Bengal',
            9.1500, 79.2000,
            'Coastal Environmental Buoy',
            18.5,
            'NEEDS_VERIFICATION',
            'INCOIS / Copernicus Marine Sentinel-3 (Sample Feed)',
            27.2, 3.5, 33.8, 6.8, 8.18,
            (datetime.now() - timedelta(minutes=4)).strftime('%Y-%m-%d %H:%M:%S')
        ),
        (
            'STN-002',
            'Monterey Bay Sanctuary - Deep Ridge M2',
            'Eastern North Pacific',
            36.7000, -122.0200,
            'Deep Moored Ocean Array',
            120.0,
            'NORMAL',
            'NOAA NDBC / MBARI Moorings (Sample Feed)',
            13.8, 1.8, 33.6, 7.5, 8.05,
            (datetime.now() - timedelta(minutes=12)).strftime('%Y-%m-%d %H:%M:%S')
        ),
        (
            'STN-003',
            'Great Barrier Reef - Outer Shelf Platform',
            'Coral Sea / Western Pacific',
            -18.2871, 147.7000,
            'Reef Sensor & Biometric Array',
            22.0,
            'INVESTIGATION',
            'AIMS / NASA Earthdata MODIS (Sample Feed)',
            26.4, 2.1, 35.1, 6.2, 8.12,
            (datetime.now() - timedelta(minutes=8)).strftime('%Y-%m-%d %H:%M:%S')
        ),
        (
            'STN-004',
            'Florida Keys Coral Sanctuary - Key Largo',
            'Western Atlantic / Caribbean Gate',
            25.0100, -80.3800,
            'Shallow Coral Reef Node',
            11.0,
            'NORMAL',
            'NOAA Coral Reef Watch / NASA (Sample Feed)',
            28.1, 2.4, 35.8, 6.4, 8.20,
            (datetime.now() - timedelta(minutes=18)).strftime('%Y-%m-%d %H:%M:%S')
        ),
        (
            'STN-005',
            'Dogger Bank Protected Zone - North Buoy',
            'North Sea (UK / Netherlands)',
            54.7500, 2.5000,
            'Offshore Wind & Benthic Array',
            32.0,
            'NORMAL',
            'Copernicus Marine In-Situ / Cefas (Sample Feed)',
            11.2, 4.0, 34.5, 7.9, 8.08,
            (datetime.now() - timedelta(minutes=25)).strftime('%Y-%m-%d %H:%M:%S')
        ),
        (
            'STN-006',
            'Arabian Sea Upwelling Zone - Kochi Deep Array',
            'Arabian Sea / Indian Ocean',
            9.9312, 75.8500,
            'Pelagic Upwelling Station',
            65.0,
            'NORMAL',
            'INCOIS OMNI Network (Sample Feed)',
            28.0, 3.8, 35.4, 5.9, 8.10,
            (datetime.now() - timedelta(minutes=6)).strftime('%Y-%m-%d %H:%M:%S')
        ),
        (
            'STN-007',
            'Galapagos Marine Reserve - Wolf Island Node',
            'Equatorial Eastern Pacific',
            1.3800, -91.8200,
            'Pelagic Biodiversity Mooring',
            45.0,
            'NORMAL',
            'Charles Darwin Research / NOAA (Sample Feed)',
            22.5, 1.5, 34.9, 7.1, 8.15,
            (datetime.now() - timedelta(minutes=15)).strftime('%Y-%m-%d %H:%M:%S')
        ),
        (
            'STN-008',
            'Bay of Bengal Coastal Sentinel - Chennai Estuary',
            'Bay of Bengal Nearshore',
            13.0827, 80.3200,
            'Nearshore Estuarine Node',
            14.0,
            'NORMAL',
            'INCOIS / State Coastal Authority (Sample Feed)',
            28.6, 5.2, 32.5, 5.8, 7.95,
            (datetime.now() - timedelta(minutes=3)).strftime('%Y-%m-%d %H:%M:%S')
        )
    ]

    cursor.executemany('''
    INSERT INTO stations (id, name, region, lat, lon, station_type, depth_m, status, source_authority,
                         baseline_temp_c, baseline_turbidity_ntu, baseline_salinity_psu, baseline_dissolved_oxygen_mgl,
                         baseline_ph, last_ping)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', stations_data)

    # Generate 30 days of realistic time-series readings for all stations
    random.seed(42)
    now = datetime.now()
    readings = []

    for stn in stations_data:
        stn_id = stn[0]
        base_temp = stn[9]
        base_turb = stn[10]
        base_sal = stn[11]
        base_do = stn[12]
        base_ph = stn[13]

        for day in range(30, 0, -1):
            # 2 readings per day: morning and dusk
            for hour in [6, 18]:
                timestamp = (now - timedelta(days=day, hours=-hour)).strftime('%Y-%m-%d %H:%M:%S')
                
                # Normal fluctuations
                temp = round(base_temp + random.gauss(0, 0.4), 2)
                turb = max(0.5, round(base_turb + random.gauss(0, 0.35), 2))
                sal = round(base_sal + random.gauss(0, 0.25), 2)
                do = round(base_do + random.gauss(0, 0.2), 2)
                ph = round(base_ph + random.gauss(0, 0.04), 2)
                chla = round(max(0.1, 0.8 + random.gauss(0, 0.15)), 2)
                current = round(max(0.05, 0.45 + random.gauss(0, 0.1)), 2)
                
                anomaly_score = round(random.uniform(0.02, 0.15), 3)
                is_anomaly = 0

                readings.append((
                    stn_id, timestamp, temp, turb, sal, do, ph, chla, current,
                    anomaly_score, is_anomaly, 'INCOIS/Copernicus/NOAA Historical Sample', 1
                ))

    # Insert demonstration scenario for STN-001 (Gulf of Mannar) as latest reading
    # Scenario: Temp: 31°C, Turbidity: 18 NTU, Salinity: 35 PSU
    demo_timestamp = (now - timedelta(minutes=4)).strftime('%Y-%m-%d %H:%M:%S')
    readings.append((
        'STN-001',
        demo_timestamp,
        31.0,   # 31°C (Deviates significantly from baseline 27.2°C)
        18.0,   # 18 NTU (Deviates significantly from baseline 3.5 NTU)
        35.0,   # 35 PSU (Deviates from baseline 33.8 PSU)
        4.3,    # Dissolved oxygen lower than normal
        7.85,   # Slightly depressed pH
        2.85,   # Elevated chlorophyll/organic matter
        0.72,   # Current speed
        0.875,  # High ML anomaly score
        1,      # Is Anomaly
        'INCOIS Coastal Real-Time Feed (Demonstration Sample)',
        1
    ))

    # Also add standard current readings for the rest of stations so all have current reading
    for stn in stations_data:
        if stn[0] == 'STN-001':
            continue
        readings.append((
            stn[0],
            (now - timedelta(minutes=random.randint(5, 25))).strftime('%Y-%m-%d %H:%M:%S'),
            round(stn[9] + random.uniform(-0.3, 0.3), 2),
            round(stn[10] + random.uniform(-0.2, 0.3), 2),
            round(stn[11] + random.uniform(-0.1, 0.2), 2),
            round(stn[12] + random.uniform(-0.2, 0.2), 2),
            round(stn[13] + random.uniform(-0.03, 0.03), 2),
            round(0.85 + random.uniform(-0.1, 0.1), 2),
            round(0.40 + random.uniform(-0.05, 0.05), 2),
            round(random.uniform(0.04, 0.18), 3),
            0,
            'Copernicus/NOAA/INCOIS Station Feed',
            1
        ))

    cursor.executemany('''
    INSERT INTO environmental_readings (
        station_id, timestamp, temperature_c, turbidity_ntu, salinity_psu,
        dissolved_oxygen_mgl, ph_level, chlorophyll_a, ocean_current_speed_ms,
        anomaly_score, is_anomaly, data_source, is_sample_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', readings)

    # 3. Marine Species / Biodiversity Seed Data
    species_data = [
        ('STN-001', 'Dugong dugon', 'Dugong (Sea Cow)', 'Marine Mammal', 'Vulnerable (VU)', 6, 72.5, '2026-10-28', 'Observed grazing on seagrass meadows off Pamban island.'),
        ('STN-001', 'Acropora formosa', 'Staghorn Coral', 'Coral / Invertebrate', 'Critically Endangered (CR)', 45, 61.0, '2026-11-02', 'Showing thermal stress discoloration at 4m depth.'),
        ('STN-001', 'Chelonia mydas', 'Green Sea Turtle', 'Reptile', 'Endangered (EN)', 14, 78.0, '2026-11-04', 'Nesting track surveys recorded near Dhanushkodi beach.'),
        ('STN-002', 'Enhydra lutris', 'Southern Sea Otter', 'Marine Mammal', 'Endangered (EN)', 28, 88.0, '2026-11-01', 'Foraging actively within Macrocystis pyrifera kelp canopy.'),
        ('STN-002', 'Megaptera novaeangliae', 'Humpback Whale', 'Marine Mammal', 'Least Concern (LC)', 8, 92.0, '2026-11-03', 'Southward migratory pod recorded via acoustic hydrophone.'),
        ('STN-003', 'Chelonia mydas', 'Green Sea Turtle', 'Reptile', 'Endangered (EN)', 32, 74.0, '2026-10-30', 'Feeding on algae beds along ribbon reef outer ledge.'),
        ('STN-003', 'Acropora millepora', 'Cluster Coral', 'Coral / Invertebrate', 'Near Threatened (NT)', 120, 68.0, '2026-11-05', 'Bleaching monitoring zone: mild thermal stress noted.'),
        ('STN-004', 'Tursiops truncatus', 'Common Bottlenose Dolphin', 'Marine Mammal', 'Least Concern (LC)', 19, 85.0, '2026-11-02', 'Resident pod observed in Hawk Channel shallows.'),
        ('STN-006', 'Sardinella longiceps', 'Indian Oil Sardine', 'Pelagic Fish', 'Least Concern (LC)', 2400, 79.0, '2026-11-04', 'Upwelling nutrient plume supporting dense pelagic schooling.'),
        ('STN-007', 'Amblyrhynchus cristatus', 'Marine Iguana', 'Reptile', 'Vulnerable (VU)', 55, 91.0, '2026-11-03', 'Basking and intertidal foraging along basalt shoreline.')
    ]

    cursor.executemany('''
    INSERT INTO marine_species (
        station_id, species_name, common_name, category, conservation_status,
        count_observed, habitat_health_index, observation_date, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', species_data)

    # 4. Demonstration Alerts Pre-seeded
    alerts_data = [
        (
            'ALT-2026-0891',
            'STN-001',
            'Gulf of Mannar Marine Biosphere - Buoy A1',
            demo_timestamp,
            'Coupled Thermal Spike & High Turbidity Surge',
            'Moderate (Needs Verification)',
            88.4,
            json.dumps({
                "temperature": {"observed": 31.0, "baseline": 27.2, "deviation": "+3.8°C", "unit": "°C"},
                "turbidity": {"observed": 18.0, "baseline": 3.5, "deviation": "+14.5 NTU", "unit": "NTU"},
                "salinity": {"observed": 35.0, "baseline": 33.8, "deviation": "+1.2 PSU", "unit": "PSU"},
                "dissolved_oxygen": {"observed": 4.3, "baseline": 6.8, "deviation": "-2.5 mg/L", "unit": "mg/L"}
            }),
            json.dumps([
                "Deploy coastal patrol boat or autonomous surface vessel (ASV) for localized physical water sampling.",
                "Cross-reference recent dredging activities, agricultural runoff, or storm events in Mandapam/Rameswaram.",
                "Review Copernicus Sentinel-2 Level-2A imagery for suspended particulate matter plume tracking.",
                "Verify sensor calibration on Buoy A1 optical nephelometer to rule out biological fouling on sensor head."
            ]),
            'Needs Verification',
            0,
            None,
            demo_timestamp
        ),
        (
            'ALT-2026-0888',
            'STN-003',
            'Great Barrier Reef - Outer Shelf Platform',
            (now - timedelta(hours=36)).strftime('%Y-%m-%d %H:%M:%S'),
            'Thermal Accumulation (Degree Heating Alert)',
            'Low',
            64.2,
            json.dumps({
                "temperature": {"observed": 28.1, "baseline": 26.4, "deviation": "+1.7°C", "unit": "°C"},
                "turbidity": {"observed": 2.2, "baseline": 2.1, "deviation": "+0.1 NTU", "unit": "NTU"}
            }),
            json.dumps([
                "Monitor NOAA Coral Reef Watch 5km satellite thermal indices.",
                "Schedule diver survey for early signs of bleaching in shallow Acropora colonies."
            ]),
            'Acknowledged',
            1,
            'Reviewed by Marine Park Ranger: Routine summer accumulation, monitoring active.',
            (now - timedelta(hours=36)).strftime('%Y-%m-%d %H:%M:%S')
        )
    ]

    cursor.executemany('''
    INSERT INTO alerts (
        id, station_id, station_name, timestamp, anomaly_type, risk_level,
        confidence_score, supporting_evidence, recommended_actions, status,
        human_verified, verifier_notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', alerts_data)

    conn.commit()
    conn.close()
    print("ORCA Database initialized and seeded successfully.")

if __name__ == '__main__':
    seed_database(force=True)

