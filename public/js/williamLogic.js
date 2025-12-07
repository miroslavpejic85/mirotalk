/**
 * williamLogic.js - Member 3 Work
 * UPDATED: Secure version (Reads key from config.js)
 */

// --- CONFIGURATION ---
// We check if the config file loaded the key. If not, we warn the user.
const GEMINI_API_KEY = (typeof APP_CONFIG !== 'undefined') ? APP_CONFIG.GEMINI_KEY : '';

// Safety Check: Alert the developer if the key is missing
if (!GEMINI_API_KEY) {
    console.error("CRITICAL ERROR: William AI cannot find an API Key.");
    console.error("Please ensure public/js/config.js exists and contains APP_CONFIG.");
}

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// --- 1. EARS (Speech Recognition) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.lang = 'en-US';

function startWilliamListener() {
    if (!GEMINI_API_KEY) {
        speak("I cannot start because my API key is missing.");
        return;
    }
    console.log("William AI: Ears are open.");
    recognition.start();
}

// Auto-restart if it stops unexpectedly (Common in web browsers)
recognition.onend = () => { 
    console.log("William AI: Restarting listener...");
    recognition.start(); 
};

// --- 2. LOGIC LOOP ---
recognition.onresult = async (event) => {
    const lastIndex = event.results.length - 1;
    const transcript = event.results[lastIndex][0].transcript.toLowerCase().trim();

    console.log("William Heard:", transcript);

    // A. Conflict Detection (Immediate Local Response)
    // If these words are heard, William intervenes immediately.
    if (transcript.includes("stupid") || transcript.includes("shut up")) {
        speak("Let's keep the meeting respectful.");
        return;
    }

    // B. AI Trigger (Only sends to Google if name is called)
    if (transcript.includes("william")) {
        speak("Thinking...");
        const response = await askGemini(transcript);
        speak(response);
    }
};

// --- 3. BRAIN (Gemini API) ---
async function askGemini(text) {
    // Safety check
    if (!GEMINI_API_KEY) return "I don't have an API key configured.";

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ 
                    parts: [{ text: "You are a helpful meeting assistant named William. Answer briefly: " + text }] 
                }] 
            })
        });
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (e) { 
        console.error(e);
        return "I can't connect to the internet."; 
    }
}

// --- 4. VOICE (Text to Speech) ---
function speak(text) {
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(u);
}