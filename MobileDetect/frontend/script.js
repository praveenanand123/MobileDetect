let examStarted = false;
let examStartTime = 0;

let model = null;
let canvas, ctx;
let lastMobileDetected = 0;

/* =========================
   GRACE PERIOD
========================= */
function isGracePeriod() {
    return Date.now() - examStartTime < 5000;
}

/* =========================
   START CAMERA
========================= */
async function startCamera() {
    const video = document.getElementById("camera");

    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
    });

    video.srcObject = stream;

    await new Promise(resolve => {
        video.onloadeddata = resolve;
    });

    return video;
}

/* =========================
   CANVAS SETUP
========================= */
function setupCanvas() {
    const container = document.getElementById("camera-container");
    canvas = document.getElementById("overlay");
    ctx = canvas.getContext("2d");

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

/* =========================
   LOAD AI MODEL
========================= */
async function loadMobileModel() {
    model = await cocoSsd.load();
    console.log("Mobile detection model loaded");
}

/* =========================
   MOBILE DETECTION
========================= */
async function detectMobile(video) {
    if (!examStarted || isGracePeriod()) return;
    if (!model) return;

    const predictions = await model.detect(video);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    predictions.forEach(pred => {
        if (pred.class === "cell phone" && pred.score > 0.6) {
            const [x, y, width, height] = pred.bbox;

            ctx.strokeStyle = "red";
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);

            ctx.fillStyle = "red";
            ctx.font = "16px Arial";
            ctx.fillText(
                `Phone ${Math.round(pred.score * 100)}%`,
                x,
                y > 20 ? y - 5 : y + 20
            );

            if (Date.now() - lastMobileDetected > 8000) {
                lastMobileDetected = Date.now();
                sendViolation("MOBILE_PHONE_DETECTED");
                captureScreenshot(video);
            }
        }
    });
}

/* =========================
   DETECTION LOOP
========================= */
function startMobileDetection(video) {
    setInterval(() => detectMobile(video), 1200);
}

/* =========================
   SCREENSHOT
========================= */
function captureScreenshot(video) {
    const snap = document.createElement("canvas");
    snap.width = video.videoWidth;
    snap.height = video.videoHeight;
    const snapCtx = snap.getContext("2d");
    snapCtx.drawImage(video, 0, 0);

    const img = snap.toDataURL("image/png");
    console.log("Screenshot captured", img.substring(0, 30));
}

/* =========================
   VIOLATION HANDLER
========================= */
function sendViolation(type) {
    if (!examStarted || isGracePeriod()) return;

    alert(`Warning: ${type}`);
}

/* =========================
   START EXAM
========================= */
async function startExam() {
    examStarted = true;
    examStartTime = Date.now();

    await document.documentElement.requestFullscreen();

    const video = await startCamera();
    setupCanvas();
    await loadMobileModel();
    startMobileDetection(video);

    document.addEventListener("visibilitychange", () => {
        if (!examStarted || isGracePeriod()) return;
        if (document.hidden) sendViolation("TAB_SWITCH");
    });

    document.addEventListener("fullscreenchange", () => {
        if (!examStarted || isGracePeriod()) return;
        if (!document.fullscreenElement) sendViolation("EXIT_FULLSCREEN");
    });

    document.addEventListener("keydown", e => {
        if (!examStarted || isGracePeriod()) return;
        if (e.ctrlKey || e.altKey || e.key === "Tab") {
            e.preventDefault();
            sendViolation("BLOCKED_KEY");
        }
    });

    ["copy", "paste", "cut"].forEach(event => {
        document.addEventListener(event, e => {
            if (!examStarted || isGracePeriod()) return;
            e.preventDefault();
            sendViolation("COPY_PASTE_BLOCKED");
        });
    });
}







    







