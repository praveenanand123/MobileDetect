const BACKEND_URL = "https://YOUR-BACKEND.onrender.com";
console.log("Backend URL:", BACKEND_URL);
const SESSION_ID = crypto.randomUUID();
let model;
let detecting = false;
let lastMobileTime = 0;

console.log("script.js loaded"); // DEBUG LINE
let warningCount = 0;
const MAX_WARNINGS = 3;


const SESSION_ID = crypto.randomUUID();
const BACKEND_URL = "https://your-backend.onrender.com/log_violation";


function sendViolation(type, imageData = null) {
    console.log("FORCE sending violation:", type);

    fetch(`${BACKEND_URL}/log_violation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            session_id: SESSION_ID,
            type: type,
            image: imageData
        })
    })
    .then(res => res.json())
    .then(data => console.log("Violation logged:", data))
    .catch(err => console.error("Violation error:", err));
}

    if (warningCount >= MAX_WARNINGS) {
        autoSubmitExam();
    }
}
let WarningCount = 0;
let lastWarningTime = {};

function showWarning(type) {
    const now = Date.now();

    // cooldown per violation (5 seconds)
    if (lastWarningTime[type] && now - lastWarningTime[type] < 5000) {
        return;
    }

    lastWarningTime[type] = now;
    warningCount++;

    const box = document.getElementById("warning-box");
    box.textContent = `⚠️ Warning ${warningCount}/3: ${type}`;
    box.classList.remove("hidden");

    setTimeout(() => {
        box.classList.add("hidden");
    }, 3000);

    if (warningCount >= 3) {
        autoSubmitExam();
    }
}


async function startExam() {


    document.documentElement.requestFullscreen();

    const video = await startCamera();
    await loadModel();
    startDetectionLoop(video);

    // Tab switch detection
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            sendViolation("TAB_SWITCH");
        }
    });

    // Fullscreen exit
    document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement) {
            sendViolation("EXIT_FULLSCREEN");
        }
    });

    
    // Shortcut blocking
    document.addEventListener("keydown", e => {
        if (e.ctrlKey || e.altKey || e.key === "Tab") {
            e.preventDefault();
            sendViolation("BLOCKED_KEY");
        }
    });
}
["copy", "paste", "cut"].forEach(event => {
    document.addEventListener(event, e => {
        e.preventDefault();
        sendViolation("COPY_PASTE_BLOCKED");
    });
});


document.addEventListener("contextmenu", e => {
    e.preventDefault();
    sendViolation("RIGHT_CLICK_BLOCKED");
});

let lastWidth = window.innerWidth;
let lastHeight = window.innerHeight;

window.addEventListener("resize", () => {
    if (
        Math.abs(window.innerWidth - lastWidth) > 100 ||
        Math.abs(window.innerHeight - lastHeight) > 100
    ) {
        sendViolation("SCREEN_RESIZE");
    }

    lastWidth = window.innerWidth;
    lastHeight = window.innerHeight;
});

setInterval(() => {
    const start = performance.now();
    debugger;
    const end = performance.now();

    if (end - start > 100) {
        sendViolation("DEVTOOLS_OPENED");
    }
}, 3000);



async function startCamera() {
    const video = document.getElementById("camera");
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    return new Promise(resolve => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function loadModel() {
    model = await cocoSsd.load();
    console.log("📱 Mobile detection model loaded");
}

async function detectMobile(video) {
    if (!model || detecting) return;

    detecting = true;

    const predictions = await model.detect(video);

    predictions.forEach(pred => {
        if (pred.class === "cell phone" && pred.score > 0.6) {
            const now = Date.now();

            // cooldown: 5 seconds
            if (now - lastMobileTime > 5000) {
                lastMobileTime = now;
                console.log("📵 Mobile detected");
                const image = captureScreenshot(video);
                sendViolation("MOBILE_PHONE_DETECTED", image);

            }
        }
    });

    detecting = false;
}

function startDetectionLoop(video) {
    setInterval(() => {
        detectMobile(video);
    }, 1000); // 1 frame per second
}


function autoSubmitExam() {


    fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            session_id: SESSION_ID,
            type: "AUTO_SUBMIT"
        })
    });

    document.body.innerHTML = `
        <h1 style="color:red;">Exam Submitted</h1>
        <p>You exceeded the allowed number of violations.</p>
    `;
}

async function startCamera() {
    const video = document.getElementById("camera");
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
}


setInterval(() => {
    if (!document.fullscreenElement) {
        sendViolation("EXIT_FULLSCREEN");
        document.documentElement.requestFullscreen();
    }
}, 3000);

function captureScreenshot(video) {
    const snap = document.createElement("canvas");
    snap.width = video.videoWidth;
    snap.height = video.videoHeight;

    const ctx = snap.getContext("2d");
    ctx.drawImage(video, 0, 0);

    return snap.toDataURL("image/png");
}


function autoSubmitExam() {
    document.exitFullscreen();
    document.body.innerHTML = `
        <h1>🚫 Exam Auto-Submitted</h1>
        <p>You violated exam rules multiple times.</p>
    `;
}




    

