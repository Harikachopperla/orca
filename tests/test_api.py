"""
ORCA – API Integration Tests
Tests Flask web endpoints and JSON responses.
"""

import unittest
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import app
from database import seed_database

class TestOrcaApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        seed_database(force=True)
        cls.client = app.test_client()

    def test_home_page(self):
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b'ORCA', res.data)

    def test_api_stations(self):
        res = self.client.get('/api/stations')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertGreaterEqual(len(data['stations']), 8)

    def test_api_alerts(self):
        res = self.client.get('/api/alerts')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertGreaterEqual(data['count'], 1)

    def test_api_agents_status(self):
        res = self.client.get('/api/agents/status')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(len(data['agents']), 6)

    def test_api_demo_preset(self):
        res = self.client.post('/api/simulation/demo-preset')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['parameters']['temperature_c'], 31.0)
        self.assertEqual(data['parameters']['turbidity_ntu'], 18.0)
        self.assertEqual(data['result']['final_verdict']['status'], 'Needs Verification')

    def test_api_reports_export_csv(self):
        res = self.client.get('/api/reports/export')
        self.assertEqual(res.status_code, 200)
        self.assertIn('text/csv', res.content_type)
        self.assertIn(b'Temperature', res.data)

    def test_api_human_verification(self):
        # Fetch an alert
        alerts_res = self.client.get('/api/alerts').get_json()
        alert_id = alerts_res['alerts'][0]['id']

        verify_res = self.client.post(f'/api/alerts/{alert_id}/verify', json={
            'status': 'Verified by Human Expert',
            'notes': 'Unit test verified sample.'
        })
        self.assertEqual(verify_res.status_code, 200)
        data = verify_res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['updated_status'], 'Verified by Human Expert')

if __name__ == '__main__':
    unittest.main()

