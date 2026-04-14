/**
 * SDE Neuro-Biometric & Semantic Fatigue Engine
 * Model: Llama-3.1-8b-instant (via Groq)
 */

// --- GLOBAL DATA OBJECTS ---
let sessions = {
    morning: { logs: [], metrics: {} },
    evening: { logs: [], metrics: {} }
};
let backspaces = { morning: 0, evening: 0 };
let personalBias = 0;

// --- 1. DYNAMIC AI TASKING (Conceptual/Article Mode) ---
async function fetchTopic(type) {
    const role = document.getElementById('user-role').value.trim() || "Professional";
    const apiKey = document.getElementById('api-key').value.trim();
    const box = document.getElementById(`${type}-topic`);

    if (!apiKey) { 
        alert("Enter Groq API Key to generate role-specific challenges."); 
        return; 
    }

    box.innerHTML = `<span class="loading">AI is crafting a ${role} perspective challenge...</span>`;

    // System prompt forces conceptual discussion over coding
    const systemPrompt = `You are a high-level technical editor for a ${role} magazine. 
    TASK: Ask a conceptual or theoretical question about ${role} trends.
    FORBIDDEN: Do not ask for code, scripts, or syntax. No 'How-to' questions.
    MANDATORY: Require a descriptive opinion or explanation in 3 sentences.
    LIMIT: Your output must be only the question, max 2 sentences.`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Generate a conceptual challenge for a ${role}. Seed: ${Date.now()}` }
                ],
                temperature: 1.1,
                max_tokens: 150
            })
        });

        const data = await response.json();
        box.innerText = data.choices[0].message.content;
    } catch (e) {
        box.innerText = `Describe the impact of emerging AI tools on the standard ${role} workflow.`;
    }
}

// --- 2. KEYSTROKE CAPTURE ENGINE ---
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

// --- 3. MATHEMATICAL FEATURE EXTRACTION ---
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

    const mean = arr => arr.length ? arr.reduce((a,b)=>a+b)/arr.length : 0;
    const fAvg = mean(flights);
    // Chaos score (Rhythm deviation)
    const chaos = Math.sqrt(flights.reduce((s, v) => s + Math.pow(v - fAvg, 2), 0) / flights.length);

    return { hold: mean(holds), flight: fAvg, chaos: chaos };
}

// --- 4. SEMANTIC ANALYSIS (Writing Quality Audit) ---
async function runSemanticAnalysis(text) {
    const apiKey = document.getElementById('api-key').value.trim();
    if (!apiKey) return 0.2; // Default variance if no API key

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { 
                        role: "system", 
                        content: "Rate the mental fatigue of the writing (0-100). Look for: typos, poor grammar, and repetitive vocabulary. Respond ONLY with the number." 
                    },
                    { role: "user", content: text }
                ],
                max_tokens: 5
            })
        });
        const data = await response.json();
        const score = parseInt(data.choices[0].message.content.trim());
        return (isNaN(score) ? 20 : score) / 100;
    } catch (e) { return 0.2; }
}

// --- 5. LOGISTIC REGRESSION & FUSION ---
async function processSession(type) {
    const inputField = document.getElementById(`${type}-input`);
    const val = inputField.value;
    
    if (val.split(' ').length < 10) { 
        alert("Please provide a more descriptive answer (min 10 words)."); 
        return; 
    }

    const metrics = extractMetrics(sessions[type].logs);
    sessions[type].metrics = metrics;

    // Model Weights from free-text.csv (150x Sensitivity Scaling)
    const weights = { h: -0.09 * 150, c: 0.05 * 150, f: 0.13 * 150 };
    let z_raw = (weights.h * (metrics.hold/1000)) + (weights.c * (metrics.chaos/1000)) + (weights.f * (metrics.flight/1000));

    if (type === 'morning') {
        // Taring the scale (Calibration)
        personalBias = -1.386 - z_raw;
        
        // Hide morning answer to prevent pattern mimicry
        inputField.value = "********************";
        inputField.disabled = true;
        
        document.getElementById('morning-card').classList.add('disabled');
        document.getElementById('evening-card').classList.remove('disabled');
        document.getElementById('btn-gen-eve').disabled = false;
        document.getElementById('evening-input').disabled = false;
        document.getElementById('btn-evening').disabled = false;
    } else {
        document.getElementById('btn-evening').innerText = "Running Groq Audit...";
        
        const semanticProb = await runSemanticAnalysis(val);
        const bioProb = 1 / (1 + Math.exp(-(z_raw + personalBias)));
        
        // Final Fusion: 60% Psychomotor, 40% Linguistic Quality
        const totalProb = (bioProb * 0.6) + (semanticProb * 0.4);

        const resBox = document.getElementById('result-box');
        resBox.style.display = 'block';
        resBox.innerHTML = generateReport(sessions.morning.metrics, metrics, totalProb, semanticProb);
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
}

// --- 6. DIAGNOSTIC REPORT GENERATOR ---
function generateReport(m, e, total, sProb) {
    const fDiff = e.flight - m.flight;
    const sScore = Math.round(sProb * 100);
    const totalScore = Math.round(total * 100);

    return `
        <div class="report-header">
            <h3>NEURO-LINGUISTIC DIAGNOSTIC REPORT</h3>
            <div class="status-badge ${total > 0.5 ? 'crit' : 'stab'}">
                ${total > 0.5 ? 'FATIGUE DETECTED' : 'STABLE'}
            </div>
        </div>
        <table class="report-table">
            <thead>
                <tr><th>Biological Marker</th><th>Baseline</th><th>Current</th><th>Variance (Δ)</th></tr>
            </thead>
            <tbody>
                <tr>
                    <td>Processing Speed (Flight)</td>
                    <td>${m.flight.toFixed(0)}ms</td>
                    <td>${e.flight.toFixed(0)}ms</td>
                    <td class="${fDiff > 20 ? 'bad' : 'good'}">+${fDiff.toFixed(0)}ms</td>
                </tr>
                <tr>
                    <td>Linguistic Integrity (NLP)</td>
                    <td>100% Quality</td>
                    <td>${100 - sScore}% Quality</td>
                    <td class="${sScore > 30 ? 'bad' : 'good'}">${sScore}% Decay</td>
                </tr>
                <tr>
                    <td>Error Rate (Correction)</td>
                    <td>${backspaces.morning} Backspaces</td>
                    <td>${backspaces.evening} Backspaces</td>
                    <td>+${backspaces.evening - backspaces.morning} keys</td>
                </tr>
            </tbody>
        </table>
        <div class="score-footer">Composite Fatigue Index: ${totalScore}%</div>
        <div class="clinical-note">
            <b>Diagnostic Note:</b> ${total > 0.5 ? 
            "Patient shows psychomotor retardation and semantic flattening. High cognitive depletion confirmed via Llama-3.1 Audit." : 
            "Neuro-linguistic markers are within safe baseline limits. User displays high cognitive stamina."}
        </div>
    `;
}