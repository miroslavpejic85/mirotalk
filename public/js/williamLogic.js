/**
 * williamLogic.js - Member 3 Work
 */

// --- CONFIGURATION ---
const GEMINI_API_KEY = "PASTE_YOUR_KEY_HERE"; 
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// --- 1. EARS ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.lang = 'en-US';

function startWilliamListener() {
    console.log("William AI: Ears are open.");
    recognition.start();
}

recognition.onend = () => { recognition.start(); }; // Auto-restart

// --- 2. LOGIC LOOP ---
recognition.onresult = async (event) => {
    const lastIndex = event.results.length - 1;
    const transcript = event.results[lastIndex][0].transcript.toLowerCase().trim();

    console.log("William Heard:", transcript);

    // Conflict Detection
    if (transcript.includes("stupid") || transcript.includes("shut up")) {
        speak("Let's keep the meeting respectful.");
        return;
    }

    // AI Trigger
    if (transcript.includes("william")) {
        speak("Thinking...");
        const response = await askGemini(transcript);
        speak(response);
    }
};

// --- 3. BRAIN ---
async function askGemini(text) {
    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Answer briefly: " + text }] }] })
        });
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (e) { return "I can't connect to the internet."; }
}

// --- 4. VOICE ---
function speak(text) {
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(u);
}