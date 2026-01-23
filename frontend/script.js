let model;
let detecting = false;
let lastMobileTime = 0;

console.log("script.js loaded"); // DEBUG LINE
let warningCount = 0;
const MAX_WARNINGS = 3;


const SESSION_ID = crypto.randomUUID();
const BACKEND_URL = "https://your-backend.onrender.com/log_violation";


function sendViolation(type) {
    warningCount++;

    alert(`⚠ Warning ${warningCount}/${MAX_WARNINGS}: ${type}`);

    fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            session_id: SESSION_ID,
            type: type
        })
    });

    if (warningCount >= MAX_WARNINGS) {
        autoSubmitExam();
    }
}


async function startExam() {
    alert("Exam Started");

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
window.addEventListener("blur", () => {
    sendViolation("WINDOW_BLUR");
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
                sendViolation("MOBILE_DETECTED");
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
    alert("❌ Maximum violations reached. Exam auto-submitted.");

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
window.onblur = () => sendViolation("WINDOW_BLUR");

setInterval(() => {
    if (!document.fullscreenElement) {
        sendViolation("EXIT_FULLSCREEN");
        document.documentElement.requestFullscreen();
    }
}, 3000);





    

