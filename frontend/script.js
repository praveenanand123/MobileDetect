let lastViolationTime = 0;
const VIOLATION_COOLDOWN = 8000; // 8 seconds

let violationCount = 0;

function showWarning(type) {
  const messages = {
    TAB_SWITCH: "Tab switching is not allowed",
    WINDOW_BLUR: "Window lost focus",
    MOBILE_PHONE_DETECTED: "Mobile phone detected"
  };

  violationCount++;
  const box = document.getElementById("warningBox");
  box.innerText = `⚠️ Warning ${violationCount}/3: ${messages[type]}`;
  box.style.display = "block";

  if (violationCount >= 3) {
    alert("Exam auto-submitted due to repeated violations.");
    document.exitFullscreen();
  }
}


const BACKEND_URL = "http://127.0.0.1:8000";
const SESSION_ID = crypto.randomUUID();

let examStarted = false;
let examStartTime = 0;
let model;
let canvas, ctx;
let lastDetect = 0;

/* ---------- UTILS ---------- */

function isGrace() {
  return Date.now() - examStartTime < 5000;
}

/* ---------- CAMERA ---------- */

async function startCamera() {
  const video = document.getElementById("camera");
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  await new Promise(r => video.onloadeddata = r);
  return video;
}

function setupCanvas() {
  const container = document.getElementById("camera-container");
  canvas = document.getElementById("overlay");
  ctx = canvas.getContext("2d");
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}

/* ---------- AI ---------- */

async function loadModel() {
  model = await cocoSsd.load();
  console.log("AI model loaded");
}

async function detectMobile(video) {
  if (!examStarted) return;


  const preds = await model.detect(video);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  preds.forEach(p => {
    if (p.class === "cell phone" && p.score > 0.6) {
      ctx.strokeStyle = "red";
      ctx.lineWidth = 3;
      ctx.strokeRect(...p.bbox);

      if (Date.now() - lastDetect > 8000) {
        lastDetect = Date.now();
        const img = captureScreenshot(video);
        sendViolation("MOBILE_PHONE_DETECTED", img);
      }
    }
  });
}

function startDetection(video) {
  setInterval(() => detectMobile(video), 1200);
}

/* ---------- SCREENSHOT ---------- */

function captureScreenshot(video) {
  const c = document.createElement("canvas");
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  c.getContext("2d").drawImage(video, 0, 0);
  return c.toDataURL("image/png");
}

/* ---------- BACKEND ---------- */

function sendViolation(type, image = null) {
  const now = Date.now();
  if (now - lastViolationTime < VIOLATION_COOLDOWN) return;
  lastViolationTime = now;

  showWarning(type);

  fetch(`${BACKEND_URL}/log_violation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: SESSION_ID,
      type,
      image
    })
  });
}


async function startExam() {
  examStarted = true;
  examStartTime = Date.now();

  await document.documentElement.requestFullscreen();

  const video = await startCamera();
  setupCanvas();
  await loadModel();
  startDetection(video);
  document.addEventListener("visibilitychange", () => {
  if (document.hidden && examStarted) {
    sendViolation("TAB_SWITCH", null);
  }
});

window.addEventListener("blur", () => {
  if (examStarted) {
    sendViolation("WINDOW_BLUR", null);
  }
});

}
