/* =========================
   ✅ Supabase 연결
========================= */
const SUPABASE_URL = "https://zsvsbrkphrbxazjordss.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzdnNicmtwaHJieGF6am9yZHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjU4NjYsImV4cCI6MjA4NzM0MTg2Nn0.AVYgmgtUtIjvSbtgr6k7_mkMrXiEatQFVNbbJVK3Zv0";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   ✅ 로컬 저장
========================= */
const LS_KEY = "flower_guestbook_pots_v1";

function lsLoad(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){
    return fallback;
  }
}

function lsSave(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

/* =========================
   ✅ SVG 경로
========================= */
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

/* =========================
   ✅ 상태
========================= */
let pots = [];
let selected = { flowerIdx:-1, stemIdx:-1, potIdx:-1 };

let camX = 0, camY = 0;
let isPanning = false;

/* 🔥 5초 메시지용 */
let pinnedIndex = -1;
let pinnedExpireAt = 0;
const PIN_DURATION = 5000;

/* 이미지 버퍼 */
let FLOWERS = new Array(7).fill(null);
let STEMS   = new Array(7).fill(null);
let POTS    = new Array(7).fill(null);

/* =========================
   ✅ DOM
========================= */
const panel = document.getElementById("panel");
const panelBody = document.getElementById("panelBody");
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

/* =========================
   ✅ 드롭다운
========================= */
dropdownBtn.addEventListener("click", ()=>{
  const isOpen = panel.classList.toggle("open");
  dropdownBtn.textContent = isOpen ? "▲" : "▼";
});

/* =========================
   ✅ 모달
========================= */
function openModal(){ modal.classList.add("show"); }
function closeModal(){ modal.classList.remove("show"); }

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click",(e)=>{ if(e.target===modal) closeModal(); });

/* =========================
   ✅ 프리뷰
========================= */
function updatePreview(){
  if(selected.flowerIdx === -1){ prevFlower.style.display="none"; }
  else {
    prevFlower.style.display="block";
    prevFlower.src = FLOWER_PATHS[selected.flowerIdx];
  }

  if(selected.stemIdx === -1){ prevStem.style.display="none"; }
  else {
    prevStem.style.display="block";
    prevStem.src = STEM_PATHS[selected.stemIdx];
  }

  if(selected.potIdx === -1){ prevPot.style.display="none"; }
  else {
    prevPot.style.display="block";
    prevPot.src = POT_PATHS[selected.potIdx];
  }
}
updatePreview();

/* =========================
   ✅ 옵션 선택
========================= */
document.querySelectorAll(".options").forEach((row)=>{
  row.addEventListener("click",(e)=>{
    const btn = e.target.closest(".option");
    if(!btn) return;

    const type = row.dataset.type;

    row.querySelectorAll(".option").forEach(el=>el.classList.remove("selected"));
    btn.classList.add("selected");

    selected[type + "Idx"] = parseInt(btn.dataset.value, 10);
    updatePreview();
  });
});

function isOverlapping(x, y) {
  for (const p of pots) {

    const overlapX = Math.abs(x - p.x) < 130;  // 좌우 폭
    const overlapY = Math.abs(y - p.y) < 240;  // 위아래 높이

    if (overlapX && overlapY) {
      return true;
    }
  }
  return false;
}
/* =========================
   ✅ 전송
========================= */
sendBtn.addEventListener("click", async ()=>{

  if(selected.flowerIdx === -1 ||
     selected.stemIdx   === -1 ||
     selected.potIdx    === -1){
    openModal();
    return;
  }

 let x, y;
let attempts = 0;

do {
  x = random(160, width - 160) - camX;
  y = random(260, height - 120) - camY;
  attempts++;
} while (isOverlapping(x, y) && attempts < 200);

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

  // Supabase 저장
  await sb.from("pots").insert([{
    x: newPot.x,
    y: newPot.y,
    flower_idx: newPot.flowerIdx,
    stem_idx: newPot.stemIdx,
    pot_idx: newPot.potIdx,
    name: newPot.name,
    msg: newPot.msg
  }]);

  // 🔥 5초 메시지 표시
  pinnedIndex = pots.length - 1;
  pinnedExpireAt = millis() + PIN_DURATION;

  panel.classList.remove("open");
  dropdownBtn.textContent = "▼";

  selected = { flowerIdx:-1, stemIdx:-1, potIdx:-1 };
  document.querySelectorAll(".option.selected").forEach(el=>el.classList.remove("selected"));
  updatePreview();
});

/* =========================
   ✅ p5 preload
========================= */
function preload(){
  const safeLoad = (path, arr, i)=>{
    loadImage(path,
      img=>arr[i]=img,
      ()=>arr[i]=null
    );
  };

  for(let i=0;i<7;i++){
    safeLoad(FLOWER_PATHS[i], FLOWERS, i);
    safeLoad(STEM_PATHS[i], STEMS, i);
    safeLoad(POT_PATHS[i], POTS, i);
  }
}

/* =========================
   ✅ p5 setup
========================= */
function setup(){
  const stage = document.querySelector(".stage");
  const c = createCanvas(stage.clientWidth, stage.clientHeight);
  c.parent("canvas");
  imageMode(CENTER);
  cursor("grab");
  
  loadFromSupabase();
}

/* =========================
   ✅ draw
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

    if(wx > p.x - 60 && wx < p.x + 60 &&
       wy > p.y - 220 && wy < p.y + 10){
      hovered = i;
    }
  }

  pop();

  tooltip.style.display = "none";

  const showIndex = (hovered !== -1) ? hovered : pinnedIndex;

  if(showIndex !== -1){
    const p = pots[showIndex];
  
    // 🔥 이름과 메세지 둘 다 없으면 툴팁 안 띄움
    if(!p.msg && (!p.name || p.name === "익명")) {
      return;
    }
    const sx = p.x + camX;
    const sy = p.y + camY;

    tooltip.style.display = "block";
    tooltip.style.left = `${sx + 50}px`;
    tooltip.style.top  = `${sy - 170}px`;
    tooltip.innerHTML = `
      <div class="msg">${p.msg || "(메세지 없음)"}</div>
     <div class="from">from. ${p.name || "익명"}</div>
    `;
  }
}

/* =========================
   ✅ 비율 유지
========================= */
function drawImageKeepRatio(img, x, y, targetW){
  if(!img || img.width===0 || img.height===0) return;
  const ratio = img.height / img.width;
  const targetH = targetW * ratio;
  image(img, x, y, targetW, targetH);
}

function drawPot(p){
  push();
  translate(p.x, p.y);

  const BASE = 80;

  drawImageKeepRatio(POTS[p.potIdx], 0, 0, BASE);
  drawImageKeepRatio(STEMS[p.stemIdx], 0, -70, BASE);
  drawImageKeepRatio(FLOWERS[p.flowerIdx], 0, -140, BASE);

  pop();
}

/* =========================
   ✅ 드래그
========================= */
function mousePressed(){
  const el = document.elementFromPoint(mouseX, mouseY);

  if(el && (
     el.closest(".panel") ||
     el.closest(".preview-panel") ||
     el.closest(".modal")
  )){
    return;
  }

  isPanning = true;
  cursor("grabbing");
}

function mouseDragged(){
  if(!isPanning) return;
  camX += movedX;
  camY += movedY;
}

function mouseReleased(){
  isPanning = false;
  cursor("grab");
}

async function loadFromSupabase(){
  const { data, error } = await sb.from("pots").select("*");

  if(error){
    console.error(error);
    return;
  }

  pots = data.map(p => ({
    x: p.x,
    y: p.y,
    flowerIdx: p.flower_idx,
    stemIdx: p.stem_idx,
    potIdx: p.pot_idx,
    name: p.name,
    msg: p.msg
  }));
}
