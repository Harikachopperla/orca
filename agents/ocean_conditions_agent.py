"""
ORCA – Agent 2: Ocean Conditions Agent
Specialization:
- Monitor ocean temperature (SST).
- Analyse salinity (PSU).
- Track ocean currents and physical variables.
- Identify physical deviations from historical baselines.
"""

from datetime import datetime

class OceanConditionsAgent:
    def __init__(self):
        self.name = "Ocean Conditions Agent"
        self.agent_id = "agent_ocean_conditions"
        self.role = "Physical Hydrography & Thermohaline Monitoring"

    def analyze(self, station_meta, reading, baseline):
        temp = float(reading.get('temperature_c', 26.5))
        base_temp = float(baseline.get('baseline_temp_c', 26.5))
        salinity = float(reading.get('salinity_psu', 34.0))
        base_sal = float(baseline.get('baseline_salinity_psu', 34.0))
        current_speed = float(reading.get('ocean_current_speed_ms', 0.4))

        temp_diff = temp - base_temp
        sal_diff = salinity - base_sal

        physical_status = "NORMAL"
        deviations = []
        confidence = 75.0

        # Thermal evaluation
        if temp_diff >= 3.0:
            physical_status = "SEVERE_THERMAL_ANOMALY"
            deviations.append({
                "variable": "temperature_c",
                "observed": temp,
                "baseline": base_temp,
                "difference": round(temp_diff, 2),
                "phenomenon": "Extreme Thermal Spike / Marine Heatwave Signal",
                "implication": f"Thermal loading is +{temp_diff:.1f}°C above seasonal mean. Poses critical thermal stress to benthic ecosystems."
            })
            confidence += 15.0
        elif temp_diff >= 1.5:
            if physical_status == "NORMAL":
                physical_status = "MILD_THERMAL_ELEVATION"
            deviations.append({
                "variable": "temperature_c",
                "observed": temp,
                "baseline": base_temp,
                "difference": round(temp_diff, 2),
                "phenomenon": "Moderate Thermal Elevation",
                "implication": f"Sea temperature +{temp_diff:.1f}°C above seasonal baseline."
            })
            confidence += 8.0
        elif temp_diff <= -2.5:
            deviations.append({
                "variable": "temperature_c",
                "observed": temp,
                "baseline": base_temp,
                "difference": round(temp_diff, 2),
                "phenomenon": "Intense Deep Upwelling / Cold Intrusion",
                "implication": "Sharp temperature drop indicative of deep water entrainment."
            })

        # Salinity evaluation
        if abs(sal_diff) >= 2.0:
            phenom = "Hyper-saline Evaporative Spike" if sal_diff > 0 else "Severe Freshwater Dilution (Estuarine Plume)"
            deviations.append({
                "variable": "salinity_psu",
                "observed": salinity,
                "baseline": base_sal,
                "difference": round(sal_diff, 2),
                "phenomenon": phenom,
                "implication": f"Salinity altered by {sal_diff:+.1f} PSU relative to standard {base_sal:.1f} PSU baseline."
            })
            confidence += 8.0
        elif abs(sal_diff) >= 1.0:
            deviations.append({
                "variable": "salinity_psu",
                "observed": salinity,
                "baseline": base_sal,
                "difference": round(sal_diff, 2),
                "phenomenon": "Slight Salinity Drift",
                "implication": f"Salinity at {salinity:.1f} PSU ({sal_diff:+.1f} PSU)."
            })

        # Hydrodynamic flow
        current_condition = "Calm" if current_speed < 0.25 else "Moderate Flow" if current_speed < 0.75 else "Strong Current Plume"

        # Generate hydrographic summary
        if physical_status == "SEVERE_THERMAL_ANOMALY":
            summary = (
                f"Significant physical condition alert: Sea Surface Temperature reached {temp}°C, "
                f"which deviates by +{temp_diff:.1f}°C from the station's historical baseline of {base_temp}°C. "
                f"Salinity is {salinity} PSU ({sal_diff:+.1f} PSU). Current speed is {current_speed} m/s ({current_condition})."
            )
        elif physical_status == "MILD_THERMAL_ELEVATION":
            summary = (
                f"Noticeable thermal elevation observed ({temp}°C vs baseline {base_temp}°C). "
                f"Thermohaline state shows salinity of {salinity} PSU and currents at {current_speed} m/s."
            )
        else:
            summary = (
                f"Physical oceanographic conditions are stable. Temperature ({temp}°C) and salinity ({salinity} PSU) "
                f"align within historical seasonal envelopes for {station_meta.get('name', 'Station')}."
            )

        return {
            "agent_id": self.agent_id,
            "agent_name": self.name,
            "status": "COMPLETED",
            "timestamp": datetime.now().isoformat(),
            "findings": {
                "physical_status": physical_status,
                "temperature_c": temp,
                "baseline_temp_c": base_temp,
                "temperature_deviation_c": round(temp_diff, 2),
                "salinity_psu": salinity,
                "baseline_salinity_psu": base_sal,
                "salinity_deviation_psu": round(sal_diff, 2),
                "current_speed_ms": current_speed,
                "current_condition": current_condition,
                "confidence_score": round(min(97.0, confidence), 1),
                "deviations": deviations,
                "summary": summary
            }
        }

