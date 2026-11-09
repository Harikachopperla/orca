"""
ORCA – Agent 1: Pollution Detection Agent
Specialization:
- Analyse available water-quality indicators (turbidity, dissolved oxygen, pH, chlorophyll-a).
- Monitor turbidity and validated spill/plume signatures.
- Identify unusual pollution-related signals.
- Generate pollution investigation summaries (with clear caveats that sensor readings indicate potential contaminants needing verification).
"""

from datetime import datetime

class PollutionDetectionAgent:
    def __init__(self):
        self.name = "Pollution Detection Agent"
        self.agent_id = "agent_pollution"
        self.role = "Water Quality & Spill Indicator Monitoring"

    def analyze(self, station_meta, reading, baseline):
        """
        Input:
            station_meta: dict (station id, name, type, region)
            reading: dict of current observations
            baseline: dict of station baseline values
        Returns:
            Structured dict
        """
        turbidity = float(reading.get('turbidity_ntu', 3.0))
        base_turb = float(baseline.get('baseline_turbidity_ntu', 3.0))
        do_level = float(reading.get('dissolved_oxygen_mgl', 6.5))
        base_do = float(baseline.get('baseline_dissolved_oxygen_mgl', 6.8))
        ph = float(reading.get('ph_level', 8.1))
        base_ph = float(baseline.get('baseline_ph', 8.15))
        chlorophyll = float(reading.get('chlorophyll_a', 0.8))

        turbidity_delta = turbidity - base_turb
        turbidity_ratio = turbidity / max(0.1, base_turb)
        do_depletion = base_do - do_level

        # Evaluate potential flags
        signals = []
        severity = "NORMAL"
        confidence = 70.0

        # Turbidity analysis
        if turbidity >= 15.0 or turbidity_ratio >= 3.5:
            severity = "HIGH_CONCERN"
            signals.append({
                "parameter": "turbidity_ntu",
                "observed": turbidity,
                "baseline": base_turb,
                "signal_type": "Severe Suspended Sediment / Potential Discharge Plume",
                "detail": f"Turbidity elevated by +{turbidity_delta:.1f} NTU ({turbidity_ratio:.1f}x baseline threshold)."
            })
            confidence += 15.0
        elif turbidity >= 8.0 or turbidity_ratio >= 2.0:
            severity = "ELEVATED"
            signals.append({
                "parameter": "turbidity_ntu",
                "observed": turbidity,
                "baseline": base_turb,
                "signal_type": "Elevated Particulate Scattering",
                "detail": f"Turbidity elevated by +{turbidity_delta:.1f} NTU above nominal baseline."
            })
            confidence += 8.0

        # Dissolved Oxygen / Biochemical demand
        if do_level < 4.5:
            if severity == "NORMAL":
                severity = "ELEVATED"
            signals.append({
                "parameter": "dissolved_oxygen_mgl",
                "observed": do_level,
                "baseline": base_do,
                "signal_type": "Hypoxia / Elevated Biochemical Oxygen Demand (BOD)",
                "detail": f"Dissolved oxygen dropped to {do_level:.2f} mg/L ({do_depletion:.2f} mg/L depletion). May signal organic loading or decomposition."
            })
            confidence += 10.0

        # pH balance
        if abs(ph - base_ph) >= 0.35:
            signals.append({
                "parameter": "ph_level",
                "observed": ph,
                "baseline": base_ph,
                "signal_type": "Acid-Base Ocean Chemistry Shift",
                "detail": f"pH reading {ph:.2f} deviates significantly from expected {base_ph:.2f} baseline."
            })

        # Chlorophyll-a (Algal bloom or nutrient runoff)
        if chlorophyll > 2.5:
            signals.append({
                "parameter": "chlorophyll_a",
                "observed": chlorophyll,
                "baseline": 0.8,
                "signal_type": "Eutrophic / Phytoplankton Density Surge",
                "detail": f"Chlorophyll-a density of {chlorophyll:.2f} µg/L indicates algal activity or organic runoff."
            })

        # Synthesize Investigation Summary
        if severity == "HIGH_CONCERN":
            summary = (
                f"High-turbidity surge detected at {station_meta.get('name', 'Station')} ({turbidity} NTU vs {base_turb} NTU baseline). "
                f"Combined with DO drop ({do_level} mg/L), optical backscatter suggests particulate plume, dredging disturbance, or terrestrial discharge. "
                f"Note: Turbidity elevation is not definitive proof of industrial pollution; rapid field validation is required."
            )
            investigation_needed = True
        elif severity == "ELEVATED":
            summary = (
                f"Moderate water quality deviations observed. Turbidity is {turbidity} NTU. "
                f"Routine water column monitoring advised to verify whether deviation stems from tidal resuspension or local inputs."
            )
            investigation_needed = True
        else:
            summary = "All primary water-quality indicators (turbidity, dissolved oxygen, and pH) remain within normal seasonal parameters."
            investigation_needed = False

        return {
            "agent_id": self.agent_id,
            "agent_name": self.name,
            "status": "COMPLETED",
            "timestamp": datetime.now().isoformat(),
            "findings": {
                "severity": severity,
                "investigation_needed": investigation_needed,
                "confidence_score": round(min(96.0, confidence), 1),
                "detected_signals": signals,
                "turbidity_ratio": round(turbidity_ratio, 2),
                "water_quality_index": round(max(10.0, 100.0 - (turbidity_delta * 3.5) - (do_depletion * 8.0)), 1),
                "summary": summary
            }
        }

