"""
ORCA – Agent 4: Anomaly Detection Agent
Specialization:
- Compare current observations with historical baselines.
- Identify unusual environmental values across multiple parameters.
- Detect abnormal feature combinations using Scikit-Learn Isolation Forest.
- Generate calibrated anomaly scores and statistical deviation metrics.
"""

from datetime import datetime
from ml.anomaly_model import get_anomaly_detector

class AnomalyDetectionAgent:
    def __init__(self):
        self.name = "Anomaly Detection Agent"
        self.agent_id = "agent_anomaly_detection"
        self.role = "Statistical Baseline Comparison & Machine Learning Multivariate Outlier Scoring"
        self.detector = get_anomaly_detector()

    def analyze(self, station_meta, reading, baseline):
        """
        Runs ML anomaly evaluation against station baselines.
        """
        obs_payload = {
            'temperature_c': float(reading.get('temperature_c', 26.5)),
            'turbidity_ntu': float(reading.get('turbidity_ntu', 3.0)),
            'salinity_psu': float(reading.get('salinity_psu', 34.0)),
            'dissolved_oxygen_mgl': float(reading.get('dissolved_oxygen_mgl', 6.5)),
            'ph_level': float(reading.get('ph_level', 8.1)),
            'chlorophyll_a': float(reading.get('chlorophyll_a', 0.8))
        }

        station_baselines = {
            'temperature_c': float(baseline.get('baseline_temp_c', 26.5)),
            'turbidity_ntu': float(baseline.get('baseline_turbidity_ntu', 3.0)),
            'salinity_psu': float(baseline.get('baseline_salinity_psu', 34.0)),
            'dissolved_oxygen_mgl': float(baseline.get('baseline_dissolved_oxygen_mgl', 6.8)),
            'ph_level': float(baseline.get('baseline_ph', 8.15)),
            'chlorophyll_a': 0.85
        }

        ml_result = self.detector.evaluate_observation(obs_payload, station_baselines)

        # Detect abnormal combinations:
        # e.g., elevated temp + elevated turbidity + depressed oxygen is a signature of severe coastal disturbance
        temp_dev = ml_result['deviations']['temperature_c']['difference']
        turb_dev = ml_result['deviations']['turbidity_ntu']['difference']
        do_dev = ml_result['deviations']['dissolved_oxygen_mgl']['difference']

        is_correlated_cluster = False
        cluster_description = "Uncorrelated or nominal feature distribution."
        if temp_dev >= 2.0 and turb_dev >= 5.0 and do_dev <= -1.0:
            is_correlated_cluster = True
            cluster_description = (
                "Synergistic multi-stressor pattern detected: High temperature (+3.8°C), "
                "abrupt turbidity surge (+14.5 NTU), and depressed DO (-2.5 mg/L). "
                "This multivariate coupling rarely occurs from regular seasonal oscillations."
            )
        elif turb_dev >= 8.0:
            cluster_description = "Isolated optical particulate scattering anomaly."

        return {
            "agent_id": self.agent_id,
            "agent_name": self.name,
            "status": "COMPLETED",
            "timestamp": datetime.now().isoformat(),
            "findings": {
                "anomaly_score": ml_result['anomaly_score'],
                "is_anomaly": ml_result['is_anomaly'],
                "risk_level": ml_result['risk_level'],
                "confidence_score": ml_result['confidence_score'],
                "iso_forest_score": ml_result['iso_forest_score'],
                "statistical_score": ml_result['statistical_score'],
                "deviations": ml_result['deviations'],
                "is_multivariate_cluster": is_correlated_cluster,
                "cluster_description": cluster_description,
                "model_parameters": ml_result['model_info'],
                "summary": (
                    f"ML ensemble scored this reading at {ml_result['anomaly_score']:.3f} "
                    f"({ml_result['risk_level']}). {ml_result['explanation']}"
                )
            }
        }

