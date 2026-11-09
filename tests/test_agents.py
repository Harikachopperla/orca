"""
ORCA – Multi-Agent Unit & Integration Tests
Verifies the collaborative execution of all 6 AI agents.
"""

import unittest
import os
import sys

# Ensure root is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import init_db, seed_database
from ml.anomaly_model import MarineAnomalyDetector
from agents.agent_orchestrator import run_orca_agent_pipeline
from agents.pollution_agent import PollutionDetectionAgent
from agents.ocean_conditions_agent import OceanConditionsAgent
from agents.marine_life_agent import MarineLifeAgent
from agents.anomaly_detection_agent import AnomalyDetectionAgent
from agents.decision_support_agent import DecisionSupportAgent
from agents.alert_reporting_agent import AlertReportingAgent

class TestOrcaMultiAgentSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        seed_database(force=True)
        cls.detector = MarineAnomalyDetector()

    def test_ml_anomaly_detector_nominal(self):
        """Tests that normal baseline values receive low anomaly score."""
        normal_obs = {
            'temperature_c': 27.0,
            'turbidity_ntu': 3.2,
            'salinity_psu': 34.0,
            'dissolved_oxygen_mgl': 6.8,
            'ph_level': 8.15,
            'chlorophyll_a': 0.8
        }
        res = self.detector.evaluate_observation(normal_obs)
        self.assertLess(res['anomaly_score'], 0.40)
        self.assertFalse(res['is_anomaly'])

    def test_ml_anomaly_detector_demo_scenario(self):
        """Tests that the demonstration scenario (31°C, 18 NTU, 35 PSU) triggers high anomaly."""
        demo_obs = {
            'temperature_c': 31.0,
            'turbidity_ntu': 18.0,
            'salinity_psu': 35.0,
            'dissolved_oxygen_mgl': 4.3,
            'ph_level': 7.85,
            'chlorophyll_a': 2.85
        }
        base = {
            'temperature_c': 27.2,
            'turbidity_ntu': 3.5,
            'salinity_psu': 33.8,
            'dissolved_oxygen_mgl': 6.8,
            'ph_level': 8.18
        }
        res = self.detector.evaluate_observation(demo_obs, base)
        self.assertGreater(res['anomaly_score'], 0.65)
        self.assertTrue(res['is_anomaly'])
        self.assertIn('High', res['risk_level'])

    def test_agent_orchestrator_full_pipeline(self):
        """Tests sequential execution of all 6 agents."""
        demo_obs = {
            'temperature_c': 31.0,
            'turbidity_ntu': 18.0,
            'salinity_psu': 35.0,
            'dissolved_oxygen_mgl': 4.3,
            'ph_level': 7.85,
            'chlorophyll_a': 2.85,
            'ocean_current_speed_ms': 0.72
        }
        pipeline_output = run_orca_agent_pipeline('STN-001', demo_obs, persist_alert=False)

        self.assertEqual(len(pipeline_output['agent_pipeline']), 6)
        self.assertTrue(pipeline_output['demonstration_scenario_matched'])

        # Check Agent 1 (Pollution)
        ag1 = pipeline_output['agent_pipeline'][0]
        self.assertEqual(ag1['agent_id'], 'agent_pollution')
        self.assertEqual(ag1['findings']['severity'], 'HIGH_CONCERN')

        # Check Agent 2 (Ocean Conditions)
        ag2 = pipeline_output['agent_pipeline'][1]
        self.assertEqual(ag2['agent_id'], 'agent_ocean_conditions')
        self.assertIn('THERMAL', ag2['findings']['physical_status'])

        # Check Agent 4 (Anomaly Detection)
        ag4 = pipeline_output['agent_pipeline'][3]
        self.assertGreater(ag4['findings']['anomaly_score'], 0.65)

        # Check Agent 5 (Decision Support)
        ag5 = pipeline_output['agent_pipeline'][4]
        self.assertGreater(len(ag5['findings']['recommended_verification_steps']), 2)
        self.assertIn('SAFETY & RELIABILITY NOTICE', ag5['findings']['safety_disclaimer'])

        # Check Agent 6 (Alert Reporting)
        ag6 = pipeline_output['agent_pipeline'][5]
        self.assertTrue(ag6['findings']['alert_generated'])
        self.assertEqual(ag6['findings']['alert_status'], 'Needs Verification')

if __name__ == '__main__':
    unittest.main()

