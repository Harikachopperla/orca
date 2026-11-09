/**
 * ORCA – Marine Ecosystem Intelligence
 * Main Application Controller & State Manager
 */

// Global state store
const ORCA_STATE = {
    activeTab: 'home',
    stations: [],
    selectedStationId: 'STN-001',
    alerts: [],
    agents: [],
    marineSpecies: [],
    summary: {},
    mapInitialized: false
};

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadInitialData();
    setupDemoButton();
    setupVerifyModal();
    setupSliders();
    startLiveTelemetryTicker();
    setupAgentLiveTerminal();
    setupHydrophoneAudioAndVisualizer();

    // Auto-run demonstration workflow on startup so agents are visibly active immediately
    setTimeout(() => {
        if (window.runDemonstrationWorkflow && !window.lastSimulationResult) {
            window.runDemonstrationWorkflow();
        }
    }, 700);
});

// 1. Navigation Controller (Tabs)
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = item.getAttribute('data-tab');
            if (targetTab) {
                switchTab(targetTab);
            }
        });
    });

    // Hash router support (e.g. #dashboard)
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '');
        if (hash) switchTab(hash);
    });

    if (window.location.hash) {
        switchTab(window.location.hash.replace('#', ''));
    }
}

function switchTab(tabId) {
    const targetView = document.getElementById(`view-${tabId}`);
    if (!targetView) return;

    ORCA_STATE.activeTab = tabId;
    window.location.hash = tabId;

    // Update active nav links
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-tab') === tabId);
    });

    // Update active tab views
    document.querySelectorAll('.tab-view').forEach(view => {
        view.classList.remove('active');
    });
    targetView.classList.add('active');

    // Update topbar title
    const topTitle = document.getElementById('topbarTitle');
    const titles = {
        'home': 'Home – Executive Overview',
        'dashboard': 'Global Marine Intelligence Dashboard',
        'ocean-map': 'Interactive Ocean Buoy & Satellite Map',
        'pollution': 'Water Quality & Pollution Monitoring',
        'conditions': 'Physical Hydrography & Ocean Conditions',
        'marine-life': 'Marine Biodiversity & Habitat Integrity',
        'ai-agents': 'Collaborative AI Agent Console (6 Agents)',
        'alerts': 'Alerts, Anomalies & Verification Queue',
        'reports': 'Intelligence Reports & Data Export',
        'about': 'About ORCA & Public Ocean Data Integrations'
    };
    if (topTitle) topTitle.innerText = titles[tabId] || 'ORCA Intelligence';

    // Trigger tab-specific initializations
    if (tabId === 'ocean-map') {
        if (window.initOceanMap) {
            window.initOceanMap(ORCA_STATE.stations);
        }
        if (window.orcaMapManager) {
            setTimeout(() => window.orcaMapManager.invalidateSize(true), 60);
            setTimeout(() => window.orcaMapManager.invalidateSize(true), 250);
            setTimeout(() => window.orcaMapManager.invalidateSize(true), 600);
        }
    } else if (tabId === 'conditions' || tabId === 'pollution') {
        if (window.renderStationCharts) {
            window.renderStationCharts(ORCA_STATE.selectedStationId);
        }
    }
}

// 2. Load API Data
async function loadInitialData() {
    try {
        const [stationsRes, alertsRes, summaryRes, agentsRes, marineRes] = await Promise.all([
            fetch('/api/stations').then(r => r.json()),
            fetch('/api/alerts').then(r => r.json()),
            fetch('/api/reports/summary').then(r => r.json()),
            fetch('/api/agents/status').then(r => r.json()),
            fetch('/api/marine-life').then(r => r.json())
        ]);

        if (stationsRes.success) {
            ORCA_STATE.stations = stationsRes.stations;
            populateStationSelectors();
            renderDashboardCards();
            renderStationsTable();
            if (window.initOceanMap) {
                window.initOceanMap(stationsRes.stations);
            }
        }

        if (alertsRes.success) {
            ORCA_STATE.alerts = alertsRes.alerts;
            renderAlertsBadges();
            renderAlertsList();
        }

        if (summaryRes.success) {
            ORCA_STATE.summary = summaryRes.summary;
            renderSummaryMetrics();
        }

        if (agentsRes.success) {
            ORCA_STATE.agents = agentsRes.agents;
            renderAgentsGrid();
        }

        if (marineRes.success) {
            ORCA_STATE.marineSpecies = marineRes.species;
            renderMarineSpeciesView();
        }

        // Render charts for default station
        if (window.renderStationCharts) {
            window.renderStationCharts(ORCA_STATE.selectedStationId);
        }

    } catch (err) {
        console.error('Error fetching ORCA initial data:', err);
    }
}

// 3. UI Rendering Functions
function renderSummaryMetrics() {
    const s = ORCA_STATE.summary;
    const elStations = document.getElementById('metricStations');
    const elAlerts = document.getElementById('metricAlerts');
    const elReadings = document.getElementById('metricReadings');
    const elAgents = document.getElementById('metricAgents');

    if (elStations) elStations.innerText = s.total_stations || '8';
    if (elAlerts) elAlerts.innerText = s.open_alerts || '1';
    if (elReadings) elReadings.innerText = (s.total_readings || 500) + "+";
    if (elAgents) elAgents.innerText = `${s.active_ai_agents || 6}/6 Active`;
}

function renderAlertsBadges() {
    const openCount = ORCA_STATE.alerts.filter(a => a.status === 'Needs Verification').length;
    const badge = document.getElementById('alertNavBadge');
    if (badge) {
        badge.innerText = openCount;
        badge.style.display = openCount > 0 ? 'inline-block' : 'none';
    }
}

function populateStationSelectors() {
    const selects = document.querySelectorAll('.station-selector');
    selects.forEach(sel => {
        sel.innerHTML = '';
        ORCA_STATE.stations.forEach(stn => {
            const opt = document.createElement('option');
            opt.value = stn.id;
            opt.innerText = `${stn.id} – ${stn.name} (${stn.region})`;
            if (stn.id === ORCA_STATE.selectedStationId) opt.selected = true;
            sel.appendChild(opt);
        });

        sel.addEventListener('change', (e) => {
            ORCA_STATE.selectedStationId = e.target.value;
            // Sync other selectors
            selects.forEach(other => other.value = e.target.value);
            if (window.renderStationCharts) {
                window.renderStationCharts(e.target.value);
            }
            updateStationCard(e.target.value);
        });
    });
}

function updateStationCard(stationId) {
    const stn = ORCA_STATE.stations.find(s => s.id === stationId);
    if (!stn || !stn.latest_reading) return;

    const r = stn.latest_reading;
    const container = document.getElementById('selectedStationCard');
    if (container) {
        container.innerHTML = `
            <div class="orca-card-header">
                <div>
                    <h3 style="font-size: 16px; color: #fff;">${stn.name}</h3>
                    <p style="font-size: 11.5px; color: var(--cyan-primary); margin-top: 2px;">
                        ${stn.region} • ${stn.station_type} • Depth: ${stn.depth_m}m
                    </p>
                </div>
                <span class="badge ${stn.status === 'NEEDS_VERIFICATION' ? 'badge-verification' : 'badge-normal'}">
                    ${stn.status}
                </span>
            </div>
            <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 0;">
                <div style="background: rgba(4,15,33,0.5); padding: 12px; border-radius: 8px;">
                    <span style="font-size: 11px; color: var(--text-muted);">Temperature</span>
                    <h4 style="font-size: 18px; color: #fff;">${r.temperature_c}°C</h4>
                    <span style="font-size: 10px; color: var(--text-dim);">Baseline: ${stn.baseline_temp_c}°C</span>
                </div>
                <div style="background: rgba(4,15,33,0.5); padding: 12px; border-radius: 8px;">
                    <span style="font-size: 11px; color: var(--text-muted);">Turbidity</span>
                    <h4 style="font-size: 18px; color: ${r.turbidity_ntu > 10 ? '#f87171' : '#fff'};">${r.turbidity_ntu} NTU</h4>
                    <span style="font-size: 10px; color: var(--text-dim);">Baseline: ${stn.baseline_turbidity_ntu} NTU</span>
                </div>
                <div style="background: rgba(4,15,33,0.5); padding: 12px; border-radius: 8px;">
                    <span style="font-size: 11px; color: var(--text-muted);">Salinity</span>
                    <h4 style="font-size: 18px; color: #fff;">${r.salinity_psu} PSU</h4>
                    <span style="font-size: 10px; color: var(--text-dim);">Baseline: ${stn.baseline_salinity_psu} PSU</span>
                </div>
                <div style="background: rgba(4,15,33,0.5); padding: 12px; border-radius: 8px;">
                    <span style="font-size: 11px; color: var(--text-muted);">Dissolved Oxygen</span>
                    <h4 style="font-size: 18px; color: ${r.dissolved_oxygen_mgl < 5 ? '#fbbf24' : '#fff'};">${r.dissolved_oxygen_mgl} mg/L</h4>
                    <span style="font-size: 10px; color: var(--text-dim);">Baseline: ${stn.baseline_dissolved_oxygen_mgl} mg/L</span>
                </div>
            </div>
            <div style="margin-top: 12px; font-size: 11.5px; color: var(--text-dim); display: flex; justify-content: space-between;">
                <span>Source: ${stn.source_authority}</span>
                <span>Last telemetry: ${r.timestamp}</span>
            </div>
        `;
    }
}

function renderDashboardCards() {
    updateStationCard(ORCA_STATE.selectedStationId);
}

function renderStationsTable() {
    const tbody = document.getElementById('stationsTableBody');
    if (!tbody) return;

    tbody.innerHTML = ORCA_STATE.stations.map(stn => {
        const r = stn.latest_reading || {};
        const isAlert = stn.status === 'NEEDS_VERIFICATION' || stn.status === 'INVESTIGATION';
        return `
            <tr>
                <td><strong>${stn.id}</strong></td>
                <td>
                    <div style="font-weight: 600; color: #fff;">${stn.name}</div>
                    <div style="font-size: 11px; color: var(--text-dim);">${stn.region}</div>
                </td>
                <td>${r.temperature_c ?? '--'}°C <span style="font-size: 10px; color: var(--text-dim);">(base ${stn.baseline_temp_c})</span></td>
                <td><span style="color: ${(r.turbidity_ntu || 0) > 8 ? '#f87171' : 'inherit'}; font-weight: 600;">${r.turbidity_ntu ?? '--'} NTU</span></td>
                <td>${r.salinity_psu ?? '--'} PSU</td>
                <td>${r.dissolved_oxygen_mgl ?? '--'} mg/L</td>
                <td>
                    <span class="badge ${isAlert ? 'badge-verification' : 'badge-normal'}">
                        ${stn.status}
                    </span>
                </td>
                <td>
                    <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px;" onclick="inspectStation('${stn.id}')">
                        Inspect
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function inspectStation(stnId) {
    ORCA_STATE.selectedStationId = stnId;
    populateStationSelectors();
    updateStationCard(stnId);
    switchTab('conditions');
}

function renderAlertsList() {
    const container = document.getElementById('alertsListContainer');
    if (!container) return;

    if (ORCA_STATE.alerts.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">No active anomalies detected across monitoring network.</div>`;
        return;
    }

    container.innerHTML = ORCA_STATE.alerts.map(a => {
        const isPending = a.status === 'Needs Verification';
        let evidenceHtml = '';
        if (typeof a.supporting_evidence === 'object') {
            evidenceHtml = Object.entries(a.supporting_evidence).map(([k, v]) => {
                if (typeof v === 'object' && v !== null) {
                    return `<div>• <strong>${k.replace('_', ' ')}:</strong> Observed ${v.observed} (Baseline ${v.baseline}, Δ ${v.deviation})</div>`;
                }
                return `<div>• <strong>${k.replace('_', ' ')}:</strong> ${v}</div>`;
            }).join('');
        }

        let actionsHtml = '';
        if (Array.isArray(a.recommended_actions)) {
            actionsHtml = a.recommended_actions.map(act => `<li style="margin-bottom: 4px;">${act}</li>`).join('');
        }

        return `
            <div class="orca-card" style="margin-bottom: 18px; border-left: 4px solid ${isPending ? 'var(--risk-moderate)' : 'var(--risk-normal)'};">
                <div class="orca-card-header">
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-weight: 700; color: var(--cyan-primary); font-size: 13px;">${a.id}</span>
                            <span class="badge ${isPending ? 'badge-verification' : 'badge-normal'}">${a.risk_level}</span>
                            <span style="font-size: 11.5px; color: var(--text-dim);">${a.timestamp}</span>
                        </div>
                        <h4 style="font-size: 16px; color: #fff; margin-top: 6px;">${a.anomaly_type}</h4>
                        <div style="font-size: 12px; color: var(--text-muted);">${a.station_name} (${a.station_id})</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 11px; color: var(--text-dim);">AI Confidence</div>
                        <div style="font-size: 20px; font-weight: 700; color: var(--cyan-primary);">${a.confidence_score}%</div>
                    </div>
                </div>

                <div class="grid-equal" style="margin-bottom: 14px;">
                    <div style="background: rgba(3,10,22,0.6); padding: 12px; border-radius: 8px; font-size: 12px;">
                        <strong style="color: var(--cyan-primary); display: block; margin-bottom: 6px;">Supporting Multi-Sensor Evidence:</strong>
                        <div style="color: var(--text-muted); line-height: 1.6;">${evidenceHtml || 'Sensor telemetry within parameters'}</div>
                    </div>
                    <div style="background: rgba(3,10,22,0.6); padding: 12px; border-radius: 8px; font-size: 12px;">
                        <strong style="color: #fbbf24; display: block; margin-bottom: 6px;">Recommended Verification Protocol:</strong>
                        <ul style="padding-left: 18px; color: var(--text-muted); line-height: 1.5;">${actionsHtml || '<li>Routine monitoring</li>'}</ul>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px; font-size: 12px;">
                    <div>
                        ${a.human_verified ? `
                            <span style="color: #34d399; font-weight: 600;">✓ Verified by Human Expert</span>
                            <span style="color: var(--text-dim); margin-left: 8px;">"${a.verifier_notes || 'Confirmed'}"</span>
                        ` : `
                            <span style="color: #fbbf24;">⚠ Awaiting Human Oceanographer Verification</span>
                        `}
                    </div>
                    <div>
                        ${isPending ? `
                            <button class="btn btn-secondary" onclick="openAsvMissionModal('${a.id}', '${a.station_name}')" style="margin-right: 8px; border-color: rgba(16, 185, 129, 0.4); color: #34d399;">
                                🚁 Task ASV Drone
                            </button>
                            <button class="btn btn-primary" onclick="openVerifyModal('${a.id}', '${a.station_name}')">
                                Human Verification Action
                            </button>
                        ` : `
                            <span class="badge badge-normal">Status: ${a.status}</span>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderAgentsGrid() {
    const container = document.getElementById('agentsGridContainer');
    if (!container) return;

    const agentIcons = {
        'agent_pollution': '🧪',
        'agent_ocean_conditions': '🌊',
        'agent_marine_life': '🐬',
        'agent_anomaly_detection': '🧠',
        'agent_decision_support': '⚖️',
        'agent_alert_reporting': '📢'
    };

    container.innerHTML = ORCA_STATE.agents.map(ag => {
        const icon = agentIcons[ag.id] || '🤖';
        return `
            <div class="agent-card">
                <div class="agent-header">
                    <div class="agent-title-group">
                        <div class="agent-avatar">${icon}</div>
                        <div>
                            <div class="agent-name">${ag.name}</div>
                            <div class="agent-role">${ag.role}</div>
                        </div>
                    </div>
                    <span class="badge badge-normal" style="font-size: 10px;">${ag.status}</span>
                </div>
                <div style="font-size: 12px; color: var(--text-dim); margin: 8px 0;">Capabilities:</div>
                <ul style="padding-left: 16px; font-size: 11.5px; color: var(--text-muted); line-height: 1.5;">
                    ${ag.capabilities.map(c => `<li>${c}</li>`).join('')}
                </ul>
                <div class="agent-finding-box">
                    <span style="color: var(--cyan-primary); font-weight: 600;">Structured Output Format:</span><br>
                    ${ag.communication_format}
                </div>
            </div>
        `;
    }).join('');
}

function renderMarineSpeciesView() {
    const container = document.getElementById('marineSpeciesContainer');
    if (!container) return;

    container.innerHTML = ORCA_STATE.marineSpecies.map(sp => {
        const isVulnerable = sp.conservation_status.includes('Vulnerable') || sp.conservation_status.includes('Endangered');
        return `
            <div class="orca-card" style="padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4 style="font-size: 15px; color: #fff;">${sp.common_name}</h4>
                        <div style="font-size: 12px; font-style: italic; color: var(--cyan-primary);">${sp.species_name}</div>
                    </div>
                    <span class="badge ${isVulnerable ? 'badge-high' : 'badge-normal'}" style="font-size: 10px;">
                        ${sp.conservation_status}
                    </span>
                </div>
                <div style="margin: 12px 0; font-size: 12px; color: var(--text-muted);">
                    <div><strong>Station:</strong> ${sp.station_name}</div>
                    <div><strong>Category:</strong> ${sp.category}</div>
                    <div><strong>Latest Count:</strong> ${sp.count_observed} individuals</div>
                </div>
                <div style="background: rgba(3,10,22,0.6); padding: 8px 12px; border-radius: 6px; font-size: 11.5px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="color: var(--text-dim);">Habitat Health Index</span>
                        <strong style="color: ${sp.habitat_health_index < 70 ? '#fbbf24' : '#34d399'};">${sp.habitat_health_index}/100</strong>
                    </div>
                    <div style="background: #11253e; height: 5px; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${sp.habitat_health_index}%; height: 100%; background: ${sp.habitat_health_index < 70 ? '#fbbf24' : '#10b981'};"></div>
                    </div>
                </div>
                <p style="font-size: 11.5px; color: var(--text-dim); margin-top: 10px; line-height: 1.4;">${sp.notes || ''}</p>
            </div>
        `;
    }).join('');
}

// 4. Modal for Human-In-The-Loop Verification
let currentVerifyAlertId = null;

function setupVerifyModal() {
    const modal = document.getElementById('verifyModal');
    const closeBtn = document.getElementById('modalCloseBtn');
    const form = document.getElementById('verifyForm');

    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');

    window.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('active');
    };

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const action = document.getElementById('verifyAction').value;
            const notes = document.getElementById('verifyNotes').value;

            try {
                const res = await fetch(`/api/alerts/${currentVerifyAlertId}/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: action, notes: notes })
                }).then(r => r.json());

                if (res.success) {
                    modal.classList.remove('active');
                    alert(`Alert ${currentVerifyAlertId} successfully updated with action: ${action}`);
                    loadInitialData();
                }
            } catch (err) {
                console.error(err);
                alert('Failed to submit verification.');
            }
        };
    }
}

function openVerifyModal(alertId, stationName) {
    currentVerifyAlertId = alertId;
    const modal = document.getElementById('verifyModal');
    const title = document.getElementById('modalAlertTitle');
    if (title) title.innerText = `Verify Alert: ${alertId} (${stationName})`;
    modal.classList.add('active');
}

// 9. Autonomous ASV Drone Mission Modal
function openAsvMissionModal(alertId, stationName) {
    const modal = document.getElementById('asvModal');
    if (!modal) return;

    const title = document.getElementById('asvModalTitle');
    if (title) title.innerText = `ASV Drone Dispatch: ${alertId}`;

    const subtitle = document.getElementById('asvModalSubtitle');
    if (subtitle) subtitle.innerText = `Target: ${stationName} • Optical & Bottle Sampling`;

    modal.classList.add('active');
}

// 10. Web Audio API Hydrophone Bioacoustics Synthesizer & Canvas Spectrogram
let audioCtx = null;
let isAudioPlaying = false;
let ambientOsc = null;
let ambientGain = null;
let whaleInterval = null;

function setupHydrophoneAudioAndVisualizer() {
    // 1. Canvas Frequency Spectrum Visualizer
    const canvas = document.getElementById('spectrogramCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width = canvas.width = canvas.parentElement.clientWidth || 600;
        let height = canvas.height = 120;

        window.addEventListener('resize', () => {
            if (canvas.parentElement) {
                width = canvas.width = canvas.parentElement.clientWidth;
            }
        });

        const barCount = 48;
        const bars = Array.from({ length: barCount }, () => Math.random() * 0.4 + 0.1);

        function drawSpectrogram() {
            ctx.fillStyle = '#01060e';
            ctx.fillRect(0, 0, width, height);

            const barWidth = width / barCount;
            for (let i = 0; i < barCount; i++) {
                // Smooth oscillation
                bars[i] += (Math.random() - 0.49) * 0.08;
                bars[i] = Math.max(0.08, Math.min(0.92, bars[i]));

                // Highlight whale vocalization band around bar 8-12 and dolphin chirp around bar 24-28
                const isWhaleBand = i >= 6 && i <= 12;
                const isDugongBand = i >= 20 && i <= 26;

                const grad = ctx.createLinearGradient(0, height, 0, 0);
                if (isWhaleBand) {
                    grad.addColorStop(0, '#00f2fe');
                    grad.addColorStop(1, '#3b82f6');
                } else if (isDugongBand) {
                    grad.addColorStop(0, '#10b981');
                    grad.addColorStop(1, '#34d399');
                } else {
                    grad.addColorStop(0, '#0f2748');
                    grad.addColorStop(1, '#38bdf8');
                }

                ctx.fillStyle = grad;
                const h = bars[i] * (height - 20);
                ctx.fillRect(i * barWidth + 1, height - h, barWidth - 2, h);
            }

            requestAnimationFrame(drawSpectrogram);
        }

        drawSpectrogram();
    }

    // 2. Synthesized Web Audio API Player
    const btnAudio = document.getElementById('btnToggleAudio');
    if (btnAudio) {
        btnAudio.onclick = () => {
            if (!isAudioPlaying) {
                startOceanHydrophoneAudio();
                btnAudio.innerHTML = '🔇 Stop Hydrophone Feed';
                btnAudio.style.borderColor = '#ef4444';
                btnAudio.style.color = '#f87171';
            } else {
                stopOceanHydrophoneAudio();
                btnAudio.innerHTML = '🔊 Synthesize Hydrophone Sound (Web Audio)';
                btnAudio.style.borderColor = 'var(--cyan-primary)';
                btnAudio.style.color = '#fff';
            }
        };
    }
}

function startOceanHydrophoneAudio() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();

        // Deep ocean ambient rumble
        ambientOsc = audioCtx.createOscillator();
        ambientOsc.type = 'sine';
        ambientOsc.frequency.setValueAtTime(55, audioCtx.currentTime);

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(140, audioCtx.currentTime);

        ambientGain = audioCtx.createGain();
        ambientGain.gain.setValueAtTime(0.08, audioCtx.currentTime);

        ambientOsc.connect(filter);
        filter.connect(ambientGain);
        ambientGain.connect(audioCtx.destination);
        ambientOsc.start();

        // Occasional harmonic whale whistle
        whaleInterval = setInterval(() => {
            if (!audioCtx || audioCtx.state === 'closed') return;
            playWhaleVocalization(audioCtx);
        }, 4500);

        isAudioPlaying = true;
    } catch (e) {
        console.warn('Web Audio playback error:', e);
    }
}

function playWhaleVocalization(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;
    const startFreq = 220 + Math.random() * 200;
    const endFreq = startFreq + (Math.random() > 0.5 ? 350 : -150);

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 1.2);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.5);
}

function stopOceanHydrophoneAudio() {
    if (whaleInterval) clearInterval(whaleInterval);
    if (ambientOsc) {
        try { ambientOsc.stop(); } catch (e) {}
    }
    if (audioCtx) {
        try { audioCtx.close(); } catch (e) {}
        audioCtx = null;
    }
    isAudioPlaying = false;
}

// 5. Interactive Sliders & Demo Button Setup
function setupSliders() {
    const sliders = ['simTemp', 'simTurb', 'simSal', 'simDO'];
    sliders.forEach(id => {
        const input = document.getElementById(id);
        const valSpan = document.getElementById(`${id}Val`);
        if (input && valSpan) {
            input.oninput = () => {
                valSpan.innerText = input.value;
            };
        }
    });
}

function setupDemoButton() {
    const btnTopbar = document.getElementById('btnTopbarDemo');
    const btnHero = document.getElementById('btnHeroDemo');
    const btnSimPreset = document.getElementById('btnSimDemoPreset');
    const btnSimCustom = document.getElementById('btnRunCustomSim');

    const triggerDemo = async () => {
        switchTab('ai-agents');
        if (window.runDemonstrationWorkflow) {
            window.runDemonstrationWorkflow();
        }
    };

    if (btnTopbar) btnTopbar.onclick = triggerDemo;
    if (btnHero) btnHero.onclick = triggerDemo;
    if (btnSimPreset) btnSimPreset.onclick = triggerDemo;

    if (btnSimCustom) {
        btnSimCustom.onclick = () => {
            const obs = {
                temperature_c: parseFloat(document.getElementById('simTemp').value),
                turbidity_ntu: parseFloat(document.getElementById('simTurb').value),
                salinity_psu: parseFloat(document.getElementById('simSal').value),
                dissolved_oxygen_mgl: parseFloat(document.getElementById('simDO').value),
                ph_level: 8.1,
                chlorophyll_a: 1.2,
                ocean_current_speed_ms: 0.5
            };
            const stnId = document.getElementById('simStationSelect').value;
            if (window.runAgentPipelineSimulation) {
                window.runAgentPipelineSimulation(stnId, obs);
            }
        };
    }
}

// 6. CSV Export Trigger
function downloadReportCSV() {
    const stationId = ORCA_STATE.selectedStationId;
    window.location.href = `/api/reports/export?station_id=${stationId}`;
}

// 7. Real-Time Telemetry Stream & Live Agent Terminal
let liveTickerInterval = null;
let agentTerminalInterval = null;

function startLiveTelemetryTicker() {
    if (liveTickerInterval) return;
    liveTickerInterval = setInterval(async () => {
        try {
            const res = await fetch('/api/telemetry/live-tick', { method: 'POST' }).then(r => r.json());
            if (res.success && res.reading) {
                // Update station in local state
                const stn = ORCA_STATE.stations.find(s => s.id === res.station_id);
                if (stn) {
                    stn.latest_reading = { ...stn.latest_reading, ...res.reading, timestamp: res.timestamp };
                    stn.last_ping = res.timestamp;
                    if (stn.id === ORCA_STATE.selectedStationId) {
                        updateStationCard(stn.id);
                    }
                    renderStationsTable();
                }

                // Update live text in topbar
                const liveText = document.getElementById('liveStreamText');
                if (liveText) {
                    const timeOnly = res.timestamp.split(' ')[1];
                    liveText.innerHTML = `LIVE TELEMETRY: PING (${res.station_id} @ ${timeOnly})`;
                }
            }
        } catch (e) {
            // silent fail on network glitch
        }
    }, 4500);
}

function setupAgentLiveTerminal() {
    const terminal = document.getElementById('liveAgentTerminal');
    if (!terminal || agentTerminalInterval) return;

    const streamEvents = [
        { icon: '🧪', agent: 'POLLUTION AGENT', msg: 'Turbidity optical backscatter scan on STN-001 (Gulf of Mannar) • Turbidity 18.0 NTU (Warning flagged)' },
        { icon: '🌊', agent: 'OCEAN CONDITIONS', msg: 'Evaluating thermohaline profile • Sea Surface Temp at 31.0°C (+3.8°C above baseline)' },
        { icon: '🧠', agent: 'ANOMALY DETECTION', msg: 'Running IsolationForest (100 estimators) & Z-score multi-variate ensemble • Score: 0.835 [High]' },
        { icon: '🐬', agent: 'MARINE LIFE AGENT', msg: 'Cross-checking Acropora coral thermal bleaching threshold & Dugong seagrass meadow health index' },
        { icon: '⚖️', agent: 'DECISION SUPPORT', msg: 'Compiling multi-agent corroboration • Formulating 5 human verification protocols' },
        { icon: '📢', agent: 'ALERT REPORTING', msg: 'Dispatched alert ALT-202611-D580 • Designating status: NEEDS VERIFICATION (Risk: High)' },
        { icon: '🌊', agent: 'OCEAN CONDITIONS', msg: 'Station STN-002 (Monterey Bay M2): Thermohaline equilibrium verified nominal at 13.8°C' },
        { icon: '🧪', agent: 'POLLUTION AGENT', msg: 'Station STN-006 (Arabian Sea): Pelagic upwelling plume clear, DO at 6.0 mg/L' },
        { icon: '🧠', agent: 'ANOMALY DETECTION', msg: 'Ensemble convergence test passed across all 8 stations • Background confidence 91.2%' }
    ];

    let eventIdx = 0;

    const pushLog = () => {
        const ev = streamEvents[eventIdx % streamEvents.length];
        eventIdx++;

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        const line = document.createElement('div');
        line.style.display = 'flex';
        line.style.alignItems = 'center';
        line.style.gap = '8px';
        line.innerHTML = `
            <span style="color: #64748b;">[${timeStr}]</span>
            <span style="color: var(--cyan-primary); font-weight: 600;">${ev.icon} ${ev.agent}:</span>
            <span style="color: #cbd5e1;">${ev.msg}</span>
        `;

        terminal.appendChild(line);
        if (terminal.children.length > 5) {
            terminal.removeChild(terminal.firstChild);
        }
    };

    // Pre-populate initial entries
    for (let i = 0; i < 4; i++) {
        pushLog();
    }

    agentTerminalInterval = setInterval(pushLog, 3000);
}

// 8. Official Intelligence Audit Briefing Modal
function openOfficialBriefingModal() {
    const modal = document.getElementById('briefingModal');
    if (!modal) return;

    const timeEl = document.getElementById('certTimestamp');
    if (timeEl) {
        timeEl.innerText = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    }

    const stationsCount = document.getElementById('certStationsCount');
    if (stationsCount && ORCA_STATE.stations) {
        stationsCount.innerText = `${ORCA_STATE.stations.length} Moored Stations Global`;
    }

    const primaryConcern = document.getElementById('certPrimaryConcern');
    if (primaryConcern && ORCA_STATE.alerts && ORCA_STATE.alerts.length > 0) {
        primaryConcern.innerText = `${ORCA_STATE.alerts[0].station_name} (${ORCA_STATE.alerts[0].id})`;
    }

    modal.classList.add('active');
}

// 9. Autonomous ASV Drone Mission Modal
function openAsvMissionModal(alertId, stationName) {
    const modal = document.getElementById('asvModal');
    if (!modal) return;

    const title = document.getElementById('asvModalTitle');
    if (title) title.innerText = `ASV Drone Dispatch: ${alertId}`;

    const subtitle = document.getElementById('asvModalSubtitle');
    if (subtitle) subtitle.innerText = `Target: ${stationName} • Optical & Bottle Sampling`;

    modal.classList.add('active');
}

// 10. Web Audio API Hydrophone Bioacoustics Synthesizer & Canvas Spectrogram
let audioCtx = null;
let isAudioPlaying = false;
let ambientOsc = null;
let ambientGain = null;
let whaleInterval = null;

function setupHydrophoneAudioAndVisualizer() {
    // 1. Canvas Frequency Spectrum Visualizer
    const canvas = document.getElementById('spectrogramCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width = canvas.width = canvas.parentElement.clientWidth || 600;
        let height = canvas.height = 120;

        window.addEventListener('resize', () => {
            if (canvas.parentElement) {
                width = canvas.width = canvas.parentElement.clientWidth;
            }
        });

        const barCount = 48;
        const bars = Array.from({ length: barCount }, () => Math.random() * 0.4 + 0.1);

        function drawSpectrogram() {
            ctx.fillStyle = '#01060e';
            ctx.fillRect(0, 0, width, height);

            const barWidth = width / barCount;
            for (let i = 0; i < barCount; i++) {
                // Smooth oscillation
                bars[i] += (Math.random() - 0.49) * 0.08;
                bars[i] = Math.max(0.08, Math.min(0.92, bars[i]));

                // Highlight whale vocalization band around bar 8-12 and dolphin chirp around bar 24-28
                const isWhaleBand = i >= 6 && i <= 12;
                const isDugongBand = i >= 20 && i <= 26;

                const grad = ctx.createLinearGradient(0, height, 0, 0);
                if (isWhaleBand) {
                    grad.addColorStop(0, '#00f2fe');
                    grad.addColorStop(1, '#3b82f6');
                } else if (isDugongBand) {
                    grad.addColorStop(0, '#10b981');
                    grad.addColorStop(1, '#34d399');
                } else {
                    grad.addColorStop(0, '#0f2748');
                    grad.addColorStop(1, '#38bdf8');
                }

                ctx.fillStyle = grad;
                const h = bars[i] * (height - 20);
                ctx.fillRect(i * barWidth + 1, height - h, barWidth - 2, h);
            }

            requestAnimationFrame(drawSpectrogram);
        }

        drawSpectrogram();
    }

    // 2. Synthesized Web Audio API Player
    const btnAudio = document.getElementById('btnToggleAudio');
    if (btnAudio) {
        btnAudio.onclick = () => {
            if (!isAudioPlaying) {
                startOceanHydrophoneAudio();
                btnAudio.innerHTML = '🔇 Stop Hydrophone Feed';
                btnAudio.style.borderColor = '#ef4444';
                btnAudio.style.color = '#f87171';
            } else {
                stopOceanHydrophoneAudio();
                btnAudio.innerHTML = '🔊 Synthesize Hydrophone Sound (Web Audio)';
                btnAudio.style.borderColor = 'var(--cyan-primary)';
                btnAudio.style.color = '#fff';
            }
        };
    }
}

function startOceanHydrophoneAudio() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();

        // Deep ocean ambient rumble
        ambientOsc = audioCtx.createOscillator();
        ambientOsc.type = 'sine';
        ambientOsc.frequency.setValueAtTime(55, audioCtx.currentTime);

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(140, audioCtx.currentTime);

        ambientGain = audioCtx.createGain();
        ambientGain.gain.setValueAtTime(0.08, audioCtx.currentTime);

        ambientOsc.connect(filter);
        filter.connect(ambientGain);
        ambientGain.connect(audioCtx.destination);
        ambientOsc.start();

        // Occasional harmonic whale whistle
        whaleInterval = setInterval(() => {
            if (!audioCtx || audioCtx.state === 'closed') return;
            playWhaleVocalization(audioCtx);
        }, 4500);

        isAudioPlaying = true;
    } catch (e) {
        console.warn('Web Audio playback error:', e);
    }
}

function playWhaleVocalization(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;
    const startFreq = 220 + Math.random() * 200;
    const endFreq = startFreq + (Math.random() > 0.5 ? 350 : -150);

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 1.2);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.5);
}

function stopOceanHydrophoneAudio() {
    if (whaleInterval) clearInterval(whaleInterval);
    if (ambientOsc) {
        try { ambientOsc.stop(); } catch (e) {}
    }
    if (audioCtx) {
        try { audioCtx.close(); } catch (e) {}
        audioCtx = null;
    }
    isAudioPlaying = false;
}

