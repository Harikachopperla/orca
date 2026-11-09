"""
ORCA – Agent 6: Alert and Reporting Agent
Specialization:
- Generate environmental alerts with unique tracking IDs.
- Display standardized risk levels.
- Prepare investigation reports.
- Support downloadable reports (JSON, CSV, PDF/HTML formats).
- Store alerts and audit records in the database.
"""

from datetime import datetime
import json
import uuid

class AlertReportingAgent:
    def __init__(self):
        self.name = "Alert and Reporting Agent"
        self.agent_id = "agent_alert_reporting"
        self.role = "Alert Generation, Risk Categorization & Comprehensive Environmental Reporting"

    def analyze(self, station_meta, reading, baseline, agent1_res, agent2_res, agent3_res, agent4_res, agent5_res):
        """
        Synthesizes the complete workflow into a formal Alert / Intelligence Report.
        """
        pollution = agent1_res.get('findings', {})
        ocean = agent2_res.get('findings', {})
        marine = agent3_res.get('findings', {})
        anomaly = agent4_res.get('findings', {})
        decision = agent5_res.get('findings', {})

        anomaly_score = anomaly.get('anomaly_score', 0.0)
        is_anomaly = anomaly.get('is_anomaly', False)

        # Generate unique Alert ID
        alert_code = f"ALT-{datetime.now().strftime('%Y%m')}-{str(uuid.uuid4())[:4].upper()}"

        # Standardize Risk Category
        if anomaly_score >= 0.70 or pollution.get('severity') == 'HIGH_CONCERN':
            risk_category = "High (Needs Immediate Verification)"
            alert_status = "Needs Verification"
            alert_generated = True
        elif anomaly_score >= 0.45 or pollution.get('severity') == 'ELEVATED':
            risk_category = "Moderate (Needs Verification)"
            alert_status = "Needs Verification"
            alert_generated = True
        elif anomaly_score >= 0.30:
            risk_category = "Low Anomaly Advisory"
            alert_status = "Advisory"
            alert_generated = False
        else:
            risk_category = "Normal Operational Conditions"
            alert_status = "Nominal"
            alert_generated = False

        # Anomaly type formulation
        anomaly_tags = []
        if ocean.get('temperature_deviation_c', 0) >= 2.0:
            anomaly_tags.append("Thermal Spike")
        if pollution.get('turbidity_ratio', 1.0) >= 2.5:
            anomaly_tags.append("High Turbidity / Particulate Plume")
        if reading.get('dissolved_oxygen_mgl', 6.5) < 5.0:
            anomaly_tags.append("DO Depletion")
        
        anomaly_title = " & ".join(anomaly_tags) if anomaly_tags else "Environmental Deviation Advisory"

        # Evidence dictionary for storage and UI display
        supporting_evidence = {
            "temperature": {
                "observed": reading.get('temperature_c'),
                "baseline": baseline.get('baseline_temp_c'),
                "deviation": f"{ocean.get('temperature_deviation_c', 0):+.2f}°C"
            },
            "turbidity": {
                "observed": reading.get('turbidity_ntu'),
                "baseline": baseline.get('baseline_turbidity_ntu'),
                "deviation": f"{reading.get('turbidity_ntu', 0) - baseline.get('baseline_turbidity_ntu', 0):+.2f} NTU"
            },
            "salinity": {
                "observed": reading.get('salinity_psu'),
                "baseline": baseline.get('baseline_salinity_psu'),
                "deviation": f"{ocean.get('salinity_deviation_psu', 0):+.2f} PSU"
            },
            "dissolved_oxygen": {
                "observed": reading.get('dissolved_oxygen_mgl'),
                "baseline": baseline.get('baseline_dissolved_oxygen_mgl'),
                "deviation": f"{reading.get('dissolved_oxygen_mgl', 0) - baseline.get('baseline_dissolved_oxygen_mgl', 0):+.2f} mg/L"
            },
            "ml_anomaly_score": anomaly_score,
            "isolation_forest_score": anomaly.get('iso_forest_score', 0.0),
            "ecological_stress": marine.get('ecological_stress_level', 'LOW')
        }

        # Recommendations list
        recommendations = decision.get('recommended_verification_steps', [])

        # Formulate full investigation report
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')
        report_payload = {
            "alert_id": alert_code,
            "alert_generated": alert_generated,
            "station_id": station_meta.get('id'),
            "station_name": station_meta.get('name'),
            "station_region": station_meta.get('region'),
            "timestamp": now_str,
            "anomaly_title": anomaly_title,
            "risk_level": risk_category,
            "status": alert_status,
            "confidence_score": decision.get('synthesized_confidence', 85.0),
            "supporting_evidence": supporting_evidence,
            "recommended_actions": recommendations,
            "agent_summaries": {
                "pollution_agent": pollution.get('summary'),
                "ocean_conditions_agent": ocean.get('summary'),
                "marine_life_agent": marine.get('summary'),
                "anomaly_detection_agent": anomaly.get('summary'),
                "decision_support_agent": decision.get('summary')
            },
            "human_in_the_loop_requirement": (
                "ORCA advisory protocols require field or satellite confirmation before triggering regulatory closures or emergency declarations."
            )
        }

        return {
            "agent_id": self.agent_id,
            "agent_name": self.name,
            "status": "COMPLETED",
            "timestamp": datetime.now().isoformat(),
            "findings": {
                "alert_id": alert_code,
                "alert_generated": alert_generated,
                "risk_level": risk_category,
                "alert_status": alert_status,
                "anomaly_title": anomaly_title,
                "confidence_score": decision.get('synthesized_confidence', 85.0),
                "investigation_report": report_payload,
                "summary": (
                    f"Alert Agent synthesized operational assessment. "
                    f"Status: '{alert_status}' [Risk: {risk_category}]. "
                    f"Alert ID {alert_code} compiled with structured multi-agent evidence."
                )
            }
        }

