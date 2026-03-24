const SUPABASE_URL = "https://zsvsbrkphrbxazjordss.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzdnNicmtwaHJieGF6am9yZHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjU4NjYsImV4cCI6MjA4NzM0MTg2Nn0.AVYgmgtUtIjvSbtgr6k7_mkMrXiEatQFVNbbJVK3Zv0";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FLOWER_PATHS = [
  "assets/flower01.svg","assets/flower02.svg","assets/flower03.svg",
  "assets/flower04.svg","assets/flower05.svg","assets/flower06.svg","assets/flower07.svg",
];
const STEM_PATHS = [
  "assets/stem01.svg","assets/stem02.svg","assets/stem03.svg",
  "assets/stem04.svg","assets/stem05.svg","assets/stem06.svg","assets/stem07.svg",
];
const POT_PATHS = [
  "assets/pot01.svg","assets/pot02.svg","assets/pot03.svg",
  "assets/pot04.svg","assets/pot05.svg","assets/pot06.svg","assets/pot07.svg",
];

let pots = [];
let selected = { flowerIdx:-1, stemIdx:-1, potIdx:-1 };

let camX = 0;
let camY = 0;
let isPanning = false;
let lastTouchX = 0;
let lastTouchY = 0;

let pinnedIndex = -1;
let pinnedExpireAt = 0;
const PIN_DURATION = 5000;

let FLOWERS = new Array(7).fill(null);
let STEMS   = new Array(7).fill(null);
let POTS    = new Array(7).fill(null);

let BASE_SIZE = 80;

const panel = document.getElementById("panel");
const dropdownBtn = document.getElementById("dropdownBtn");
const sendBtn = document.getElementById("sendBtn");

const tooltip   = document.getElementById("tooltip");
const nameInput = document.getElementById("name");
const msgInput  = document.getElementById("msg");

const prevFlower = document.getElementById("prevFlower");
const prevStem   = document.getElementById("prevStem");
const prevPot    = document.getElementById("prevPot");

const modal = document.getElementById("modal");
const modalClose = document.getElementById("modalClose");

const cursorEl = document.querySelector(".custom-cursor");
const mobileFab = document.getElementById("mobileFab");
const mobileSheetBackdrop = document.getElementById("mobileSheetBackdrop");

function isMobile(){
  return window.matchMedia("(max-width: 768px)").matches;
}

/* =========================
   커서
========================= */
function moveCursorTo(x, y){
  if(!cursorEl) return;
  cursorEl.style.left = `${x}px`;
  cursorEl.style.top = `${y}px`;
}

window.addEventListener("pointermove", (e)=>{
  moveCursorTo(e.clientX, e.clientY);
});

window.addEventListener("pointerdown", (e)=>{
  moveCursorTo(e.clientX, e.clientY);
});

/* =========================
   패널 토글
========================= */
function syncToggleButtons(){
  const isOpen = panel.classList.contains("open");

  if(dropdownBtn){
    dropdownBtn.textContent = isOpen ? "▲" : "▼";
    dropdownBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  if(mobileFab){
    mobileFab.textContent = isOpen ? "▲" : "▼";
    mobileFab.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }
}

function openPanel(){
  panel.classList.add("open");
  if(isMobile()) mobileSheetBackdrop?.classList.add("show");
  syncToggleButtons();
}

function closePanel(){
  panel.classList.remove("open");
  mobileSheetBackdrop?.classList.remove("show");
  syncToggleButtons();
}

function togglePanel(e){
  if(e){
    e.preventDefault();
    e.stopPropagation();
  }

  if(panel.classList.contains("open")) closePanel();
  else openPanel();
}

dropdownBtn?.addEventListener("click", togglePanel);
dropdownBtn?.addEventListener("touchstart", togglePanel, { passive:false });

mobileFab?.addEventListener("click", togglePanel);
mobileFab?.addEventListener("touchstart", togglePanel, { passive:false });

mobileSheetBackdrop?.addEventListener("click", closePanel);
mobileSheetBackdrop?.addEventListener("touchstart", (e)=>{
  e.preventDefault();
  closePanel();
}, { passive:false });

/* =========================
   모달
========================= */
function openModal(){
  modal?.classList.add("show");
}

function closeModal(){
  modal?.classList.remove("show");
}

modalClose?.addEventListener("click", closeModal);
modalClose?.addEventListener("touchstart", (e)=>{
  e.preventDefault();
  closeModal();
}, { passive:false });

modal?.addEventListener("click", (e)=>{
  if(e.target === modal) closeModal();
});

/* =========================
   프리뷰
========================= */
function updatePreview(){
  if(selected.flowerIdx === -1){
    prevFlower.style.display = "none";
  } else {
    prevFlower.style.display = "block";
    prevFlower.src = FLOWER_PATHS[selected.flowerIdx];
  }

  if(selected.stemIdx === -1){
    prevStem.style.display = "none";
  } else {
    prevStem.style.display = "block";
    prevStem.src = STEM_PATHS[selected.stemIdx];
  }

  if(selected.potIdx === -1){
    prevPot.style.display = "none";
  } else {
    prevPot.style.display = "block";
    prevPot.src = POT_PATHS[selected.potIdx];
  }
}
updatePreview();

/* =========================
   옵션 선택
========================= */
document.querySelectorAll(".options").forEach((row)=>{
  row.addEventListener("click", (e)=>{
    e.stopPropagation();

    const btn = e.target.closest(".option");
    if(!btn) return;

    const type = row.dataset.type;
    row.querySelectorAll(".option").forEach(el => el.classList.remove("selected"));
    btn.classList.add("selected");

    selected[type + "Idx"] = parseInt(btn.dataset.value, 10);
    updatePreview();
  });

  row.addEventListener("touchstart", (e)=>{
    e.stopPropagation();
  }, { passive:true });
});

/* =========================
   크기/충돌
========================= */
function updateBaseSize(){
  const raw = height * 0.07;
  BASE_SIZE = constrain(raw, 60, 120);
}

function isOverlapping(x, y){
  const hitW = BASE_SIZE * 1.6;
  const hitH = BASE_SIZE * 3.0;

  for(const p of pots){
    if(Math.abs(x - p.x) < hitW && Math.abs(y - p.y) < hitH){
      return true;
    }
  }
  return false;
}

/* =========================
   Supabase 불러오기
========================= */
async function loadFromSupabase(){
  const { data, error } = await sb
    .from("pots")
    .select("*")
    .order("created_at", { ascending: true });

  if(error){
    console.error(error);
    return;
  }

  pots = (data || []).map(p => ({
    x: p.x,
    y: p.y,
    flowerIdx: p.flower_idx,
    stemIdx: p.stem_idx,
    potIdx: p.pot_idx,
    name: p.name,
    msg: p.msg
  }));
}

/* =========================
   전송
========================= */
async function handleSend(e){
  if(e){
    e.preventDefault();
    e.stopPropagation();
  }

  if(selected.flowerIdx === -1 || selected.stemIdx === -1 || selected.potIdx === -1){
    openModal();
    return;
  }

  let x, y, attempts = 0;

  do{
    x = random(160, width - 160) - camX;
    y = random(260, height - 120) - camY;
    attempts++;
  } while(isOverlapping(x, y) && attempts < 250);

  const newPot = {
    x,
    y,
    flowerIdx: selected.flowerIdx,
    stemIdx: selected.stemIdx,
    potIdx: selected.potIdx,
    name: nameInput.value.trim() || "익명",
    msg: msgInput.value.trim() || ""
  };

  pots.push(newPot);

  const { error } = await sb.from("pots").insert([{
    x: newPot.x,
    y: newPot.y,
    flower_idx: newPot.flowerIdx,
    stem_idx: newPot.stemIdx,
    pot_idx: newPot.potIdx,
    name: newPot.name,
    msg: newPot.msg
  }]);

  if(error) console.error(error);

  pinnedIndex = pots.length - 1;
  pinnedExpireAt = millis() + PIN_DURATION;

  closePanel();

  nameInput.value = "";
  msgInput.value = "";

  selected = { flowerIdx:-1, stemIdx:-1, potIdx:-1 };
  document.querySelectorAll(".option.selected").forEach(el => el.classList.remove("selected"));
  updatePreview();
}

sendBtn?.addEventListener("click", handleSend);
sendBtn?.addEventListener("touchstart", handleSend, { passive:false });

/* =========================
   p5 preload/setup
========================= */
function preload(){
  const safeLoad = (path, arr, i)=>{
    loadImage(path, img => arr[i] = img, () => arr[i] = null);
  };

  for(let i=0;i<7;i++){
    safeLoad(FLOWER_PATHS[i], FLOWERS, i);
    safeLoad(STEM_PATHS[i], STEMS, i);
    safeLoad(POT_PATHS[i], POTS, i);
  }
}

function setup(){
  const stage = document.querySelector(".stage");
  const c = createCanvas(stage.clientWidth, stage.clientHeight);
  c.parent("canvas");

  pixelDensity(2);
  imageMode(CENTER);

  updateBaseSize();
  loadFromSupabase();
  syncToggleButtons();
  closePanel();
}

function windowResized(){
  const stage = document.querySelector(".stage");
  resizeCanvas(stage.clientWidth, stage.clientHeight);
  updateBaseSize();

  if(!isMobile()){
    mobileSheetBackdrop?.classList.remove("show");
  }

  syncToggleButtons();
}

/* =========================
   draw
========================= */
function draw(){
  background("#e5e3e3");

  if(pinnedIndex !== -1 && millis() > pinnedExpireAt){
    pinnedIndex = -1;
  }

  push();
  translate(camX, camY);

  let hovered = -1;
  const wx = mouseX - camX;
  const wy = mouseY - camY;

  for(let i=0;i<pots.length;i++){
    const p = pots[i];
    drawPot(p);

    if(
      wx > p.x - BASE_SIZE * 0.75 && wx < p.x + BASE_SIZE * 0.75 &&
      wy > p.y - BASE_SIZE * 2.1  && wy < p.y + BASE_SIZE * 0.2
    ){
      hovered = i;
    }
  }

  pop();

  if(!tooltip) return;
  tooltip.style.display = "none";

  const showIndex = (hovered !== -1) ? hovered : pinnedIndex;

  if(showIndex !== -1){
    const p = pots[showIndex];

    if(!p.msg && (!p.name || p.name === "익명")) return;

    const sx = p.x + camX;
    const sy = p.y + camY;

    tooltip.style.display = "block";
    tooltip.style.left = `${sx + BASE_SIZE * 0.5}px`;
    tooltip.style.top  = `${sy - BASE_SIZE * 2.1}px`;
    tooltip.innerHTML = `
      <div class="msg">${escapeHtml(p.msg || "")}</div>
      <div class="from">from. ${escapeHtml(p.name || "익명")}</div>
    `;
  }
}

/* =========================
   화분 그리기
========================= */
function drawImageKeepRatio(img, x, y, targetW){
  if(!img || img.width === 0 || img.height === 0) return;
  const ratio = img.height / img.width;
  image(img, x, y, targetW, targetW * ratio);
}

function drawPot(p){
  push();
  translate(p.x, p.y);

  const BASE = BASE_SIZE;

  drawImageKeepRatio(POTS[p.potIdx],       0,  BASE * 0.048, BASE);
  drawImageKeepRatio(STEMS[p.stemIdx],     0, -BASE * 1.00,  BASE);
  drawImageKeepRatio(FLOWERS[p.flowerIdx], 0, -BASE * 1.90,  BASE);

  pop();
}

/* =========================
   UI 터치/클릭 판별
========================= */
function isUIElementAtClient(clientX, clientY){
  const el = document.elementFromPoint(clientX, clientY);

  return !!(el && (
    el.closest(".panel") ||
    el.closest(".preview-panel") ||
    el.closest(".modal") ||
    el.closest(".mobile-fab") ||
    el.closest("input") ||
    el.closest("textarea") ||
    el.closest("button") ||
    el.closest(".option")
  ));
}

/* =========================
   데스크탑 마우스
========================= */
function mousePressed(event){
  const clientX = event?.clientX ?? 0;
  const clientY = event?.clientY ?? 0;

  if(isUIElementAtClient(clientX, clientY)){
    isPanning = false;
    return;
  }

  isPanning = true;
  return false;
}

function mouseDragged(){
  if(!isPanning) return;
  camX += movedX;
  camY += movedY;
  return false;
}

function mouseReleased(){
  isPanning = false;
}

/* =========================
   모바일 터치
========================= */
function touchStarted(event){
  const touch = event?.touches?.[0] || event?.changedTouches?.[0];

  if(!touch){
    isPanning = false;
    return;
  }

  const clientX = touch.clientX;
  const clientY = touch.clientY;

  if(isUIElementAtClient(clientX, clientY)){
    isPanning = false;
    return;
  }

  isPanning = true;
  lastTouchX = clientX;
  lastTouchY = clientY;

  return false;
}

function touchMoved(event){
  if(!isPanning) return;

  const touch = event?.touches?.[0] || event?.changedTouches?.[0];
  if(!touch) return;

  const clientX = touch.clientX;
  const clientY = touch.clientY;

  camX += clientX - lastTouchX;
  camY += clientY - lastTouchY;

  lastTouchX = clientX;
  lastTouchY = clientY;

  return false;
}

function touchEnded(){
  isPanning = false;
}

/* =========================
   문자열 이스케이프
========================= */
function escapeHtml(str){
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
