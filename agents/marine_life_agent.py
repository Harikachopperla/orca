"""
ORCA – Agent 3: Marine Life Agent
Specialization:
- Analyse available marine biodiversity observations.
- Summarise species survey information.
- Monitor habitat indicators (e.g. coral bleaching vulnerability, hypoxic fish risk).
- Highlight possible ecosystem changes.
"""

from datetime import datetime

class MarineLifeAgent:
    def __init__(self):
        self.name = "Marine Life Agent"
        self.agent_id = "agent_marine_life"
        self.role = "Biodiversity, Habitat Integrity & Ecological Stress Assessment"

    def analyze(self, station_meta, reading, baseline, species_records=None):
        """
        Synthesizes ecological impact by cross-referencing environmental readings
        against local protected species and habitat tolerances.
        """
        temp = float(reading.get('temperature_c', 26.5))
        base_temp = float(baseline.get('baseline_temp_c', 26.5))
        turbidity = float(reading.get('turbidity_ntu', 3.0))
        do_level = float(reading.get('dissolved_oxygen_mgl', 6.5))

        temp_diff = temp - base_temp

        # Assess ecological vulnerabilities
        ecological_stress_level = "LOW"
        risk_flags = []
        habitat_scores = {"coral_reef": 85.0, "seagrass_meadows": 88.0, "pelagic_fisheries": 90.0}

        # 1. Coral Thermal Bleaching Risk
        if temp_diff >= 3.0:
            ecological_stress_level = "CRITICAL"
            habitat_scores["coral_reef"] -= 45.0
            risk_flags.append({
                "ecosystem": "Scleractinian Coral Reefs",
                "risk_type": "Acute Degree Heating / Bleaching Warning",
                "description": f"Elevated temperature (+{temp_diff:.1f}°C) exceeds thermal tolerance of branching corals (Acropora/Porites). Expulsion of zooxanthellae likely if sustained."
            })
        elif temp_diff >= 1.5:
            if ecological_stress_level == "LOW":
                ecological_stress_level = "MODERATE"
            habitat_scores["coral_reef"] -= 20.0
            risk_flags.append({
                "ecosystem": "Coral Reefs",
                "risk_type": "Thermal Stress Watch",
                "description": f"Prolonged exposure to +{temp_diff:.1f}°C deviation may induce bleaching."
            })

        # 2. Turbidity & Photosynthetically Active Radiation (PAR) for Seagrass
        if turbidity >= 12.0:
            if ecological_stress_level == "LOW":
                ecological_stress_level = "MODERATE"
            habitat_scores["seagrass_meadows"] -= 35.0
            risk_flags.append({
                "ecosystem": "Benthic Seagrass Meadows",
                "risk_type": "Benthic Light Deprivation & Siltation",
                "description": f"High turbidity ({turbidity} NTU) severely limits benthic light penetration, jeopardizing Halophila and Cymodocea meadows critical for Dugong grazing."
            })

        # 3. Dissolved Oxygen & Fish Hypoxia
        if do_level < 5.0:
            habitat_scores["pelagic_fisheries"] -= 30.0
            if do_level < 4.0:
                ecological_stress_level = "HIGH"
                risk_flags.append({
                    "ecosystem": "Pelagic & Demersal Fish Assemblages",
                    "risk_type": "Hypoxia / Respiratory Distress",
                    "description": f"DO at {do_level:.1f} mg/L is below the 5.0 mg/L vitality threshold. Potential for localized fish avoidance or mortality."
                })

        # Process registered species for the station
        species_summary = []
        if species_records:
            for sp in species_records:
                species_summary.append({
                    "species_name": sp.get('species_name'),
                    "common_name": sp.get('common_name'),
                    "status": sp.get('conservation_status'),
                    "category": sp.get('category'),
                    "last_count": sp.get('count_observed'),
                    "health_index": sp.get('habitat_health_index')
                })

        # Calculate composite habitat index
        mean_health = round(sum(habitat_scores.values()) / len(habitat_scores), 1)

        # Synthesize marine life summary
        if ecological_stress_level in ["CRITICAL", "HIGH"]:
            summary = (
                f"Elevated ecological risk identified for {station_meta.get('name', 'Station')}. "
                f"Combined heat stress ({temp}°C) and high turbidity ({turbidity} NTU) directly endanger benthic habitats. "
                f"Vulnerable fauna such as seagrass grazers and branching coral colonies face acute thermal and irradiance stress."
            )
        elif ecological_stress_level == "MODERATE":
            summary = (
                f"Moderate ecological pressure detected. Light attenuation from turbidity ({turbidity} NTU) "
                f"and thermal delta (+{temp_diff:.1f}°C) may impact sensitive nearshore taxa."
            )
        else:
            summary = (
                f"Marine ecosystem conditions appear stable. Habitat health index is {mean_health}/100. "
                f"Target biodiversity indicators show no acute stress patterns."
            )

        return {
            "agent_id": self.agent_id,
            "agent_name": self.name,
            "status": "COMPLETED",
            "timestamp": datetime.now().isoformat(),
            "findings": {
                "ecological_stress_level": ecological_stress_level,
                "composite_habitat_health": mean_health,
                "habitat_scores": habitat_scores,
                "risk_flags": risk_flags,
                "registered_species_count": len(species_summary),
                "species_observations": species_summary,
                "summary": summary
            }
        }

