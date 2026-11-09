# ORCA – Marine Ecosystem Intelligence
> **"ORCA – From Ocean Data to Informed Action."**

[![ORCA CI](https://github.com/Harikachopperla/orca/actions/workflows/ci.yml/badge.svg)](https://github.com/Harikachopperla/orca/actions)
![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB.svg?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.1-000000.svg?logo=flask&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-ML%20Ensemble-F7931E.svg?logo=scikit-learn&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Demo Scenario](https://img.shields.io/badge/Demo%20Scenario-31%C2%B0C%20%7C%2018%20NTU%20%7C%2035%20PSU-00f2fe)

A professional, modern, responsive, AI-powered marine environmental intelligence platform that uses **6 collaborative AI agents** to monitor ocean conditions, detect environmental anomalies, analyse water quality and pollution indicators, safeguard marine biodiversity, and support human decision-making.

---

## 🌊 Project Architecture & Highlights

- **6 Collaborative AI Agents**: Specialized agents for Pollution Detection, Ocean Conditions, Marine Life, Anomaly Detection, Decision Support, and Alert/Reporting communicating through structured JSON outputs.
- **Machine Learning Anomaly Engine**: Combines **Scikit-Learn IsolationForest** with multivariate **Z-score** statistical modeling calibrated against station historical baselines.
- **10 Complete Modules**:
  1. **Home Page**: Hero presentation, value proposition, architecture overview, and quick-start actions.
  2. **Main Dashboard**: Global station metrics, latest readings, active alert counter, risk overview, and telemetry table.
  3. **Ocean Map**: Interactive **Leaflet.js** map displaying coastal and deep-sea moored buoys with real-time status halos and click popups.
  4. **Pollution Monitoring**: Time-series turbidity (NTU), dissolved oxygen (DO), and biochemical oxygen demand indicators with safety disclaimers.
  5. **Ocean Conditions**: Sea surface temperature (SST) and practical salinity units (PSU) with seasonal baseline divergence charts.
  6. **Marine Life Monitoring**: Target species surveys (Dugongs, Acropora corals, Green Sea Turtles, Humpback Whales) with habitat health indices.
  7. **AI Agents Monitoring Console**: Interactive visual execution pipeline with customizable sliders and real-time step-by-step deliberation animation.
  8. **Alerts & Notifications**: Standardized alerts with confidence scores, supporting multi-sensor evidence, protocol checklists, and a **Human-in-the-Loop Verification Modal**.
  9. **Reports & Analytics**: Executive environmental briefing with downloadable **CSV exports** and printable/PDF reports.
  10. **About ORCA**: Public ocean data integration roadmap (Copernicus, NOAA NDBC, NASA Earthdata, INCOIS) and scientific reliability principles.

---

## 🤖 The Six Collaborative AI Agents

| # | Agent Name | Core Responsibilities | Output Key |
|---|---|---|---|
| **1** | **Pollution Detection Agent** | Analyzes turbidity, dissolved oxygen, pH, chlorophyll-a, and optical scattering to flag particulate plumes. | `agent_pollution` |
| **2** | **Ocean Conditions Agent** | Monitors Sea Surface Temperature (SST), salinity (PSU), and physical current velocity against seasonal baselines. | `agent_ocean_conditions` |
| **3** | **Marine Life Agent** | Evaluates coral thermal bleaching risk (Degree Heating Weeks), seagrass light attenuation, and fish hypoxia vitality. | `agent_marine_life` |
| **4** | **Anomaly Detection Agent** | Multivariate outlier scoring using Scikit-Learn Isolation Forest and statistical Z-scores (composite anomaly score 0.0 - 1.0). | `agent_anomaly_detection` |
| **5** | **Decision Support Agent** | Synthesizes evidence across all agents and formulates concrete, protocol-driven verification checklists for field personnel. | `agent_decision_support` |
| **6** | **Alert and Reporting Agent** | Compiles formal tracking IDs (`ALT-YYYYMM-...`), assigns standardized risk categories, and prepares downloadable intelligence reports. | `agent_alert_reporting` |

---

## ⚡ Demonstration Scenario: Coastal Water Anomaly

A built-in demonstration scenario demonstrates the collaborative workflow using illustrative coastal readings for **Station STN-001 (Gulf of Mannar)**:

- **Temperature**: `31.0°C` (Baseline: `27.2°C`, Deviation: `+3.8°C`)
- **Turbidity**: `18.0 NTU` (Baseline: `3.5 NTU`, Deviation: `+14.5 NTU`, `5.1x` baseline)
- **Salinity**: `35.0 PSU` (Baseline: `33.8 PSU`)
- **Dissolved Oxygen**: `4.3 mg/L` (Baseline: `6.8 mg/L`, Hypoxia threshold: `< 5.0 mg/L`)

### Expected Multi-Agent Workflow:
1. **Ocean Conditions Agent** flags thermal spike (`+3.8°C` deviation).
2. **Pollution Detection Agent** flags elevated particulate scattering (`18 NTU`).
3. **Anomaly Detection Agent** detects synergistic multivariate combination (Isolation Forest score: `0.835`).
4. **Marine Life Agent** identifies acute thermal stress on *Acropora* corals and benthic seagrass meadows.
5. **Decision Support Agent** formulates 5 verification steps (ASV bottle sampling, sensor wiper check, Copernicus Sentinel-2 satellite imagery review).
6. **Alert and Reporting Agent** issues warning **`ALT-202611-D580`** with status **"Needs Verification"** and risk level **"High (Needs Immediate Verification)"**.

---

## 📁 Project Folder Structure

```
orca/
│
├── app.py                      # Flask backend, REST API routes, CSV export
├── database.py                 # SQLite schema, 8 global stations, 30-day time-series
├── orca.db                     # SQLite database file (auto-generated)
├── requirements.txt            # Python dependencies (Flask, pandas, numpy, scikit-learn)
├── README.md                   # Complete documentation and setup guide
│
├── ml/
│   ├── __init__.py
│   └── anomaly_model.py        # Scikit-Learn IsolationForest + Z-score ensemble
│
├── agents/
│   ├── __init__.py
│   ├── pollution_agent.py      # Agent 1
│   ├── ocean_conditions_agent.py # Agent 2
│   ├── marine_life_agent.py    # Agent 3
│   ├── anomaly_detection_agent.py # Agent 4
│   ├── decision_support_agent.py  # Agent 5
│   ├── alert_reporting_agent.py   # Agent 6
│   └── agent_orchestrator.py   # Pipeline Coordinator
│
├── static/
│   ├── css/
│   │   └── style.css           # Deep ocean glassmorphism, responsive styling
│   └── js/
│       ├── main.js             # SPA tab router, data loader, modal handler
│       ├── map.js              # Leaflet.js interactive ocean buoy map
│       ├── charts.js           # Chart.js time-series hydrography charts
│       └── simulation.js       # Real-time multi-agent deliberation animator
│
├── templates/
│   └── index.html              # Modern, responsive single-page dashboard
│
└── tests/
    ├── test_agents.py          # Unit & integration tests for all 6 agents
    └── test_api.py             # Flask REST API endpoint tests
```

---

## 🚀 Getting Started on Windows 11

### Step 1: Clone or Navigate to the Project Directory
Open **PowerShell** or **Command Prompt**:
```powershell
cd c:\Users\harik\OneDrive\Desktop\orca
```

### Step 2: Ensure Dependencies are Installed
Install required packages using pip:
```powershell
pip install -r requirements.txt
```

### Step 3: Initialize and Seed the Database
Initialize the SQLite database with the 8 monitoring stations and 30-day historical readings:
```powershell
python database.py
```

### Step 4: Run Automated Tests (Optional)
Run the multi-agent and REST API test suites:
```powershell
python -m unittest discover tests
```
*(All 10 tests should pass with code `OK`)*

### Step 5: Start the ORCA Web Server
Launch the application:
```powershell
python app.py
```

### Step 6: Open the Application in your Browser
Navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🌐 Public Data Source Integrations (Roadmap)

ORCA is architected with modular data ingest adapters ready for live API integration:
- **Copernicus Marine Service**: Sea Surface Temperature (OSTIA) and In-Situ physical observations.
- **NOAA NDBC**: Real-time ocean meteorological and moored buoy sensor feeds.
- **NASA Earthdata**: MODIS-Aqua & VIIRS particulate backscattering & chlorophyll products.
- **INCOIS**: Indian Ocean coastal automated observation buoys and RAMA array.

---

## 🛡️ Scientific Reliability & Safety Notice

- **Human-in-the-Loop Imperative**: ORCA supports human oceanographers and coastal emergency authorities; it does **not** replace certified experts.
- **Illustrative Sample Data**: Datasets used in this prototype are clearly labelled illustrative historical/synthetic feeds.
- **Verification Rule**: An anomalous sensor reading is an investigative lead, **not** definitive proof of pollution. Field physical sampling and sensor recalibration are required before operational or regulatory action.

