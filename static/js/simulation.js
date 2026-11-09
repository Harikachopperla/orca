/**
 * ORCA – Multi-Agent Simulation & Demonstration Scenario Runner
 * Animates the step-by-step collaborative pipeline across all 6 AI agents.
 */

window.lastSimulationResult = null;

window.runDemonstrationWorkflow = async function() {
    const container = document.getElementById('pipelineExecutionDisplay');
    const statusText = document.getElementById('pipelineStatusText');
    const jsonOutput = document.getElementById('rawJsonPayload');

    if (statusText) statusText.innerHTML = `<span style="color: var(--cyan-primary);">Initializing Demonstration Scenario: Coastal Water Anomaly (Temp: 31°C, Turbidity: 18 NTU, Salinity: 35 PSU)...</span>`;

    // Reset pipeline display
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <div class="pulse-indicator" style="width: 14px; height: 14px; margin-bottom: 12px;"></div>
                <div style="color: var(--cyan-primary); font-size: 14px; font-weight: 600;">Dispatching telemetry observation to collaborative AI agents...</div>
                <div style="color: var(--text-dim); font-size: 12px; margin-top: 4px;">Running IsolationForest and multi-variate z-score scoring...</div>
            </div>
        `;
    }

    try {
        const res = await fetch('/api/simulation/demo-preset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).then(r => r.json());

        if (!res.success) {
            if (statusText) statusText.innerHTML = `<span style="color: #ef4444;">Pipeline Error: ${res.error || 'Execution failed'}</span>`;
            return;
        }

        window.lastSimulationResult = res.result;
        if (jsonOutput) {
            jsonOutput.innerText = JSON.stringify(res.result, null, 2);
        }

        // Animate agent deliberation sequence
        animateAgentPipeline(res.result.agent_pipeline, res.result.final_verdict);

        // Refresh global state so dashboard and alerts list get updated
        if (typeof loadInitialData === 'function') {
            loadInitialData();
        }

    } catch (err) {
        console.error('Error running demonstration workflow:', err);
        if (statusText) statusText.innerHTML = `<span style="color: #ef4444;">Connection error while running agent pipeline.</span>`;
    }
};

window.runAgentPipelineSimulation = async function(stationId, observation) {
    const statusText = document.getElementById('pipelineStatusText');
    const container = document.getElementById('pipelineExecutionDisplay');
    const jsonOutput = document.getElementById('rawJsonPayload');

    if (statusText) statusText.innerHTML = `<span style="color: var(--cyan-primary);">Executing 6-Agent Pipeline for Station ${stationId}...</span>`;

    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <div class="pulse-indicator" style="width: 14px; height: 14px; margin-bottom: 12px;"></div>
                <div style="color: var(--cyan-primary); font-size: 14px;">Evaluating custom observation vector...</div>
            </div>
        `;
    }

    try {
        const res = await fetch('/api/simulation/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                station_id: stationId,
                ...observation,
                persist_alert: true
            })
        }).then(r => r.json());

        if (res.success) {
            window.lastSimulationResult = res.result;
            if (jsonOutput) {
                jsonOutput.innerText = JSON.stringify(res.result, null, 2);
            }
            animateAgentPipeline(res.result.agent_pipeline, res.result.final_verdict);
            if (typeof loadInitialData === 'function') {
                loadInitialData();
            }
        }
    } catch (err) {
        console.error(err);
    }
};

function animateAgentPipeline(agentsList, finalVerdict) {
    const container = document.getElementById('pipelineExecutionDisplay');
    const statusText = document.getElementById('pipelineStatusText');
    if (!container) return;

    container.innerHTML = '';
    const stepList = document.createElement('div');
    stepList.className = 'agent-step-pipeline';
    container.appendChild(stepList);

    const agentIcons = {
        'agent_pollution': '🧪',
        'agent_ocean_conditions': '🌊',
        'agent_marine_life': '🐬',
        'agent_anomaly_detection': '🧠',
        'agent_decision_support': '⚖️',
        'agent_alert_reporting': '📢'
    };

    // Sequential display with delay
    agentsList.forEach((ag, index) => {
        setTimeout(() => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'pipeline-step step-active';

            const icon = agentIcons[ag.agent_id] || '🤖';
            const f = ag.findings || {};

            let detailHtml = `<p>${f.summary || ''}</p>`;
            
            // Add specific highlights based on agent
            if (ag.agent_id === 'agent_pollution') {
                detailHtml += `<div style="font-size: 11.5px; color: #f87171; margin-top: 6px;">• Water Quality Severity: <strong>${f.severity}</strong> (Turbidity ${f.turbidity_ratio}x baseline)</div>`;
            } else if (ag.agent_id === 'agent_ocean_conditions') {
                detailHtml += `<div style="font-size: 11.5px; color: var(--cyan-primary); margin-top: 6px;">• Physical State: <strong>${f.physical_status}</strong> (Δ ${f.temperature_deviation_c > 0 ? '+' : ''}${f.temperature_deviation_c}°C)</div>`;
            } else if (ag.agent_id === 'agent_anomaly_detection') {
                detailHtml += `<div style="font-size: 11.5px; color: #fbbf24; margin-top: 6px;">• ML Ensemble Anomaly Score: <strong>${f.anomaly_score}</strong> (IsolationForest: ${f.iso_forest_score})</div>`;
            } else if (ag.agent_id === 'agent_decision_support') {
                detailHtml += `<div style="font-size: 11.5px; color: #a5b4fc; margin-top: 6px;">• Formulated Protocol: <strong>${f.action_priority}</strong> (${f.recommended_verification_steps?.length || 0} verification steps)</div>`;
            } else if (ag.agent_id === 'agent_alert_reporting') {
                detailHtml += `<div style="font-size: 11.5px; color: #34d399; margin-top: 6px;">• Generated Alert: <strong>${f.alert_id}</strong> • Status: <strong>${f.alert_status}</strong> [Risk: ${f.risk_level}]</div>`;
            }

            stepDiv.innerHTML = `
                <div class="step-num-badge">${index + 1}</div>
                <div class="step-content">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <h5>${icon} ${ag.agent_name}</h5>
                        <span class="badge badge-cyan" style="font-size: 10px;">${ag.status}</span>
                    </div>
                    ${detailHtml}
                </div>
            `;

            stepList.appendChild(stepDiv);

            // When last agent finishes
            if (index === agentsList.length - 1) {
                if (statusText) {
                    statusText.innerHTML = `
                        <span style="color: #34d399; font-weight: 600;">
                            ✓ All 6 Agents Completed Deliberation • Final Consensus: "${finalVerdict.anomaly_title}" (${finalVerdict.risk_level})
                        </span>
                    `;
                }
            }
        }, index * 260);
    });
}

window.toggleJsonInspector = function() {
    const el = document.getElementById('jsonInspectorBox');
    const jsonOutput = document.getElementById('rawJsonPayload');
    if (!el) return;
    const isShowing = (el.style.display === 'block');
    el.style.display = isShowing ? 'none' : 'block';
    if (!isShowing && jsonOutput) {
        if (window.lastSimulationResult) {
            jsonOutput.innerText = JSON.stringify(window.lastSimulationResult, null, 2);
        } else {
            jsonOutput.innerText = '// Multi-Agent Deliberation Pipeline Ready.\n// Click "Load Demo Scenario" or "Run Custom Telemetry" to inspect structured payloads.';
        }
    }
};

