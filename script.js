const upload = document.getElementById("upload");
const origCanvas = document.getElementById("originalCanvas");
const maskCanvas = document.getElementById("maskedCanvas");
const oCtx = origCanvas.getContext("2d");
const mCtx = maskCanvas.getContext("2d");

let imgData = null;
let originalFilename = "";

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

let sliderR = $("#rangeR").data("ionRangeSlider");
let sliderG = $("#rangeG").data("ionRangeSlider");
let sliderB = $("#rangeB").data("ionRangeSlider");

upload.addEventListener("change", (e) => {
  const file = e.target.files[0];
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
  };
  img.src = URL.createObjectURL(file);
});

function updateAndMask() {
  document.getElementById(
    "rangeRVal"
  ).textContent = `${sliderR.result.from} - ${sliderR.result.to}`;
  document.getElementById(
    "rangeGVal"
  ).textContent = `${sliderG.result.from} - ${sliderG.result.to}`;
  document.getElementById(
    "rangeBVal"
  ).textContent = `${sliderB.result.from} - ${sliderB.result.to}`;
  applyMask();
}

function applyMask() {
  if (!imgData) return;
  let lowerR = sliderR.result.from,
    upperR = sliderR.result.to;
  let lowerG = sliderG.result.from,
    upperG = sliderG.result.to;
  let lowerB = sliderB.result.from,
    upperB = sliderB.result.to;

  let src = imgData.data;
  let masked = new Uint8ClampedArray(src.length);

  for (let i = 0; i < src.length; i += 4) {
    let r = src[i],
      g = src[i + 1],
      b = src[i + 2];
    if (
      r >= lowerR &&
      r <= upperR &&
      g >= lowerG &&
      g <= upperG &&
      b >= lowerB &&
      b <= upperB
    ) {
      masked[i] = r;
      masked[i + 1] = g;
      masked[i + 2] = b;
      masked[i + 3] = 255;
    } else {
      masked[i] = 255;
      masked[i + 1] = 255;
      masked[i + 2] = 255;
      masked[i + 3] = 255;
    }
  }

  let maskImg = new ImageData(masked, imgData.width, imgData.height);
  mCtx.putImageData(maskImg, 0, 0);
}

let brushActive = false;

document.getElementById("brushToggle").addEventListener("click", () => {
  brushActive = !brushActive;
  document.getElementById("brushToggle").style.background = brushActive
    ? "#ff6961"
    : "";
});

maskedCanvas.addEventListener("mousedown", handleBrush);
maskedCanvas.addEventListener("mousemove", (e) => {
  if (e.buttons !== 1) return;
  handleBrush(e);
});

function handleBrush(e) {
  if (!brushActive) return;

  const rect = maskCanvas.getBoundingClientRect();
  const scaleX = maskCanvas.width / rect.width;
  const scaleY = maskCanvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  paintAt(x, y);
}

let brushSize = 10;

function paintAt(x, y) {
  mCtx.fillStyle = "rgb(255,255,255)";
  mCtx.fillRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
}

document.getElementById("downloadBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `${originalFilename}_masked.png`;
  link.href = maskCanvas.toDataURL("image/png");
  link.click();
});

const brushSizeInput = document.getElementById("brushSize");
const brushSizeVal = document.getElementById("brushSizeVal");

brushSizeInput.addEventListener("input", () => {
  brushSize = parseInt(brushSizeInput.value, 10);
  brushSizeVal.textContent = brushSize;
});

function saveSettings() {
  const imageName = originalFilename || "unknown_image";
  const r = `${sliderR.result.from} - ${sliderR.result.to}`;
  const g = `${sliderG.result.from} - ${sliderG.result.to}`;
  const b = `${sliderB.result.from} - ${sliderB.result.to}`;

  const container = document.getElementById("savedSettings");
  const entry = document.createElement("div");
  entry.style.marginTop = "10px";
  entry.innerHTML = `<strong>${imageName}</strong><br>
    R: ${r}<br>
    G: ${g}<br>
    B: ${b}`;
  container.appendChild(entry);
}

document.getElementById("downloadBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `${originalFilename}_masked.png`;
  link.href = maskCanvas.toDataURL("image/png");
  link.click();
  saveSettings();
});

function saveSettings() {
  const imageName = originalFilename || "unknown_image";
  const rFrom = sliderR.result.from;
  const rTo = sliderR.result.to;
  const gFrom = sliderG.result.from;
  const gTo = sliderG.result.to;
  const bFrom = sliderB.result.from;
  const bTo = sliderB.result.to;

  const table = document.getElementById("settingsTable").querySelector("tbody");

  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${imageName}</td>
    <td>${rFrom} - ${rTo}</td>
    <td>${gFrom} - ${gTo}</td>
    <td>${bFrom} - ${bTo}</td>
    <td><button onclick="applySavedSettings(${rFrom},${rTo},${gFrom},${gTo},${bFrom},${bTo})">Apply</button></td>
  `;

  table.appendChild(row);
}

function applySavedSettings(rFrom, rTo, gFrom, gTo, bFrom, bTo) {
  sliderR.update({ from: rFrom, to: rTo });
  sliderG.update({ from: gFrom, to: gTo });
  sliderB.update({ from: bFrom, to: bTo });
  updateAndMask();
}
