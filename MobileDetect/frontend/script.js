let canvas, ctx;
let model = null;
let cameraStream = null;
let lastMobileDetected = 0;

console.log("script.js loaded"); // DEBUG LINE
let warningCount = 0;
const MAX_WARNINGS = 3;


const SESSION_ID = crypto.randomUUID();
const BACKEND_URL = "https://your-backend.onrender.com/log_violation";


function sendViolation(type) {
    warningCount++;


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

function setupCanvas(video) {
    canvas = document.getElementById("overlay");
    ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
}



async function startExam() {
    examStarted = true;
    examStartTime = Date.now();

    await document.documentElement.requestFullscreen();

    const video = await startCamera();
    await loadMobileModel();     // mobile model
    startMobileDetection(video); // mobile detection loop

    /* TAB SWITCH */
    document.addEventListener("visibilitychange", () => {
        if (!examStarted || isGracePeriod()) return;
        if (document.hidden) sendViolation("TAB_SWITCH");
    });

    /* FULLSCREEN EXIT */
    document.addEventListener("fullscreenchange", () => {
        if (!examStarted || isGracePeriod()) return;
        if (!document.fullscreenElement) sendViolation("EXIT_FULLSCREEN");
    });

    /* SHORTCUT BLOCKING */
    document.addEventListener("keydown", e => {
        if (!examStarted || isGracePeriod()) return;

        if (e.ctrlKey || e.altKey || e.key === "Tab") {
            e.preventDefault();
            sendViolation("BLOCKED_KEY");
        }
    });


function isGracePeriod() {
    return Date.now() - examStartTime < 5000; // 5 seconds
}



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
    if (!examStarted || isGracePeriod()) return;
    if (!model) return;

    const predictions = await model.detect(video);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    predictions.forEach(pred => {
        if (pred.class === "cell phone" && pred.score > 0.6) {
            const [x, y, width, height] = pred.bbox;

            // Draw bounding box
            ctx.strokeStyle = "red";
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);

            ctx.fillStyle = "red";
            ctx.font = "16px Arial";
            ctx.fillText(
                `Phone (${Math.round(pred.score * 100)}%)`,
                x,
                y > 20 ? y - 5 : y + 20
            );

            // Cooldown protection
            if (Date.now() - lastMobileDetected > 8000) {
                lastMobileDetected = Date.now();
                sendViolation("MOBILE_PHONE_DETECTED");
                captureScreenshot(); // 📸 screenshot on detection
            }
        }
    });
}



function startDetection(video) {
    setInterval(() => {
        detectMobile(video);
    }, 1200); // 1 frame per second
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

function autoSubmitExam() {
    document.exitFullscreen();
    document.body.innerHTML = `
        <h1>🚫 Exam Auto-Submitted</h1>
        <p>You violated exam rules multiple times.</p>
    `;
}






    





