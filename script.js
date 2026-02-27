// script.js

/* =========================
   ✅ Supabase 연결
========================= */
const SUPABASE_URL = "https://zsvsbrkphrbxazjordss.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzdnNicmtwaHJieGF6am9yZHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjU4NjYsImV4cCI6MjA4NzM0MTg2Nn0.AVYgmgtUtIjvSbtgr6k7_mkMrXiEatQFVNbbJVK3Zv0";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

/* 5초 툴팁 고정 */
let pinnedIndex = -1;
let pinnedExpireAt = 0;
const PIN_DURATION = 5000;

/* 이미지 버퍼 */
let FLOWERS = new Array(7).fill(null);
let STEMS   = new Array(7).fill(null);
let POTS    = new Array(7).fill(null);

/* 화분 크기 */
let BASE_SIZE = 80;

/* =========================
   ✅ DOM
========================= */
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

/* =========================
   ✅ 커스텀 커서 (DOM)
========================= */
window.addEventListener("mousemove", (e)=>{
  if(!cursorEl) return;
  cursorEl.style.left = e.clientX + "px";
  cursorEl.style.top  = e.clientY + "px";
});

/* =========================
   ✅ 드롭다운
========================= */
dropdownBtn?.addEventListener("click", ()=>{
  const isOpen = panel.classList.toggle("open");
  dropdownBtn.textContent = isOpen ? "▲" : "▼";
});

/* =========================
   ✅ 모달
========================= */
function openModal(){ modal?.classList.add("show"); }
function closeModal(){ modal?.classList.remove("show"); }

modalClose?.addEventListener("click", closeModal);
modal?.addEventListener("click",(e)=>{ if(e.target===modal) closeModal(); });

/* =========================
   ✅ 프리뷰
========================= */
function updatePreview(){
  if(selected.flowerIdx === -1) prevFlower.style.display="none";
  else { prevFlower.style.display="block"; prevFlower.src = FLOWER_PATHS[selected.flowerIdx]; }

  if(selected.stemIdx === -1) prevStem.style.display="none";
  else { prevStem.style.display="block"; prevStem.src = STEM_PATHS[selected.stemIdx]; }

  if(selected.potIdx === -1) prevPot.style.display="none";
  else { prevPot.style.display="block"; prevPot.src = POT_PATHS[selected.potIdx]; }
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

/* =========================
   ✅ 화분 크기 자동 계산
========================= */
function updateBaseSize(){
  const raw = height * 0.07;
  BASE_SIZE = constrain(raw, 60, 120);
}

/* =========================
   ✅ 겹침 판정
========================= */
function isOverlapping(x, y){
  const hitW = BASE_SIZE * 1.6;
  const hitH = BASE_SIZE * 3.0;
  for(const p of pots){
    if(Math.abs(x - p.x) < hitW && Math.abs(y - p.y) < hitH) return true;
  }
  return false;
}

/* =========================
   ✅ Supabase 불러오기
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
   ✅ 전송
========================= */
sendBtn?.addEventListener("click", async ()=>{

  if(selected.flowerIdx === -1 || selected.stemIdx === -1 || selected.potIdx === -1){
    openModal();
    return;
  }

  let x, y, attempts = 0;
  do{
    x = random(160, width - 160) - camX;
    y = random(260, height - 120) - camY;
    attempts++;
  }while(isOverlapping(x, y) && attempts < 250);

  const newPot = {
    x, y,
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

  panel.classList.remove("open");
  dropdownBtn.textContent = "▼";

  nameInput.value = "";
  msgInput.value  = "";

  selected = { flowerIdx:-1, stemIdx:-1, potIdx:-1 };
  document.querySelectorAll(".option.selected").forEach(el=>el.classList.remove("selected"));
  updatePreview();
});

/* =========================
   ✅ p5 preload
========================= */
function preload(){
  const safeLoad = (path, arr, i)=>{
    loadImage(path, img=>arr[i]=img, ()=>arr[i]=null);
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

  pixelDensity(2);
  imageMode(CENTER);

  updateBaseSize();
  loadFromSupabase();
}

function windowResized(){
  const stage = document.querySelector(".stage");
  resizeCanvas(stage.clientWidth, stage.clientHeight);
  updateBaseSize();
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

    if(wx > p.x - BASE_SIZE*0.75 && wx < p.x + BASE_SIZE*0.75 &&
       wy > p.y - BASE_SIZE*2.1  && wy < p.y + BASE_SIZE*0.2){
      hovered = i;
    }
  }

  pop();

  if(!tooltip) return;
  tooltip.style.display = "none";

  const showIndex = (hovered !== -1) ? hovered : pinnedIndex;

  if(showIndex !== -1){
    const p = pots[showIndex];

    // 이름/메시지 둘 다 없으면 툴팁 안 띄움
    if(!p.msg && (!p.name || p.name === "익명")) return;

    const sx = p.x + camX;
    const sy = p.y + camY;

    tooltip.style.display = "block";
    tooltip.style.left = `${sx + BASE_SIZE*0.5}px`;
    tooltip.style.top  = `${sy - BASE_SIZE*2.1}px`;
    tooltip.innerHTML = `
      <div class="msg">${escapeHtml(p.msg || "")}</div>
      <div class="from">from. ${escapeHtml(p.name || "익명")}</div>
    `;
  }
}

/* =========================
   ✅ 화분 그리기
   (간격 조절은 여기 y값들)
========================= */
function drawImageKeepRatio(img, x, y, targetW){
  if(!img || img.width===0 || img.height===0) return;
  const ratio = img.height / img.width;
  image(img, x, y, targetW, targetW * ratio);
}

function drawPot(p){
  push();
  translate(p.x, p.y);

  const BASE = BASE_SIZE;

  // ✅ 간격 조절 포인트 (y값만 수정)
  // pot:  BASE*0.10
  // stem: -BASE*1.00  (더 위로 올리려면 -1.05, -1.10)
  // flower:-BASE*2.00 (더 위로 올리려면 -2.05, -2.10)
  drawImageKeepRatio(POTS[p.potIdx],       0,  BASE*0.048, BASE);
  drawImageKeepRatio(STEMS[p.stemIdx],     0, -BASE*1.00, BASE);
  drawImageKeepRatio(FLOWERS[p.flowerIdx], 0, -BASE*1.90, BASE);

  pop();
}

/* =========================
   ✅ 드래그 (패닝)
========================= */
function mousePressed(){
  const el = document.elementFromPoint(mouseX, mouseY);
  if(el && (el.closest(".panel") || el.closest(".preview-panel") || el.closest(".modal"))) return;
  isPanning = true;
}
function mouseDragged(){
  if(!isPanning) return;
  camX += movedX;
  camY += movedY;
}
function mouseReleased(){
  isPanning = false;
}

/* =========================
   ✅ 안전 문자열
========================= */
function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
    
}
