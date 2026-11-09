/**
 * ORCA – Ocean Conditions & Pollution Charting Engine
 * Powered by Chart.js with custom deep ocean dark-mode styling.
 */

let chartTempInstance = null;
let chartSalinityInstance = null;
let chartTurbidityInstance = null;
let chartOxygenInstance = null;

// Global chart theme defaults
if (window.Chart) {
    Chart.defaults.color = '#8ba2c4';
    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(4, 15, 33, 0.95)';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(0, 242, 254, 0.4)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
}

window.renderStationCharts = async function(stationId) {
    try {
        const res = await fetch(`/api/readings/historical?station_id=${stationId}`).then(r => r.json());
        if (!res.success || !res.readings || res.readings.length === 0) return;

        const labels = res.readings.map(r => {
            const d = new Date(r.timestamp);
            return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
        });

        const temps = res.readings.map(r => r.temperature_c);
        const salinities = res.readings.map(r => r.salinity_psu);
        const turbidities = res.readings.map(r => r.turbidity_ntu);
        const oxygens = res.readings.map(r => r.dissolved_oxygen_mgl);

        const baseTemp = res.baselines.baseline_temp_c;
        const baseSal = res.baselines.baseline_salinity_psu;
        const baseTurb = res.baselines.baseline_turbidity_ntu;
        const baseOxy = res.baselines.baseline_dissolved_oxygen_mgl;

        renderTempChart(labels, temps, baseTemp);
        renderSalinityChart(labels, salinities, baseSal);
        renderTurbidityChart(labels, turbidities, baseTurb);
        renderOxygenChart(labels, oxygens, baseOxy);

    } catch (err) {
        console.error('Failed to load historical charts:', err);
    }
};

function renderTempChart(labels, data, baseline) {
    const ctx = document.getElementById('chartTemp');
    if (!ctx) return;
    if (chartTempInstance) chartTempInstance.destroy();

    const baselineData = Array(labels.length).fill(baseline);

    chartTempInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Observed SST (°C)',
                    data: data,
                    borderColor: '#00f2fe',
                    backgroundColor: 'rgba(0, 242, 254, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 6
                },
                {
                    label: `Historical Baseline (${baseline}°C)`,
                    data: baselineData,
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                    borderDash: [5, 5],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'Temperature (°C)' } }
            }
        }
    });
}

// Multi-Station Comparison Chart Engine
let chartComparisonInstance = null;

window.renderComparisonChart = async function(stationIdA, stationIdB) {
    try {
        const [resA, resB] = await Promise.all([
            fetch(`/api/readings/historical?station_id=${stationIdA}`).then(r => r.json()),
            fetch(`/api/readings/historical?station_id=${stationIdB}`).then(r => r.json())
        ]);

        if (!resA.success || !resB.success) return;

        const ctx = document.getElementById('chartComparison');
        if (!ctx) return;
        if (chartComparisonInstance) chartComparisonInstance.destroy();

        const labelsA = resA.readings.map(r => {
            const d = new Date(r.timestamp);
            return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
        });

        const tempsA = resA.readings.map(r => r.temperature_c);
        const tempsB = resB.readings.map(r => r.temperature_c);

        chartComparisonInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labelsA,
                datasets: [
                    {
                        label: `${stationIdA} – ${resA.baselines.name || stationIdA} (°C)`,
                        data: tempsA,
                        borderColor: '#00f2fe',
                        backgroundColor: 'rgba(0, 242, 254, 0.08)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: 2
                    },
                    {
                        label: `${stationIdB} – ${resB.baselines.name || stationIdB} (°C)`,
                        data: tempsB,
                        borderColor: '#fbbf24',
                        backgroundColor: 'rgba(251, 191, 36, 0.08)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.04)' } },
                    y: { grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'Comparative SST (°C)' } }
                }
            }
        });

        // Compute differentials
        const latestA = resA.readings[resA.readings.length - 1] || {};
        const latestB = resB.readings[resB.readings.length - 1] || {};

        const tempDiff = ((latestA.temperature_c || 0) - (latestB.temperature_c || 0)).toFixed(2);
        const salDiff = ((latestA.salinity_psu || 0) - (latestB.salinity_psu || 0)).toFixed(2);
        const turbDiff = ((latestA.turbidity_ntu || 0) - (latestB.turbidity_ntu || 0)).toFixed(2);
        const doDiff = ((latestA.dissolved_oxygen_mgl || 0) - (latestB.dissolved_oxygen_mgl || 0)).toFixed(2);

        const tableContainer = document.getElementById('comparisonMetricsTable');
        if (tableContainer) {
            tableContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; text-align: center;">
                    <div style="background: rgba(4,15,33,0.7); padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Temperature Delta</span>
                        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-top: 2px;">${tempDiff > 0 ? '+' : ''}${tempDiff}°C</div>
                        <span style="font-size: 10.5px; color: var(--cyan-primary);">${stationIdA} vs ${stationIdB}</span>
                    </div>
                    <div style="background: rgba(4,15,33,0.7); padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Salinity Delta</span>
                        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-top: 2px;">${salDiff > 0 ? '+' : ''}${salDiff} PSU</div>
                        <span style="font-size: 10.5px; color: #fbbf24;">Thermohaline Difference</span>
                    </div>
                    <div style="background: rgba(4,15,33,0.7); padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Turbidity Delta</span>
                        <div style="font-size: 16px; font-weight: 700; color: ${Math.abs(turbDiff) > 5 ? '#f87171' : '#fff'}; margin-top: 2px;">${turbDiff > 0 ? '+' : ''}${turbDiff} NTU</div>
                        <span style="font-size: 10.5px; color: var(--text-dim);">Optical Contrast</span>
                    </div>
                    <div style="background: rgba(4,15,33,0.7); padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">DO Vitality Delta</span>
                        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-top: 2px;">${doDiff > 0 ? '+' : ''}${doDiff} mg/L</div>
                        <span style="font-size: 10.5px; color: #34d399;">Aquatic Respiration</span>
                    </div>
                </div>
                <div style="margin-top: 10px; font-size: 11.5px; color: var(--text-dim); text-align: center;">
                    Comparative Biome Analysis: <strong>${resA.baselines.region}</strong> vs <strong>${resB.baselines.region}</strong>
                </div>
            `;
        }
    } catch (e) {
        console.error('Error rendering comparison chart:', e);
    }
};

function renderSalinityChart(labels, data, baseline) {
    const ctx = document.getElementById('chartSalinity');
    if (!ctx) return;
    if (chartSalinityInstance) chartSalinityInstance.destroy();

    const baselineData = Array(labels.length).fill(baseline);

    chartSalinityInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Observed Salinity (PSU)',
                    data: data,
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 2
                },
                {
                    label: `Baseline Salinity (${baseline} PSU)`,
                    data: baselineData,
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                    borderDash: [5, 5],
                    borderWidth: 1.5,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'Practical Salinity Units (PSU)' } }
            }
        }
    });
}

// Multi-Station Comparison Chart Engine
let chartComparisonInstance = null;

window.renderComparisonChart = async function(stationIdA, stationIdB) {
    try {
        const [resA, resB] = await Promise.all([
            fetch(`/api/readings/historical?station_id=${stationIdA}`).then(r => r.json()),
            fetch(`/api/readings/historical?station_id=${stationIdB}`).then(r => r.json())
        ]);

        if (!resA.success || !resB.success) return;

        const ctx = document.getElementById('chartComparison');
        if (!ctx) return;
        if (chartComparisonInstance) chartComparisonInstance.destroy();

        const labelsA = resA.readings.map(r => {
            const d = new Date(r.timestamp);
            return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
        });

        const tempsA = resA.readings.map(r => r.temperature_c);
        const tempsB = resB.readings.map(r => r.temperature_c);

        chartComparisonInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labelsA,
                datasets: [
                    {
                        label: `${stationIdA} – ${resA.baselines.name || stationIdA} (°C)`,
                        data: tempsA,
                        borderColor: '#00f2fe',
                        backgroundColor: 'rgba(0, 242, 254, 0.08)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: 2
                    },
                    {
                        label: `${stationIdB} – ${resB.baselines.name || stationIdB} (°C)`,
                        data: tempsB,
                        borderColor: '#fbbf24',
                        backgroundColor: 'rgba(251, 191, 36, 0.08)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.04)' } },
                    y: { grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'Comparative SST (°C)' } }
                }
            }
        });

        // Compute differentials
        const latestA = resA.readings[resA.readings.length - 1] || {};
        const latestB = resB.readings[resB.readings.length - 1] || {};

        const tempDiff = ((latestA.temperature_c || 0) - (latestB.temperature_c || 0)).toFixed(2);
        const salDiff = ((latestA.salinity_psu || 0) - (latestB.salinity_psu || 0)).toFixed(2);
        const turbDiff = ((latestA.turbidity_ntu || 0) - (latestB.turbidity_ntu || 0)).toFixed(2);
        const doDiff = ((latestA.dissolved_oxygen_mgl || 0) - (latestB.dissolved_oxygen_mgl || 0)).toFixed(2);

        const tableContainer = document.getElementById('comparisonMetricsTable');
        if (tableContainer) {
            tableContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; text-align: center;">
                    <div style="background: rgba(4,15,33,0.7); padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Temperature Delta</span>
                        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-top: 2px;">${tempDiff > 0 ? '+' : ''}${tempDiff}°C</div>
                        <span style="font-size: 10.5px; color: var(--cyan-primary);">${stationIdA} vs ${stationIdB}</span>
                    </div>
                    <div style="background: rgba(4,15,33,0.7); padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Salinity Delta</span>
                        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-top: 2px;">${salDiff > 0 ? '+' : ''}${salDiff} PSU</div>
                        <span style="font-size: 10.5px; color: #fbbf24;">Thermohaline Difference</span>
                    </div>
                    <div style="background: rgba(4,15,33,0.7); padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Turbidity Delta</span>
                        <div style="font-size: 16px; font-weight: 700; color: ${Math.abs(turbDiff) > 5 ? '#f87171' : '#fff'}; margin-top: 2px;">${turbDiff > 0 ? '+' : ''}${turbDiff} NTU</div>
                        <span style="font-size: 10.5px; color: var(--text-dim);">Optical Contrast</span>
                    </div>
                    <div style="background: rgba(4,15,33,0.7); padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">DO Vitality Delta</span>
                        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-top: 2px;">${doDiff > 0 ? '+' : ''}${doDiff} mg/L</div>
                        <span style="font-size: 10.5px; color: #34d399;">Aquatic Respiration</span>
                    </div>
                </div>
                <div style="margin-top: 10px; font-size: 11.5px; color: var(--text-dim); text-align: center;">
                    Comparative Biome Analysis: <strong>${resA.baselines.region}</strong> vs <strong>${resB.baselines.region}</strong>
                </div>
            `;
        }
    } catch (e) {
        console.error('Error rendering comparison chart:', e);
    }
};

function renderTurbidityChart(labels, data, baseline) {
    const ctx = document.getElementById('chartTurbidity');
    if (!ctx) return;
    if (chartTurbidityInstance) chartTurbidityInstance.destroy();

    const baselineData = Array(labels.length).fill(baseline);

    chartTurbidityInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Turbidity (NTU)',
                    data: data,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 2
                },
                {
                    label: `Clean Water Baseline (${baseline} NTU)`,
                    data: baselineData,
                    borderColor: 'rgba(16, 185, 129, 0.5)',
                    borderDash: [5, 5],
                    borderWidth: 1.5,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'Turbidity (NTU)' } }
            }
        }
    });
}

// Multi-Station Comparison Chart Engine
let chartComparisonInstance = null;

window.renderComparisonChart = async function(stationIdA, stationIdB) {
    try {
        const [resA, resB] = await Promise.all([
            fetch(`/api/readings/historical?station_id=${stationIdA}`).then(r => r.json()),
            fetch(`/api/readings/historical?station_id=${stationIdB}`).then(r => r.json())
        ]);

        if (!resA.success || !resB.success) return;

        const ctx = document.getElementById('chartComparison');
        if (!ctx) return;
        if (chartComparisonInstance) chartComparisonInstance.destroy();

        const labelsA = resA.readings.map(r => {
            const d = new Date(r.timestamp);
            return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
        });

        const tempsA = resA.readings.map(r => r.temperature_c);
        const tempsB = resB.readings.map(r => r.temperature_c);

        chartComparisonInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labelsA,
                datasets: [
                    {
                        label: `${stationIdA} – ${resA.baselines.name || stationIdA} (°C)`,
                        data: tempsA,
                        borderColor: '#00f2fe',
                        backgroundColor: 'rgba(0, 242, 254, 0.08)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: 2
                    },
                    {
                        label: `${stationIdB} – ${resB.baselines.name || stationIdB} (°C)`,
                        data: tempsB,
                        borderColor: '#fbbf24',
                        backgroundColor: 'rgba(251, 191, 36, 0.08)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.04)' } },
                    y: { grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'Comparative SST (°C)' } }
                }
            }
        });

        // Compute differentials
        const latestA = resA.readings[resA.readings.length - 1] || {};
        const latestB = resB.readings[resB.readings.length - 1] || {};

        const tempDiff = ((latestA.temperature_c || 0) - (latestB.temperature_c || 0)).toFixed(2);
        const salDiff = ((latestA.salinity_psu || 0) - (latestB.salinity_psu || 0)).toFixed(2);
        const turbDiff = ((latestA.turbidity_ntu || 0) - (latestB.turbidity_ntu || 0)).toFixed(2);
        const doDiff = ((latestA.dissolved_oxygen_mgl || 0) - (latestB.dissolved_oxygen_mgl || 0)).toFixed(2);

        const tableContainer = document.getElementById('comparisonMetricsTable');
        if (tableContainer) {
            tableContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; text-align: center;">
                    <div style="background: rgba(4,15,33,0.7); padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Temperature Delta</span>
                        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-top: 2px;">${tempDiff > 0 ? '+' : ''}${tempDiff}°C</div>
                        <span style="font-size: 10.5px; color: var(--cyan-primary);">${stationIdA} vs ${stationIdB}</span>
                    </div>
                    <div style="background: rgba(4,15,33,0.7); padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Salinity Delta</span>
                        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-top: 2px;">${salDiff > 0 ? '+' : ''}${salDiff} PSU</div>
                        <span style="font-size: 10.5px; color: #fbbf24;">Thermohaline Difference</span>
                    </div>
                    <div style="background: rgba(4,15,33,0.7); padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Turbidity Delta</span>
                        <div style="font-size: 16px; font-weight: 700; color: ${Math.abs(turbDiff) > 5 ? '#f87171' : '#fff'}; margin-top: 2px;">${turbDiff > 0 ? '+' : ''}${turbDiff} NTU</div>
                        <span style="font-size: 10.5px; color: var(--text-dim);">Optical Contrast</span>
                    </div>
                    <div style="background: rgba(4,15,33,0.7); padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">DO Vitality Delta</span>
                        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-top: 2px;">${doDiff > 0 ? '+' : ''}${doDiff} mg/L</div>
                        <span style="font-size: 10.5px; color: #34d399;">Aquatic Respiration</span>
                    </div>
                </div>
                <div style="margin-top: 10px; font-size: 11.5px; color: var(--text-dim); text-align: center;">
                    Comparative Biome Analysis: <strong>${resA.baselines.region}</strong> vs <strong>${resB.baselines.region}</strong>
                </div>
            `;
        }
    } catch (e) {
        console.error('Error rendering comparison chart:', e);
    }
};

function renderOxygenChart(labels, data, baseline) {
    const ctx = document.getElementById('chartOxygen');
    if (!ctx) return;
    if (chartOxygenInstance) chartOxygenInstance.destroy();

    const baselineData = Array(labels.length).fill(baseline);
    const hypoxiaThreshold = Array(labels.length).fill(5.0);

    chartOxygenInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Dissolved Oxygen (mg/L)',
                    data: data,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 2
                },
                {
                    label: `Baseline (${baseline} mg/L)`,
                    data: baselineData,
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                    borderDash: [5, 5],
                    borderWidth: 1.5,
                    pointRadius: 0
                },
                {
                    label: 'Hypoxia Stress Threshold (5.0 mg/L)',
                    data: hypoxiaThreshold,
                    borderColor: 'rgba(239, 68, 68, 0.6)',
                    borderDash: [3, 3],
                    borderWidth: 1.5,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'Dissolved Oxygen (mg/L)' } }
            }
        }
    });
}

// Multi-Station Comparison Chart Engine
let chartComparisonInstance = null;

window.renderComparisonChart = async function(stationIdA, stationIdB) {
    try {
        const [resA, resB] = await Promise.all([
            fetch(`/api/readings/historical?station_id=${stationIdA}`).then(r => r.json()),
            fetch(`/api/readings/historical?station_id=${stationIdB}`).then(r => r.json())
        ]);

        if (!resA.success || !resB.success) return;

        const ctx = document.getElementById('chartComparison');
        if (!ctx) return;
        if (chartComparisonInstance) chartComparisonInstance.destroy();

        const labelsA = resA.readings.map(r => {
            const d = new Date(r.timestamp);
            return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;
        });

        const tempsA = resA.readings.map(r => r.temperature_c);
        const tempsB = resB.readings.map(r => r.temperature_c);

        chartComparisonInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labelsA,
                datasets: [
                    {
                        label: `${stationIdA} – ${resA.baselines.name || stationIdA} (°C)`,
                        data: tempsA,
                        borderColor: '#00f2fe',
                        backgroundColor: 'rgba(0, 242, 254, 0.08)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: 2
                    },
                    {
                        label: `${stationIdB} – ${resB.baselines.name || stationIdB} (°C)`,
                        data: tempsB,
                        borderColor: '#fbbf24',
                        backgroundColor: 'rgba(251, 191, 36, 0.08)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2,
                        pointRadius: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.04)' } },
                    y: { grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'Comparative SST (°C)' } }
                }
            }
        });

        // Compute differentials
        const latestA = resA.readings[resA.readings.length - 1] || {};
        const latestB = resB.readings[resB.readings.length - 1] || {};

        const tempDiff = ((latestA.temperature_c || 0) - (latestB.temperature_c || 0)).toFixed(2);
        const salDiff = ((latestA.salinity_psu || 0) - (latestB.salinity_psu || 0)).toFixed(2);
        const turbDiff = ((latestA.turbidity_ntu || 0) - (latestB.turbidity_ntu || 0)).toFixed(2);
        const doDiff = ((latestA.dissolved_oxygen_mgl || 0) - (latestB.dissolved_oxygen_mgl || 0)).toFixed(2);

        const tableContainer = document.getElementById('comparisonMetricsTable');
        if (tableContainer) {
            tableContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; text-align: center;">
                    <div style="background: rgba(4,15,33,0.7); padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Temperature Delta</span>
                        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-top: 2px;">${tempDiff > 0 ? '+' : ''}${tempDiff}°C</div>
                        <span style="font-size: 10.5px; color: var(--cyan-primary);">${stationIdA} vs ${stationIdB}</span>
                    </div>
                    <div style="background: rgba(4,15,33,0.7); padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Salinity Delta</span>
                        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-top: 2px;">${salDiff > 0 ? '+' : ''}${salDiff} PSU</div>
                        <span style="font-size: 10.5px; color: #fbbf24;">Thermohaline Difference</span>
                    </div>
                    <div style="background: rgba(4,15,33,0.7); padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Turbidity Delta</span>
                        <div style="font-size: 16px; font-weight: 700; color: ${Math.abs(turbDiff) > 5 ? '#f87171' : '#fff'}; margin-top: 2px;">${turbDiff > 0 ? '+' : ''}${turbDiff} NTU</div>
                        <span style="font-size: 10.5px; color: var(--text-dim);">Optical Contrast</span>
                    </div>
                    <div style="background: rgba(4,15,33,0.7); padding: 10px; border-radius: 6px;">
                        <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">DO Vitality Delta</span>
                        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-top: 2px;">${doDiff > 0 ? '+' : ''}${doDiff} mg/L</div>
                        <span style="font-size: 10.5px; color: #34d399;">Aquatic Respiration</span>
                    </div>
                </div>
                <div style="margin-top: 10px; font-size: 11.5px; color: var(--text-dim); text-align: center;">
                    Comparative Biome Analysis: <strong>${resA.baselines.region}</strong> vs <strong>${resB.baselines.region}</strong>
                </div>
            `;
        }
    } catch (e) {
        console.error('Error rendering comparison chart:', e);
    }
};

