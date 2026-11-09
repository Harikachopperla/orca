"""
ORCA – Collaborative Multi-Agent Orchestrator
Coordinates the sequential and collaborative deliberation of all 6 specialized AI agents:
1. Pollution Detection Agent
2. Ocean Conditions Agent
3. Marine Life Agent
4. Anomaly Detection Agent
5. Decision Support Agent
6. Alert and Reporting Agent

Ensures all agents communicate through structured JSON payloads and logs execution audits.
"""

import uuid
from datetime import datetime
import json
import sqlite3
import os

try:
    from .pollution_agent import PollutionDetectionAgent
    from .ocean_conditions_agent import OceanConditionsAgent
    from .marine_life_agent import MarineLifeAgent
    from .anomaly_detection_agent import AnomalyDetectionAgent
    from .decision_support_agent import DecisionSupportAgent
    from .alert_reporting_agent import AlertReportingAgent
except ImportError:
    import sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from agents.pollution_agent import PollutionDetectionAgent
    from agents.ocean_conditions_agent import OceanConditionsAgent
    from agents.marine_life_agent import MarineLifeAgent
    from agents.anomaly_detection_agent import AnomalyDetectionAgent
    from agents.decision_support_agent import DecisionSupportAgent
    from agents.alert_reporting_agent import AlertReportingAgent

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'orca.db')

def get_station_and_species(station_id):
    """Fetches station metadata, latest baseline, and recorded species from DB."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM stations WHERE id = ?", (station_id,))
    station_row = cursor.fetchone()
    station_meta = dict(station_row) if station_row else {
        'id': station_id,
        'name': f'Station {station_id}',
        'region': 'Coastal Marine Zone',
        'station_type': 'Marine Monitoring Buoy',
        'baseline_temp_c': 27.2,
        'baseline_turbidity_ntu': 3.5,
        'baseline_salinity_psu': 33.8,
        'baseline_dissolved_oxygen_mgl': 6.8,
        'baseline_ph': 8.18
    }

    cursor.execute("SELECT * FROM marine_species WHERE station_id = ?", (station_id,))
    species_rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return station_meta, species_rows

def run_orca_agent_pipeline(station_id, observation, persist_alert=True):
    """
    Main orchestration entrypoint for ORCA.
    Runs all 6 agents collaboratively with structured message passing.
    """
    execution_id = f"EXEC-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{str(uuid.uuid4())[:4]}"
    start_time = datetime.now()

    # 1. Fetch metadata & baselines
    station_meta, species_records = get_station_and_species(station_id)
    baseline = {
        'baseline_temp_c': station_meta.get('baseline_temp_c', 27.2),
        'baseline_turbidity_ntu': station_meta.get('baseline_turbidity_ntu', 3.5),
        'baseline_salinity_psu': station_meta.get('baseline_salinity_psu', 33.8),
        'baseline_dissolved_oxygen_mgl': station_meta.get('baseline_dissolved_oxygen_mgl', 6.8),
        'baseline_ph': station_meta.get('baseline_ph', 8.18)
    }

    # Instantiate agents
    agent1 = PollutionDetectionAgent()
    agent2 = OceanConditionsAgent()
    agent3 = MarineLifeAgent()
    agent4 = AnomalyDetectionAgent()
    agent5 = DecisionSupportAgent()
    agent6 = AlertReportingAgent()

    # Phase A: Primary Indicator Agents
    res1 = agent1.analyze(station_meta, observation, baseline)
    res2 = agent2.analyze(station_meta, observation, baseline)
    res3 = agent3.analyze(station_meta, observation, baseline, species_records)
    res4 = agent4.analyze(station_meta, observation, baseline)

    # Phase B: Decision Synthesis Agent
    res5 = agent5.analyze(station_meta, observation, baseline, res1, res2, res3, res4)

    # Phase C: Alert & Reporting Agent
    res6 = agent6.analyze(station_meta, observation, baseline, res1, res2, res3, res4, res5)

    duration_ms = round((datetime.now() - start_time).total_seconds() * 1000, 2)

    # Check if demonstration scenario matched (Temp ~31°C, Turbidity ~18 NTU, Salinity ~35 PSU)
    is_demo_scenario = (
        abs(float(observation.get('temperature_c', 0)) - 31.0) < 0.5 and
        abs(float(observation.get('turbidity_ntu', 0)) - 18.0) < 1.0 and
        abs(float(observation.get('salinity_psu', 0)) - 35.0) < 1.0
    )

    alert_info = res6['findings']['investigation_report']

    # Persist alert and audit logs if an alert was generated
    if persist_alert and res6['findings'].get('alert_generated'):
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
            INSERT INTO alerts (
                id, station_id, station_name, timestamp, anomaly_type, risk_level,
                confidence_score, supporting_evidence, recommended_actions, status,
                human_verified, verifier_notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert_info['alert_id'],
                station_meta['id'],
                station_meta['name'],
                alert_info['timestamp'],
                alert_info['anomaly_title'],
                alert_info['risk_level'],
                alert_info['confidence_score'],
                json.dumps(alert_info['supporting_evidence']),
                json.dumps(alert_info['recommended_actions']),
                alert_info['status'],
                0,
                None,
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ))

            # Update station status
            new_stn_status = 'NEEDS_VERIFICATION' if 'Verification' in alert_info['risk_level'] else 'INVESTIGATION'
            cursor.execute("UPDATE stations SET status = ?, last_ping = ? WHERE id = ?", (
                new_stn_status,
                datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                station_meta['id']
            ))

            # Audit log for all 6 agents
            audit_records = [
                (execution_id, datetime.now().isoformat(), station_meta['id'], agent1.name, res1['status'], res1['findings']['summary'], json.dumps(res1)),
                (execution_id, datetime.now().isoformat(), station_meta['id'], agent2.name, res2['status'], res2['findings']['summary'], json.dumps(res2)),
                (execution_id, datetime.now().isoformat(), station_meta['id'], agent3.name, res3['status'], res3['findings']['summary'], json.dumps(res3)),
                (execution_id, datetime.now().isoformat(), station_meta['id'], agent4.name, res4['status'], res4['findings']['summary'], json.dumps(res4)),
                (execution_id, datetime.now().isoformat(), station_meta['id'], agent5.name, res5['status'], res5['findings']['summary'], json.dumps(res5)),
                (execution_id, datetime.now().isoformat(), station_meta['id'], agent6.name, res6['status'], res6['findings']['summary'], json.dumps(res6))
            ]
            cursor.executemany('''
            INSERT INTO agent_audit_logs (execution_id, timestamp, station_id, agent_name, status, summary, raw_payload_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', audit_records)

            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error persisting alert/audit logs: {e}")

    return {
        "execution_id": execution_id,
        "execution_duration_ms": duration_ms,
        "station": station_meta,
        "observation": observation,
        "baseline": baseline,
        "demonstration_scenario_matched": is_demo_scenario,
        "agent_pipeline": [
            res1,
            res2,
            res3,
            res4,
            res5,
            res6
        ],
        "final_verdict": {
            "alert_id": alert_info['alert_id'],
            "risk_level": alert_info['risk_level'],
            "status": alert_info['status'],
            "confidence_score": alert_info['confidence_score'],
            "anomaly_title": alert_info['anomaly_title'],
            "recommendations_count": len(alert_info['recommended_actions']),
            "evidence_count": len(alert_info['supporting_evidence'])
        }
    }

if __name__ == '__main__':
    # Test orchestrator with demonstration scenario
    demo_obs = {
        'temperature_c': 31.0,
        'turbidity_ntu': 18.0,
        'salinity_psu': 35.0,
        'dissolved_oxygen_mgl': 4.3,
        'ph_level': 7.85,
        'chlorophyll_a': 2.85,
        'ocean_current_speed_ms': 0.72
    }
    result = run_orca_agent_pipeline('STN-001', demo_obs, persist_alert=False)
    print("Orchestrator Execution Completed in", result['execution_duration_ms'], "ms")
    print("Demo Scenario Matched:", result['demonstration_scenario_matched'])
    print("Final Verdict:", json.dumps(result['final_verdict'], indent=2))
