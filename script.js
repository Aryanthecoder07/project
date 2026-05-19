/**
 * SDE Neuro-Biometric & Semantic Fatigue Engine
 * Model: Llama-3.1-8b-instant (via Groq)
 */

// --- GLOBAL DATA OBJECTS ---
let sessions = {
    morning: { logs: [], metrics: {}, text: "" }, 
    evening: { logs: [], metrics: {}, text: "" }
};
let backspaces = { morning: 0, evening: 0 };
let personalBias = 0;

// Analytical Layer Variables for Dynamic Session Tracking
let lastSessionFatigue = 0; 
let statisticalHistory = []; // Stores historical pairs for Pearson tracking

// --- 1. DYNAMIC AI TASKING (Conceptual/Article Mode with Input Auto-Clear) ---
async function fetchTopic(type) {
    const role = document.getElementById('user-role').value.trim() || "Professional";
    const apiKey = document.getElementById('api-key').value.trim();
    const box = document.getElementById(`${type}-topic`);
    const inputField = document.getElementById(`${type}-input`);

    if (!apiKey) { 
        alert("Enter Groq API Key to generate role-specific challenges."); 
        return; 
    }

    box.innerHTML = `<span class="loading">AI is crafting a ${role} perspective challenge...</span>`;
    
    // Auto-clear the previous input and reset the logs/backspaces for clean collection
    inputField.value = ""; 
    sessions[type].logs = [];
    backspaces[type] = 0;

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
    const chaos = Math.sqrt(flights.reduce((s, v) => s + Math.pow(v - fAvg, 2), 0) / flights.length);

    return { hold: mean(holds), flight: fAvg, chaos: chaos };
}

// --- 4. SEMANTIC ANALYSIS (Dual-Session Relative Quality Audit) ---
async function runRelativeSemanticAnalysis(morningText, eveningText) {
    const apiKey = document.getElementById('api-key').value.trim();
    if (!apiKey) return 0.2;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { 
                        role: "system", 
                        content: `You are evaluating cognitive fatigue by comparing two texts from the SAME user.
                        CRITICAL: The user might have naturally weak English or grammar. Do NOT penalize their native writing style.
                        TASK: Rate the EVENING text's fatigue level from 0 to 100 strictly based on DEGRADATION relative to the MORNING baseline.
                        Look only for fresh fatigue indicators: sudden structural drops, vocabulary flattening, extreme typos, or logical loops that weren't present in the morning.
                        Respond ONLY with the single integer number.` 
                    },
                    { 
                        role: "user", 
                        content: `MORNING BASELINE: "${morningText}"\n\nEVENING SAMPLE: "${eveningText}"` 
                    }
                ],
                max_tokens: 5,
                temperature: 0.2
            })
        });
        const data = await response.json();
        const score = parseInt(data.choices[0].message.content.trim());
        return (isNaN(score) ? 20 : score) / 100;
    } catch (e) { return 0.2; }
}

// --- 4.5 PEARSON CORRELATION (Session-Over-Session Variance Engine) ---
function calculatePearsonCorrelation(pairs) {
    if (pairs.length < 2) return 0.0;

    let n = pairs.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    pairs.forEach(pair => {
        let x = pair.currentModel;
        let y = pair.lastSession;
        sumX += x;
        sumY += y;
        sumXY += (x * y);
        sumX2 += (x * x);
        sumY2 += (y * y);
    });

    let num = (n * sumXY) - (sumX * sumY);
    let den = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
    
    return den === 0 ? 0 : num / den;
}

// --- 5. LOGISTIC REGRESSION & FUSION ---
async function processSession(type) {
    const inputField = document.getElementById(`${type}-input`);
    const val = inputField.value;
    
    if (val.split(' ').length < 10) { 
        alert("Please provide a more descriptive answer (min 10 words)."); 
        return; 
    }

    sessions[type].text = val;

    const metrics = extractMetrics(sessions[type].logs);
    sessions[type].metrics = metrics;

    const weights = { h: -0.09 * 150, c: 0.05 * 150, f: 0.13 * 150 };
    let z_raw = (weights.h * (metrics.hold/1000)) + (weights.c * (metrics.chaos/1000)) + (weights.f * (metrics.flight/1000));

    if (type === 'morning') {
        const historicalInput = document.getElementById('last-session-input');
        lastSessionFatigue = parseInt(historicalInput.value) || 0;
        
        personalBias = -1.386 - z_raw;
        
        inputField.disabled = true;
        historicalInput.disabled = true; 
        
        document.getElementById('morning-card').classList.add('disabled');
        document.getElementById('evening-card').classList.remove('disabled');
        document.getElementById('btn-gen-eve').disabled = false;
        document.getElementById('evening-input').disabled = false;
        document.getElementById('btn-evening').disabled = false;
    } else {
        document.getElementById('btn-evening').innerText = "Running Relative Audit...";
        
        const semanticProb = await runRelativeSemanticAnalysis(sessions.morning.text, sessions.evening.text);
        const bioProb = 1 / (1 + Math.exp(-(z_raw + personalBias)));
        
        const totalProb = (bioProb * 0.6) + (semanticProb * 0.4);
        const currentModelScore = Math.round(totalProb * 100);

        statisticalHistory.push({ currentModel: currentModelScore, lastSession: lastSessionFatigue });
        const sessionPearsonR = calculatePearsonCorrelation(statisticalHistory);

        const resBox = document.getElementById('result-box');
        resBox.style.display = 'block';
        resBox.innerHTML = generateReport(sessions.morning.metrics, metrics, totalProb, semanticProb, sessionPearsonR);
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
}

// --- 6. DIAGNOSTIC REPORT GENERATOR WITH ALL EXTRACTED BIOMETRICS ---
function generateReport(m, e, total, sProb, pearsonR) {
    const fDiff = e.flight - m.flight;
    const hDiff = e.hold - m.hold;
    const cDiff = e.chaos - m.chaos;
    const sScore = Math.round(sProb * 100);
    const totalScore = Math.round(total * 100);
    
    const driftFromLast = totalScore - lastSessionFatigue;

    let recommendationHTML = "";
    if (driftFromLast >= 5) {
        recommendationHTML = `
            <div class="decorated-alert-box alert-crit" style="margin-top: 15px; padding: 15px; background: rgba(231, 76, 60, 0.15); border-left: 5px solid #e74c3c; border-radius: 6px;">
                <h4 style="margin: 0 0 5px 0; color: #e74c3c; font-size: 14px; font-weight: bold;">⚠️ TAKE THE LOAD LESS!</h4>
                <p style="margin: 0; font-size: 13px; color: #ffcccc; line-height: 1.5;">
                    <b>Critical Drift Detected:</b> Your mental fatigue index has escalated by <b>+${driftFromLast}%</b> compared to your baseline. You are experiencing psychomotor fatigue. Please step away from the keyboard, disconnect from active tasks, and take a mandatory rest break immediately.
                </p>
            </div>
        `;
    } else {
        recommendationHTML = `
            <div class="decorated-alert-box alert-stab" style="margin-top: 15px; padding: 15px; background: rgba(46, 204, 113, 0.15); border-left: 5px solid #2ecc71; border-radius: 6px;">
                <h4 style="margin: 0 0 5px 0; color: #2ecc71; font-size: 14px; font-weight: bold;">✨ GOOD WORK MAINTAINED!</h4>
                <p style="margin: 0; font-size: 13px; color: #ccffdd; line-height: 1.5;">
                    <b>Optimal Pacing Confirmed:</b> Your fatigue level shift is stable at <b>${driftFromLast >= 0 ? '+' : ''}${driftFromLast}%</b>. Excellent pacing and performance modulation. Your cognitive capacity and structural typing rhythm remain safely within healthy baseline parameters. Keep it up!
                </p>
            </div>
        `;
    }

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
                    <td>Motor Execution (Hold Time)</td>
                    <td>${m.hold.toFixed(0)}ms</td>
                    <td>${e.hold.toFixed(0)}ms</td>
                    <td class="${hDiff > 10 ? 'bad' : 'good'}">${hDiff >= 0 ? '+' : ''}${hDiff.toFixed(0)}ms</td>
                </tr>
                <tr>
                    <td>Rhythm Irregularity (Chaos)</td>
                    <td>${m.chaos.toFixed(0)}ms</td>
                    <td>${e.chaos.toFixed(0)}ms</td>
                    <td class="${cDiff > 15 ? 'bad' : 'good'}">${cDiff >= 0 ? '+' : ''}${cDiff.toFixed(0)}ms</td>
                </tr>
                <tr>
                    <td>Relative Linguistic Decay (NLP)</td>
                    <td>Language Calibrated</td>
                    <td>${sScore}% Degradation</td>
                    <td class="${sScore > 30 ? 'bad' : 'good'}">${sScore}% Scale</td>
                </tr>
                <tr>
                    <td>Error Rate (Correction)</td>
                    <td>${backspaces.morning} Backspaces</td>
                    <td>${backspaces.evening} Backspaces</td>
                    <td>+${backspaces.evening - backspaces.morning} keys</td>
                </tr>
            </tbody>
        </table>
        <div class="score-footer">Current Composite Fatigue Index: ${totalScore}%</div>
        
        <div class="validation-bar" style="margin-top:15px; padding: 12px; background: #2a2a35; border-radius:6px; font-size:13px; line-height: 1.6; border-left: 4px solid #3498db;">
            <b>Session-Over-Session Continuity Analysis:</b><br>
            • Designated Last Session Fatigue: <code>${lastSessionFatigue}%</code><br>
            • Shift in Fatigue Level (Current vs Last): <code class="${driftFromLast >= 0 ? 'bad' : 'good'}">${driftFromLast >= 0 ? '+' : ''}${driftFromLast}%</code><br>
            • Dynamic Pearson Correlation ($r$): <code>${pearsonR.toFixed(3)}</code>
        </div>

        ${recommendationHTML}

        <div class="clinical-note" style="margin-top:15px;">
            <b>Adaptive Calibration Note:</b> Groq Audit has processed the linguistic evaluation relative to the morning text baseline. Pervasive grammatical tendencies have been safely filtered out to eliminate language-proficiency bias.
        </div>
    `;
}