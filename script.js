// --- globals & contexts ---------------
const upload = document.getElementById("upload");
const origCanvas = document.getElementById("originalCanvas");
const maskCanvas = document.getElementById("maskedCanvas");
const oCtx = origCanvas.getContext("2d");
const mCtx = maskCanvas.getContext("2d");
const colorSpace = document.getElementById("colorSpace");
const rgbGroup = document.getElementById("rgbSliders");
const hsvGroup = document.getElementById("hsvSliders");

let imgData = null;
let originalFilename = "";
let currentObjectUrl = null;
let brushSize = 10;
let brushActive = false;

// --- initialize Ion.RangeSliders ----------------
$("#rangeR").ionRangeSlider({
  type: "double",
  min: 0,
  max: 255,
  from: 70,
  to: 195,
  grid: false,
  onChange: updateAndMask,
});
$("#rangeG").ionRangeSlider({
  type: "double",
  min: 0,
  max: 255,
  from: 110,
  to: 255,
  grid: false,
  onChange: updateAndMask,
});
$("#rangeB").ionRangeSlider({
  type: "double",
  min: 0,
  max: 255,
  from: 8,
  to: 100,
  grid: false,
  onChange: updateAndMask,
});
$("#rangeH").ionRangeSlider({
  type: "double",
  min: 0,
  max: 360,
  from: 0,
  to: 360,
  grid: false,
  onChange: updateAndMask,
});
$("#rangeS").ionRangeSlider({
  type: "double",
  min: 0,
  max: 100,
  from: 0,
  to: 100,
  grid: false,
  onChange: updateAndMask,
});
$("#rangeV").ionRangeSlider({
  type: "double",
  min: 0,
  max: 100,
  from: 0,
  to: 100,
  grid: false,
  onChange: updateAndMask,
});

const sliderR = $("#rangeR").data("ionRangeSlider");
const sliderG = $("#rangeG").data("ionRangeSlider");
const sliderB = $("#rangeB").data("ionRangeSlider");
const sliderH = $("#rangeH").data("ionRangeSlider");
const sliderS = $("#rangeS").data("ionRangeSlider");
const sliderV = $("#rangeV").data("ionRangeSlider");

// --- handle color space toggle --------------
colorSpace.addEventListener("change", () => {
  if (colorSpace.value === "RGB") {
    rgbGroup.style.display = "";
    hsvGroup.style.display = "none";
  } else {
    rgbGroup.style.display = "none";
    hsvGroup.style.display = "";
  }
  updateAndMask();
});

// --- upload & revoke old URL -----------------
upload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  // revoke old
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(file);
  originalFilename = file.name.replace(/\.[^/.]+$/, "");
  const img = new Image();
  img.onload = () => {
    origCanvas.width = img.width;
    origCanvas.height = img.height;
    maskCanvas.width = img.width;
    maskCanvas.height = img.height;
    oCtx.drawImage(img, 0, 0);
    imgData = oCtx.getImageData(0, 0, img.width, img.height);
    updateAndMask();
    img.src = ""; // drop ref
  };
  img.src = currentObjectUrl;
});

// --- brush toggle & size --------------------
document.getElementById("brushToggle").addEventListener("click", () => {
  brushActive = !brushActive;
  document.getElementById("brushToggle").style.background = brushActive
    ? "#ff6961"
    : "";
});

const brushSizeInput = document.getElementById("brushSize");
const brushSizeVal = document.getElementById("brushSizeVal");
brushSizeInput.addEventListener("input", () => {
  brushSize = +brushSizeInput.value;
  brushSizeVal.textContent = brushSize;
});

// --- brush handlers -------------------------
maskCanvas.addEventListener("mousedown", handleBrush);
maskCanvas.addEventListener("mousemove", (e) => {
  if (e.buttons !== 1) return;
  handleBrush(e);
});
function handleBrush(e) {
  if (!brushActive || !imgData) return;
  const rect = maskCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (maskCanvas.width / rect.width);
  const y = (e.clientY - rect.top) * (maskCanvas.height / rect.height);
  mCtx.fillStyle = "rgb(255,255,255)";
  mCtx.fillRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
}

// --- main mask logic ------------------------
function updateAndMask() {
  document.getElementById(
    "rangeRVal"
  ).textContent = `${sliderR.result.from} – ${sliderR.result.to}`;
  document.getElementById(
    "rangeGVal"
  ).textContent = `${sliderG.result.from} – ${sliderG.result.to}`;
  document.getElementById(
    "rangeBVal"
  ).textContent = `${sliderB.result.from} – ${sliderB.result.to}`;
  document.getElementById(
    "rangeHVal"
  ).textContent = `${sliderH.result.from} – ${sliderH.result.to}`;
  document.getElementById(
    "rangeSVal"
  ).textContent = `${sliderS.result.from} – ${sliderS.result.to}`;
  document.getElementById(
    "rangeVVal"
  ).textContent = `${sliderV.result.from} – ${sliderV.result.to}`;
  applyMask();
}

function applyMask() {
  if (!imgData) return;
  const data = imgData.data,
    w = imgData.width,
    h = imgData.height;
  let out = new Uint8ClampedArray(data.length);
  const cs = colorSpace.value;
  const [r0, r1] = [sliderR.result.from, sliderR.result.to];
  const [g0, g1] = [sliderG.result.from, sliderG.result.to];
  const [b0, b1] = [sliderB.result.from, sliderB.result.to];
  const [h0, h1] = [sliderH.result.from, sliderH.result.to];
  const [s0, s1] = [sliderS.result.from / 100, sliderS.result.to / 100];
  const [v0, v1] = [sliderV.result.from / 100, sliderV.result.to / 100];

  for (let i = 0; i < data.length; i += 4) {
    const R = data[i],
      G = data[i + 1],
      B = data[i + 2];
    let pass = false;
    if (cs === "RGB") {
      pass = R >= r0 && R <= r1 && G >= g0 && G <= g1 && B >= b0 && B <= b1;
    } else {
      const r = R / 255,
        g = G / 255,
        b = B / 255;
      const mx = Math.max(r, g, b),
        mn = Math.min(r, g, b),
        d = mx - mn;
      let hh = 0;
      if (d > 0) {
        if (mx === r) hh = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (mx === g) hh = ((b - r) / d + 2) / 6;
        else hh = ((r - g) / d + 4) / 6;
      }
      const ss = mx === 0 ? 0 : d / mx,
        vv = mx;
      const Hue = hh * 360,
        Sat = ss,
        Val = vv;
      pass =
        Hue >= h0 &&
        Hue <= h1 &&
        Sat >= s0 &&
        Sat <= s1 &&
        Val >= v0 &&
        Val <= v1;
    }
    if (pass) {
      out[i] = R;
      out[i + 1] = G;
      out[i + 2] = B;
      out[i + 3] = 255;
    } else {
      out[i] = out[i + 1] = out[i + 2] = 255;
      out[i + 3] = 255;
    }
  }
  mCtx.putImageData(new ImageData(out, w, h), 0, 0);
}

// --- download + clear memory ---------------
document.getElementById("downloadBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `${originalFilename}_masked.png`;
  link.href = maskCanvas.toDataURL("image/png");
  link.click();
  saveSettings();
  clearImageMemory();
});

function clearImageMemory() {
  oCtx.clearRect(0, 0, origCanvas.width, origCanvas.height);
  mCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = null;
  imgData = null;
  originalFilename = "";
  upload.value = "";
  sliderR.update({ from: 70, to: 195 });
  sliderG.update({ from: 110, to: 255 });
  sliderB.update({ from: 8, to: 100 });
  updateAndMask();
}

// --- save & apply settings table ----------
function saveSettings() {
  const img = originalFilename || "unknown",
    cs = colorSpace.value;
  if (cs === "RGB") {
    const [r0, r1] = [sliderR.result.from, sliderR.result.to],
      [g0, g1] = [sliderG.result.from, sliderG.result.to],
      [b0, b1] = [sliderB.result.from, sliderB.result.to];
    const tbody = document
      .getElementById("settingsTableRGB")
      .querySelector("tbody");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${img}</td>
      <td>${r0}–${r1}</td>
      <td>${g0}–${g1}</td>
      <td>${b0}–${b1}</td>
      <td><button onclick="applySavedRGB(${r0},${r1},${g0},${g1},${b0},${b1})">Apply</button></td>
    `;
    tbody.appendChild(tr);
  } else {
    const [h0, h1] = [sliderH.result.from, sliderH.result.to],
      [s0, s1] = [sliderS.result.from, sliderS.result.to],
      [v0, v1] = [sliderV.result.from, sliderV.result.to];
    const tbody = document
      .getElementById("settingsTableHSV")
      .querySelector("tbody");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${img}</td>
      <td>${h0}–${h1}</td>
      <td>${s0}–${s1}</td>
      <td>${v0}–${v1}</td>
      <td><button onclick="applySavedHSV(${h0},${h1},${s0},${s1},${v0},${v1})">Apply</button></td>
    `;
    tbody.appendChild(tr);
  }
}

function applySavedRGB(r0, r1, g0, g1, b0, b1) {
  colorSpace.value = "RGB";
  rgbGroup.style.display = "";
  hsvGroup.style.display = "none";
  sliderR.update({ from: r0, to: r1 });
  sliderG.update({ from: g0, to: g1 });
  sliderB.update({ from: b0, to: b1 });
  updateAndMask();
}

function applySavedHSV(h0, h1, s0, s1, v0, v1) {
  colorSpace.value = "HSV";
  rgbGroup.style.display = "none";
  hsvGroup.style.display = "";
  sliderH.update({ from: h0, to: h1 });
  sliderS.update({ from: s0, to: s1 });
  sliderV.update({ from: v0, to: v1 });
  updateAndMask();
}
