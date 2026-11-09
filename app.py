"""
ORCA – Marine Ecosystem Intelligence
Main Flask Application Server
Integrates REST APIs, Database, ML Anomaly Detector, and Collaborative Multi-Agent System.
Tagline: "ORCA – From Ocean Data to Informed Action."
"""

import os
import json
import sqlite3
import io
import csv
from datetime import datetime, timedelta
from flask import Flask, render_template, jsonify, request, send_file, Response

from database import init_db, seed_database, get_db_connection
from agents.agent_orchestrator import run_orca_agent_pipeline
from ml.anomaly_model import get_anomaly_detector

app = Flask(__name__)
app.config['SECRET_KEY'] = 'orca-marine-ecosystem-intelligence-2026-secret'

# Ensure database is initialized and seeded on startup
@app.before_request
def check_db_initialized():
    pass

# Initialize DB on load
seed_database(force=False)
detector = get_anomaly_detector()

# ==========================================
# PAGE ROUTES
# ==========================================

@app.route('/')
def index():
    """Main Single-Page Application interface housing all 10 modules."""
    return render_template('index.html')

# ==========================================
# REST API ENDPOINTS
# ==========================================

@app.route('/api/stations', methods=['GET'])
def get_stations():
    """Returns all 8 monitoring stations with their latest readings and status."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM stations ORDER BY id ASC")
    stations = [dict(row) for row in cursor.fetchall()]

    # Attach latest reading for each station
    for stn in stations:
        cursor.execute("""
            SELECT * FROM environmental_readings
            WHERE station_id = ?
            ORDER BY timestamp DESC
            LIMIT 1
        """, (stn['id'],))
        latest = cursor.fetchone()
        stn['latest_reading'] = dict(latest) if latest else None

        # Count active alerts for this station
        cursor.execute("SELECT COUNT(*) as alert_count FROM alerts WHERE station_id = ? AND status != 'Resolved'", (stn['id'],))
        stn['active_alerts_count'] = cursor.fetchone()['alert_count']

    conn.close()
    return jsonify({
        "success": True,
        "count": len(stations),
        "data_notice": "Illustrative sample dataset representing coastal & offshore ocean monitoring stations.",
        "stations": stations
    })

@app.route('/api/stations/<station_id>', methods=['GET'])
def get_station_detail(station_id):
    """Returns detailed station telemetry, 30-day time series, and biodiversity entries."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM stations WHERE id = ?", (station_id,))
    station = cursor.fetchone()
    if not station:
        conn.close()
        return jsonify({"success": False, "error": "Station not found"}), 404

    station_data = dict(station)

    # 50 most recent readings
    cursor.execute("""
        SELECT * FROM environmental_readings
        WHERE station_id = ?
        ORDER BY timestamp DESC
        LIMIT 60
    """, (station_id,))
    readings = [dict(r) for r in cursor.fetchall()]

    # Species for station
    cursor.execute("SELECT * FROM marine_species WHERE station_id = ?", (station_id,))
    species = [dict(s) for s in cursor.fetchall()]

    # Alerts for station
    cursor.execute("SELECT * FROM alerts WHERE station_id = ? ORDER BY timestamp DESC", (station_id,))
    alerts = [dict(a) for a in cursor.fetchall()]

    conn.close()
    return jsonify({
        "success": True,
        "station": station_data,
        "readings": readings,
        "species": species,
        "alerts": alerts
    })

@app.route('/api/readings/historical', methods=['GET'])
def get_historical_readings():
    """Returns chronologically ordered time-series for charts and baseline comparisons."""
    station_id = request.args.get('station_id', 'STN-001')
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT timestamp, temperature_c, turbidity_ntu, salinity_psu,
               dissolved_oxygen_mgl, ph_level, chlorophyll_a, ocean_current_speed_ms,
               anomaly_score, is_anomaly
        FROM environmental_readings
        WHERE station_id = ?
        ORDER BY timestamp ASC
    """, (station_id,))
    readings = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM stations WHERE id = ?", (station_id,))
    station = cursor.fetchone()
    baselines = dict(station) if station else {}

    conn.close()
    return jsonify({
        "success": True,
        "station_id": station_id,
        "baselines": baselines,
        "readings": readings
    })

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Returns active and historical alerts."""
    status_filter = request.args.get('status')
    conn = get_db_connection()
    cursor = conn.cursor()

    if status_filter:
        cursor.execute("SELECT * FROM alerts WHERE status = ? ORDER BY timestamp DESC", (status_filter,))
    else:
        cursor.execute("SELECT * FROM alerts ORDER BY timestamp DESC")

    alerts = []
    for r in cursor.fetchall():
        item = dict(r)
        try:
            item['supporting_evidence'] = json.loads(item['supporting_evidence'])
        except Exception:
            pass
        try:
            item['recommended_actions'] = json.loads(item['recommended_actions'])
        except Exception:
            pass
        alerts.append(item)

    conn.close()
    return jsonify({
        "success": True,
        "count": len(alerts),
        "alerts": alerts
    })

@app.route('/api/alerts/<alert_id>/verify', methods=['POST'])
def verify_alert(alert_id):
    """
    Human-in-the-loop expert verification endpoint.
    Allows oceanographers/coastal managers to mark an alert as verified, acknowledged, or dismissed.
    """
    data = request.get_json() or {}
    new_status = data.get('status', 'Verified by Human Expert')
    notes = data.get('notes', 'Operator conducted field validation assessment.')

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,))
    alert = cursor.fetchone()
    if not alert:
        conn.close()
        return jsonify({"success": False, "error": "Alert ID not found"}), 404

    cursor.execute("""
        UPDATE alerts
        SET status = ?, human_verified = 1, verifier_notes = ?
        WHERE id = ?
    """, (new_status, notes, alert_id))

    # Also log to agent audit logs
    cursor.execute("""
        INSERT INTO agent_audit_logs (execution_id, timestamp, station_id, agent_name, status, summary, raw_payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        f"HUMAN-VERIFY-{alert_id}",
        datetime.now().isoformat(),
        alert['station_id'],
        "Human Decision-Maker / Oceanographer",
        "VERIFIED",
        f"Alert {alert_id} verified with status '{new_status}'. Notes: {notes}",
        json.dumps({"alert_id": alert_id, "action": new_status, "notes": notes})
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "alert_id": alert_id,
        "updated_status": new_status,
        "notes": notes,
        "message": "Human verification recorded in audit trail."
    })

@app.route('/api/agents/status', methods=['GET'])
def get_agents_status():
    """Returns metadata, status, and responsibilities for all 6 specialized agents."""
    agents_info = [
        {
            "id": "agent_pollution",
            "name": "Pollution Detection Agent",
            "role": "Water Quality & Spill Indicator Monitoring",
            "status": "ACTIVE / READY",
            "capabilities": ["Turbidity deviation tracking", "Optical backscatter analysis", "Spill & sediment plume detection", "Biochemical Oxygen Demand (BOD) flag"],
            "last_action": "Telemetry stream analysis nominal",
            "communication_format": "Structured JSON with confidence metrics"
        },
        {
            "id": "agent_ocean_conditions",
            "name": "Ocean Conditions Agent",
            "role": "Physical Hydrography & Thermohaline Monitoring",
            "status": "ACTIVE / READY",
            "capabilities": ["Sea Surface Temperature (SST) monitoring", "Salinity anomaly detection (PSU)", "Ocean current velocity tracking", "Seasonal baseline divergence calculation"],
            "last_action": "Thermohaline state evaluated across 8 stations",
            "communication_format": "Structured JSON with baseline deltas"
        },
        {
            "id": "agent_marine_life",
            "name": "Marine Life Agent",
            "role": "Biodiversity, Habitat Integrity & Ecological Stress Assessment",
            "status": "ACTIVE / READY",
            "capabilities": ["Coral thermal bleaching vulnerability assessment", "Seagrass PAR attenuation modeling", "Pelagic fish hypoxia index", "Species conservation status cross-referencing"],
            "last_action": "Ecosystem stress matrices updated",
            "communication_format": "Structured JSON with habitat indices"
        },
        {
            "id": "agent_anomaly_detection",
            "name": "Anomaly Detection Agent",
            "role": "Machine Learning Multivariate Outlier Scoring",
            "status": "ACTIVE / READY",
            "capabilities": ["Scikit-Learn IsolationForest algorithm", "Multi-variate Z-score statistical evaluation", "Synergistic multi-stressor cluster detection", "Normalized anomaly probability scoring"],
            "last_action": "Ensemble model inference online",
            "communication_format": "Calibrated anomaly probability [0.0 - 1.0]"
        },
        {
            "id": "agent_decision_support",
            "name": "Decision Support Agent",
            "role": "Cross-Agent Synthesis & Human Verification Guidance",
            "status": "ACTIVE / READY",
            "capabilities": ["Multi-agent evidence compilation", "Corroboration of physical vs chemical signals", "Field protocol recommendation engine", "Scientific reliability enforcement"],
            "last_action": "Verification recommendation synthesis active",
            "communication_format": "Protocol-driven action checklist"
        },
        {
            "id": "agent_alert_reporting",
            "name": "Alert and Reporting Agent",
            "role": "Alert Generation & Environmental Intelligence Reports",
            "status": "ACTIVE / READY",
            "capabilities": ["Unique Alert ID generation", "Risk level taxonomy enforcement", "Investigation report compilation", "Multi-format export (JSON, CSV, PDF/Print)"],
            "last_action": "Awaiting pipeline triggers",
            "communication_format": "Standardized Alert & Investigation Report"
        }
    ]
    return jsonify({
        "success": True,
        "agents": agents_info,
        "collaboration_model": "Sequential & Consensus Multi-Agent Architecture",
        "total_agents": 6
    })

@app.route('/api/simulation/run', methods=['POST'])
def run_simulation():
    """
    Runs the collaborative 6-agent pipeline on user-provided or custom readings.
    """
    payload = request.get_json() or {}
    station_id = payload.get('station_id', 'STN-001')

    observation = {
        'temperature_c': float(payload.get('temperature_c', 27.2)),
        'turbidity_ntu': float(payload.get('turbidity_ntu', 3.5)),
        'salinity_psu': float(payload.get('salinity_psu', 33.8)),
        'dissolved_oxygen_mgl': float(payload.get('dissolved_oxygen_mgl', 6.8)),
        'ph_level': float(payload.get('ph_level', 8.18)),
        'chlorophyll_a': float(payload.get('chlorophyll_a', 0.85)),
        'ocean_current_speed_ms': float(payload.get('ocean_current_speed_ms', 0.45))
    }

    persist = payload.get('persist_alert', True)
    result = run_orca_agent_pipeline(station_id, observation, persist_alert=persist)

    return jsonify({
        "success": True,
        "result": result
    })

@app.route('/api/simulation/demo-preset', methods=['POST'])
def run_demo_preset():
    """
    Executes the demonstration scenario specified in project requirements:
    Station: STN-001 (Gulf of Mannar)
    Temperature: 31°C
    Turbidity: 18 NTU
    Salinity: 35 PSU
    Dissolved Oxygen: 4.3 mg/L
    """
    demo_obs = {
        'temperature_c': 31.0,
        'turbidity_ntu': 18.0,
        'salinity_psu': 35.0,
        'dissolved_oxygen_mgl': 4.3,
        'ph_level': 7.85,
        'chlorophyll_a': 2.85,
        'ocean_current_speed_ms': 0.72
    }

    result = run_orca_agent_pipeline('STN-001', demo_obs, persist_alert=True)
    return jsonify({
        "success": True,
        "scenario_name": "Coastal Water Anomaly Demonstration Scenario",
        "parameters": demo_obs,
        "result": result
    })

@app.route('/api/marine-life', methods=['GET'])
def get_marine_life():
    """Returns biodiversity observations, species inventory, and habitat health."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT ms.*, s.name as station_name, s.region as station_region
        FROM marine_species ms
        JOIN stations s ON ms.station_id = s.id
        ORDER BY ms.habitat_health_index ASC
    """)
    species = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return jsonify({
        "success": True,
        "count": len(species),
        "species": species
    })

@app.route('/api/reports/summary', methods=['GET'])
def get_reports_summary():
    """Generates an executive environmental intelligence summary across all stations."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total_stations FROM stations")
    total_stations = cursor.fetchone()['total_stations']

    cursor.execute("SELECT COUNT(*) as total_alerts FROM alerts")
    total_alerts = cursor.fetchone()['total_alerts']

    cursor.execute("SELECT COUNT(*) as open_alerts FROM alerts WHERE status = 'Needs Verification'")
    open_alerts = cursor.fetchone()['open_alerts']

    cursor.execute("SELECT COUNT(*) as verified_alerts FROM alerts WHERE human_verified = 1")
    verified_alerts = cursor.fetchone()['verified_alerts']

    cursor.execute("SELECT COUNT(*) as total_readings FROM environmental_readings")
    total_readings = cursor.fetchone()['total_readings']

    cursor.execute("SELECT COUNT(*) as total_species FROM marine_species")
    total_species = cursor.fetchone()['total_species']

    cursor.execute("""
        SELECT station_name, anomaly_type, risk_level, confidence_score, status, timestamp
        FROM alerts
        ORDER BY timestamp DESC
        LIMIT 5
    """)
    recent_alerts = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return jsonify({
        "success": True,
        "summary": {
            "total_stations": total_stations,
            "total_readings": total_readings,
            "total_alerts": total_alerts,
            "open_alerts": open_alerts,
            "verified_alerts": verified_alerts,
            "total_species_catalogued": total_species,
            "system_health": "OPTIMAL",
            "active_ai_agents": 6,
            "data_sources": ["Copernicus Marine", "NOAA NDBC", "NASA Earthdata", "INCOIS"],
            "recent_alerts": recent_alerts
        }
    })

@app.route('/api/telemetry/live-tick', methods=['POST'])
def live_telemetry_tick():
    """
    Simulates a live telemetry ping from moored buoys and coastal arrays,
    adding micro-variations to emulate real-time oceanic current/temperature drift.
    """
    import random
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM stations ORDER BY RANDOM() LIMIT 1")
    stn = cursor.fetchone()
    if not stn:
        conn.close()
        return jsonify({"success": False, "error": "No stations available"}), 404

    stn_id = stn['id']
    base_temp = stn['baseline_temp_c']
    base_turb = stn['baseline_turbidity_ntu']
    base_sal = stn['baseline_salinity_psu']
    base_do = stn['baseline_dissolved_oxygen_mgl']
    base_ph = stn['baseline_ph']

    # Subtle natural variance
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    temp = round(base_temp + random.gauss(0, 0.35), 2)
    turb = max(0.5, round(base_turb + random.gauss(0, 0.25), 2))
    sal = round(base_sal + random.gauss(0, 0.2), 2)
    do = round(base_do + random.gauss(0, 0.15), 2)
    ph = round(base_ph + random.gauss(0, 0.03), 2)
    chla = round(max(0.1, 0.85 + random.gauss(0, 0.1)), 2)
    current = round(max(0.1, 0.42 + random.gauss(0, 0.08)), 2)
    anomaly_score = round(random.uniform(0.04, 0.16), 3)

    cursor.execute("""
        INSERT INTO environmental_readings (
            station_id, timestamp, temperature_c, turbidity_ntu, salinity_psu,
            dissolved_oxygen_mgl, ph_level, chlorophyll_a, ocean_current_speed_ms,
            anomaly_score, is_anomaly, data_source, is_sample_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    """, (
        stn_id, now_str, temp, turb, sal, do, ph, chla, current,
        anomaly_score, 0, f"{stn['source_authority']} (Live Stream)"
    ))

    cursor.execute("UPDATE stations SET last_ping = ? WHERE id = ?", (now_str, stn_id))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "station_id": stn_id,
        "station_name": stn['name'],
        "timestamp": now_str,
        "reading": {
            "temperature_c": temp,
            "turbidity_ntu": turb,
            "salinity_psu": sal,
            "dissolved_oxygen_mgl": do,
            "ph_level": ph,
            "chlorophyll_a": chla,
            "current_speed_ms": current,
            "anomaly_score": anomaly_score
        }
    })

@app.route('/api/reports/export', methods=['GET'])
def export_report_csv():
    """Exports environmental readings and alerts as a CSV file."""
    station_id = request.args.get('station_id')
    conn = get_db_connection()
    cursor = conn.cursor()

    if station_id:
        cursor.execute("""
            SELECT er.timestamp, s.name as station_name, er.temperature_c, er.turbidity_ntu,
                   er.salinity_psu, er.dissolved_oxygen_mgl, er.ph_level, er.chlorophyll_a,
                   er.ocean_current_speed_ms, er.anomaly_score, er.is_anomaly, er.data_source
            FROM environmental_readings er
            JOIN stations s ON er.station_id = s.id
            WHERE er.station_id = ?
            ORDER BY er.timestamp DESC
        """, (station_id,))
    else:
        cursor.execute("""
            SELECT er.timestamp, s.name as station_name, er.temperature_c, er.turbidity_ntu,
                   er.salinity_psu, er.dissolved_oxygen_mgl, er.ph_level, er.chlorophyll_a,
                   er.ocean_current_speed_ms, er.anomaly_score, er.is_anomaly, er.data_source
            FROM environmental_readings er
            JOIN stations s ON er.station_id = s.id
            ORDER BY er.timestamp DESC
            LIMIT 500
        """)

    rows = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Timestamp', 'Station Name', 'Temperature (°C)', 'Turbidity (NTU)',
        'Salinity (PSU)', 'Dissolved Oxygen (mg/L)', 'pH', 'Chlorophyll-a (µg/L)',
        'Current Speed (m/s)', 'Anomaly Score', 'Is Anomaly Flag', 'Data Source / Verification Notice'
    ])

    for row in rows:
        writer.writerow(list(row))

    output.seek(0)
    filename = f"ORCA_Marine_Report_{station_id or 'All_Stations'}_{datetime.now().strftime('%Y%m%d')}.csv"
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment;filename={filename}"}
    )

if __name__ == '__main__':
    import socket

    ports_to_try = [5000, 5001, 8080, 8000]
    selected_port = 5000
    for p in ports_to_try:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(0.5)
                if s.connect_ex(('127.0.0.1', p)) != 0:
                    selected_port = p
                    break
        except Exception:
            selected_port = p
            break

    print("================================================================")
    print("🌊 ORCA – Marine Ecosystem Intelligence Prototype Server 🌊")
    print("Tagline: 'ORCA – From Ocean Data to Informed Action.'")
    print(f"Starting server at: http://localhost:{selected_port}")
    print(f"Also accessible at: http://127.0.0.1:{selected_port}")
    print("================================================================")
    app.run(host='0.0.0.0', port=selected_port, debug=False)

