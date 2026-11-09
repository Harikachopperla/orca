"""
ORCA – Agent 5: Decision Support Agent
Specialization:
- Collect findings from Agents 1, 2, 3, and 4.
- Compare and synthesize cross-agent results.
- Articulate the scientific evidence behind detected anomalies.
- Recommend actionable, protocol-driven verification steps for human experts.
"""

from datetime import datetime

class DecisionSupportAgent:
    def __init__(self):
        self.name = "Decision Support Agent"
        self.agent_id = "agent_decision_support"
        self.role = "Cross-Agent Synthesis, Evidence Explanation & Human Verification Guidance"

    def analyze(self, station_meta, reading, baseline, agent1_res, agent2_res, agent3_res, agent4_res):
        """
        Synthesizes findings from:
        - agent1_res: Pollution Detection Agent
        - agent2_res: Ocean Conditions Agent
        - agent3_res: Marine Life Agent
        - agent4_res: Anomaly Detection Agent
        """
        pollution = agent1_res.get('findings', {})
        ocean = agent2_res.get('findings', {})
        marine = agent3_res.get('findings', {})
        anomaly = agent4_res.get('findings', {})

        anomaly_score = anomaly.get('anomaly_score', 0.0)
        temp_dev = ocean.get('temperature_deviation_c', 0.0)
        turbidity_ratio = pollution.get('turbidity_ratio', 1.0)
        stress_level = marine.get('ecological_stress_level', 'LOW')

        # Corroborate evidence across agents
        evidence_points = []
        verification_steps = []
        action_priority = "ROUTINE"

        # Evidence evaluation
        if pollution.get('severity') in ['HIGH_CONCERN', 'ELEVATED']:
            evidence_points.append({
                "source": "Pollution Detection Agent",
                "finding": f"Turbidity surge detected ({reading.get('turbidity_ntu')} NTU, {turbidity_ratio:.1f}x baseline). Elevated scattering suggests suspended sediment or particulate matter."
            })

        if ocean.get('physical_status') in ['SEVERE_THERMAL_ANOMALY', 'MILD_THERMAL_ELEVATION']:
            evidence_points.append({
                "source": "Ocean Conditions Agent",
                "finding": f"Thermal deviation (+{temp_dev:.1f}°C) exceeding baseline {ocean.get('baseline_temp_c')}°C. Suggests localized heating or restricted water exchange."
            })

        if stress_level in ['CRITICAL', 'HIGH', 'MODERATE']:
            evidence_points.append({
                "source": "Marine Life Agent",
                "finding": f"Habitat vulnerability flag: Ecological stress is {stress_level} for local sensitive species and coral communities."
            })

        if anomaly.get('is_anomaly'):
            evidence_points.append({
                "source": "Anomaly Detection Agent",
                "finding": f"Multivariate IsolationForest & Z-score model flagged outlier pattern (score: {anomaly_score:.3f}, confidence: {anomaly.get('confidence_score')}%), indicating improbable natural co-occurrence."
            })

        # Synthesize Verification Protocols (Human-In-The-Loop)
        if anomaly_score >= 0.65 or pollution.get('severity') == 'HIGH_CONCERN':
            action_priority = "HIGH (IMMEDIATE VERIFICATION)"
            verification_steps = [
                "Deploy local marine patrol boat or Autonomous Surface Vehicle (ASV) to collect physical bottle samples for Total Suspended Solids (TSS) and hydrocarbon analysis.",
                "Execute optical sensor wiper cycle or diver inspection on Buoy nephelometer to rule out biofouling or optical lens obstruction.",
                "Cross-examine recent Copernicus Sentinel-2 Level-2A high-resolution optical imagery to verify if sediment plume is visible from space.",
                "Notify Regional Coastal Aquaculture Authority and Marine Sanctuary managers to monitor sensitive benthic zones for thermal or turbidity stress.",
                "Review local marine traffic AIS logs to check for unauthorized dredging, anchoring, or vessel ballast exchange in the vicinity."
            ]
        elif anomaly_score >= 0.40:
            action_priority = "MODERATE (SCHEDULED CHECK)"
            verification_steps = [
                "Schedule repeat sensor telemetry query in 60 minutes to establish whether reading is transient or persistent.",
                "Cross-check adjacent coastal buoys to determine spatial extent of thermal/salinity shifts.",
                "Inspect meteorological station records for recent high precipitation, storm surge, or coastal runoff."
            ]
        else:
            action_priority = "STANDARD (ROUTINE TELEMETRY)"
            verification_steps = [
                "Maintain scheduled 6-hour acoustic and optical telemetry cycle.",
                "Log sensor health status in daily operational record."
            ]

        # Explicit Safety Caveat
        safety_notice = (
            "SAFETY & RELIABILITY NOTICE: In accordance with ORCA scientific integrity standards, "
            "anomalous sensor readings provide observational indicators and investigative leads, NOT definitive legal or biochemical proof of pollution. "
            "Physical water sample verification by certified oceanographers is mandatory before initiating regulatory or enforcement actions."
        )

        return {
            "agent_id": self.agent_id,
            "agent_name": self.name,
            "status": "COMPLETED",
            "timestamp": datetime.now().isoformat(),
            "findings": {
                "action_priority": action_priority,
                "synthesized_confidence": round((pollution.get('confidence_score', 70) + ocean.get('confidence_score', 70) + anomaly.get('confidence_score', 70)) / 3.0, 1),
                "compiled_evidence": evidence_points,
                "recommended_verification_steps": verification_steps,
                "safety_disclaimer": safety_notice,
                "summary": (
                    f"Decision Support Agent has compiled findings from 4 specialized agents. "
                    f"Action Priority designated as: {action_priority}. "
                    f"Identified {len(evidence_points)} corroborating evidence indicators. "
                    f"{len(verification_steps)} protocol verification steps formulated for field personnel."
                )
            }
        }

