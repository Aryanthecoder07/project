// --- DATA STORAGE ---
let sessions = {
    morning: { logs: [], metrics: {} },
    evening: { logs: [], metrics: {} }
};
let backspaces = { morning: 0, evening: 0 };
let personalBias = 0;

// --- 1. DYNAMIC AI TASKING (Pollinations Enter - Randomized) ---
async function fetchTopic(type) {
    const userRole = document.getElementById('user-role').value || "Professional";
    const box = document.getElementById(`${type}-topic`);
    box.innerHTML = `<span class="loading">AI is generating a unique ${userRole} challenge...</span>`;
    
    // Adding a random seed and a 'Unique' instruction to prevent repetition
    const randomSeed = Math.floor(Math.random() * 1000000);
    const instruction = `Generate a UNIQUE 2-sentence technical or logical challenge for a ${userRole}. 
                        Do not mention technical debt unless the role is a Manager. 
                        Make it specific to ${userRole} skills.`;
    
    try {
        const url = `https://enter.pollinations.ai/prompt/${encodeURIComponent(instruction)}?model=openai&seed=${randomSeed}&cache=false`;
        const response = await fetch(url);
        const text = await response.text();
        box.innerText = text;
    } catch (e) {
        box.innerText = `As a ${userRole}, explain the most complex logic you implemented recently and how you optimized it.`;
    }
}

// --- 2. KEYSTROKE CAPTURE SYSTEM ---
function initCapture(inputId, type) {
    const el = document.getElementById(inputId);
    el.addEventListener('keydown', (e) => {
        if (e.key === "Backspace") backspaces[type]++;
        sessions[type].logs.push({k: e.key, t: Date.now(), a: 'd'});
    });
    el.addEventListener('keyup', (e) => sessions[type].logs.push({k: e.key, t: Date.now(), a: 'u'}));
}
initCapture('morning-input', 'morning');
initCapture('evening-input', 'evening');

// --- 3. THE ANALYTICS ENGINE ---
function extractMetrics(logs) {
    let holds = [], flights = [], keyMap = {};
    logs.forEach((log, i) => {
        if (log.a === 'd') keyMap[log.k] = log.t;
        else if (log.a === 'u' && keyMap[log.k]) {
            holds.push(log.t - keyMap[log.k]);
            delete keyMap[log.k];
        }
        if (i > 0 && log.a === 'd' && logs[i-1].a === 'u') {
            let gap = log.t - logs[i-1].t;
            if (gap < 2000) flights.push(gap);
        }
    });
    const avg = arr => arr.length ? arr.reduce((a,b)=>a+b)/arr.length : 0;
    const fAvg = avg(flights);
    const chaos = Math.sqrt(flights.reduce((s, v) => s + Math.pow(v - fAvg, 2), 0) / flights.length);
    return { hold: avg(holds), flight: fAvg, chaos: chaos };
}

// --- 4. THE AI INFERENCE ENGINE ---
function runAIModel(metrics, isMorning) {
    const weights = { h: -0.09237 * 80, c: 0.04968 * 80, f: 0.12773 * 80 };
    let z_raw = (weights.h * (metrics.hold/1000)) + (weights.c * (metrics.chaos/1000)) + (weights.f * (metrics.flight/1000));

    if (isMorning) {
        personalBias = -1.386 - z_raw; 
        return 0.20;
    }
    return 1 / (1 + Math.exp(-(z_raw + personalBias)));
}

// --- 5. THE CLINICAL REPORT GENERATOR ---
function generateReport(m, e, prob) {
    const fDiff = e.flight - m.flight;
    const cDiff = e.chaos - m.chaos;
    const bDiff = backspaces.evening - backspaces.morning;
    const score = Math.round(prob * 100);

    return `
        <div class="report-header">
            <h3>NEURO-COGNITIVE DIAGNOSTIC REPORT</h3>
            <div class="status-badge ${prob > 0.5 ? 'crit' : 'stab'}">${prob > 0.5 ? 'FATIGUE DETECTED' : 'STABLE'}</div>
        </div>
        <table class="report-table">
            <tr><th>Metric</th><th>Baseline (Morning)</th><th>Actual (Evening)</th><th>Variance (Δ)</th></tr>
            <tr><td>Processing Latency</td><td>${m.flight.toFixed(0)}ms</td><td>${e.flight.toFixed(0)}ms</td><td class="${fDiff > 20 ? 'bad' : 'good'}">+${fDiff.toFixed(0)}ms</td></tr>
            <tr><td>Rhythmic Variance</td><td>${m.chaos.toFixed(0)}ms</td><td>${e.chaos.toFixed(0)}ms</td><td class="${cDiff > 10 ? 'bad' : 'good'}">+${cDiff.toFixed(0)}ms</td></tr>
            <tr><td>Error Rate (Bks)</td><td>${backspaces.morning}</td><td>${backspaces.evening}</td><td>+${bDiff} keys</td></tr>
        </table>
        <div class="score-footer">Overall Fatigue Index: ${score}%</div>
        <div class="clinical-note">
            <b>SDE Diagnostic Note:</b> ${prob > 0.5 ? 
            "User displays psychomotor retardation. Increased inter-key latency and rhythm variance suggest executive function depletion." : 
            "Behavioral biometrics remain within the stable morning baseline. Cognitive stamina is currently high."}
        </div>
    `;
}

// --- 6. UI CONTROLLER ---
function processSession(type) {
    const inputField = document.getElementById(`${type}-input`);
    const inputVal = inputField.value;
    
    if (inputVal.split(' ').length < 10) { 
        alert("Please provide a detailed answer (min 10 words)."); 
        return; 
    }

    const metrics = extractMetrics(sessions[type].logs);
    sessions[type].metrics = metrics;
    const probability = runAIModel(metrics, type === 'morning');

    if (type === 'morning') {
        inputField.value = "********************"; // Mask Morning Session
        inputField.disabled = true;
        document.getElementById('morning-card').classList.add('disabled');
        document.getElementById('btn-morning').innerText = "✅ Baseline Set";
        
        document.getElementById('evening-card').classList.remove('disabled');
        document.getElementById('btn-gen-eve').disabled = false;
        document.getElementById('evening-input').disabled = false;
        document.getElementById('btn-evening').disabled = false;
    } else {
        const resBox = document.getElementById('result-box');
        resBox.style.display = 'block';
        resBox.innerHTML = generateReport(sessions.morning.metrics, metrics, probability);
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
}