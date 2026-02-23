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

let pinnedIndex = -1;
let pinnedExpireAt = 0;
const PIN_DURATION = 5000;

let FLOWERS = new Array(7).fill(null);
let STEMS   = new Array(7).fill(null);
let POTS    = new Array(7).fill(null);

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

/* =========================
   ✅ 안전 체크 (JS가 여기서 터지면 "아무것도 안 눌림" 됨)
========================= */
function assertDOM(){
  const ok =
    panel && dropdownBtn && sendBtn &&
    tooltip && nameInput && msgInput &&
    prevFlower && prevStem && prevPot &&
    modal && modalClose;

  if(!ok){
    console.error("❌ DOM id가 하나 이상 없거나 script가 너무 일찍 실행됨. HTML id 확인해줘.");
  }
  return ok;
}

/* =========================
   ✅ 드롭다운 + 모달
========================= */
if(assertDOM()){
  dropdownBtn.addEventListener("click", ()=>{
    const isOpen = panel.classList.toggle("open");
    dropdownBtn.textContent = isOpen ? "▲" : "▼";
  });

  function openModal(){ modal.classList.add("show"); }
  function closeModal(){ modal.classList.remove("show"); }

  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click",(e)=>{ if(e.target===modal) closeModal(); });

  // 옵션 선택
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

  // 전송
  sendBtn.addEventListener("click", onSend);

  // 초기 프리뷰
  updatePreview();
}

/* =========================
   ✅ 프리뷰
========================= */
function updatePreview(){
  if(!prevFlower || !prevStem || !prevPot) return;

  if(selected.flowerIdx === -1){ prevFlower.style.display="none"; prevFlower.removeAttribute("src"); }
  else { prevFlower.style.display="block"; prevFlower.src = FLOWER_PATHS[selected.flowerIdx]; }

  if(selected.stemIdx === -1){ prevStem.style.display="none"; prevStem.removeAttribute("src"); }
  else { prevStem.style.display="block"; prevStem.src = STEM_PATHS[selected.stemIdx]; }

  if(selected.potIdx === -1){ prevPot.style.display="none"; prevPot.removeAttribute("src"); }
  else { prevPot.style.display="block"; prevPot.src = POT_PATHS[selected.potIdx]; }
}

/* =========================
   ✅ 겹침 판정 (박스)
========================= */
const HIT_W = 130;  // 좌우
const HIT_H = 240;  // 상하

function isOverlapping(x, y){
  for(const p of pots){
    if(Math.abs(x - p.x) < HIT_W && Math.abs(y - p.y) < HIT_H) return true;
  }
  return false;
}

/* =========================
   ✅ 전송
========================= */
async function onSend(){
  if(selected.flowerIdx === -1 || selected.stemIdx === -1 || selected.potIdx === -1){
    modal.classList.add("show");
    return;
  }

  let x, y, attempts = 0;
  do{
    x = random(160, width - 160) - camX;
    y = random(260, height - 120) - camY;
    attempts++;
  } while(isOverlapping(x, y) && attempts < 400);

  const newPot = {
    x, y,
    flowerIdx: selected.flowerIdx,
    stemIdx: selected.stemIdx,
    potIdx: selected.potIdx,
    name: nameInput.value.trim() || "익명",
    msg: msgInput.value.trim() || ""
  };

  // 화면 즉시 반영
  pots.push(newPot);

  // 5초 툴팁 고정
  pinnedIndex = pots.length - 1;
  pinnedExpireAt = millis() + PIN_DURATION;

  // 서버 저장
  const { error } = await sb.from("pots").insert([{
    x: newPot.x,
    y: newPot.y,
    flower_idx: newPot.flowerIdx,
    stem_idx: newPot.stemIdx,
    pot_idx: newPot.potIdx,
    name: newPot.name,
    msg: newPot.msg
  }]);

  if(error) console.error("insert error:", error);

  // 입력칸 비우기
  nameInput.value = "";
  msgInput.value = "";

  // 드롭다운 닫기
  panel.classList.remove("open");
  dropdownBtn.textContent = "▼";

  // 선택 리셋
  selected = { flowerIdx:-1, stemIdx:-1, potIdx:-1 };
  document.querySelectorAll(".option.selected").forEach(el=>el.classList.remove("selected"));
  updatePreview();
}

/* =========================
   ✅ p5 preload
========================= */
function preload(){
  const safeLoad = (path, arr, i)=>{
    loadImage(path, img=>arr[i]=img, err=>{
      console.error("이미지 로드 실패:", path, err);
      arr[i]=null;
    });
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
  const wrap = document.getElementById("canvas");

  const w = stage ? stage.clientWidth : window.innerWidth;
  const h = stage ? stage.clientHeight : window.innerHeight;

  const c = createCanvas(w, h);

  // 여기서 wrap이 null이면 _curElement.elt 에러 남
  if(wrap) c.parent(wrap);
  else console.error("❌ #canvas div가 HTML에 없음. id='canvas' 확인!");

  imageMode(CENTER);
  cursor("grab");

  loadFromSupabase();
}

function windowResized(){
  const stage = document.querySelector(".stage");
  const w = stage ? stage.clientWidth : window.innerWidth;
  const h = stage ? stage.clientHeight : window.innerHeight;
  resizeCanvas(w, h);
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

  if(!tooltip) return;
  tooltip.style.display = "none";

  const showIndex = (hovered !== -1) ? hovered : pinnedIndex;
  if(showIndex !== -1){
    const p = pots[showIndex];

    // 이름/메시지 둘다 의미없으면 툴팁 안띄움
    const hasMsg = !!(p.msg && p.msg.trim());
    const hasName = !!(p.name && p.name.trim() && p.name !== "익명");
    if(!hasMsg && !hasName) return;

    const sx = p.x + camX;
    const sy = p.y + camY;

    tooltip.style.display = "block";
    tooltip.style.left = `${sx + 50}px`;
    tooltip.style.top  = `${sy - 170}px`;
    tooltip.innerHTML = `
      <div class="msg">${escapeHtml(p.msg || "")}</div>
      <div class="from">from. ${escapeHtml(p.name || "익명")}</div>
    `;
  }
}

/* =========================
   ✅ 비율 유지
========================= */
function drawImageKeepRatio(img, x, y, targetW){
  if(!img || img.width===0 || img.height===0) return;
  const ratio = img.height / img.width;
  image(img, x, y, targetW, targetW * ratio);
}

function drawPot(p){
  push();
  translate(p.x, p.y);

  const BASE = 70;
  // ✅ 이미지가 null일 수 있으니 체크 후만 그리기
  if(POTS[p.potIdx]) drawImageKeepRatio(POTS[p.potIdx], 0, 0, BASE);
  if(STEMS[p.stemIdx]) drawImageKeepRatio(STEMS[p.stemIdx], 0, -70, BASE);
  if(FLOWERS[p.flowerIdx]) drawImageKeepRatio(FLOWERS[p.flowerIdx], 0, -140, BASE);

  pop();
}

/* =========================
   ✅ 드래그
========================= */
function mousePressed(){
  const el = document.elementFromPoint(mouseX, mouseY);
  if(el && (el.closest(".panel") || el.closest(".preview-panel") || el.closest(".modal"))) return;

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

/* =========================
   ✅ Supabase 로드
========================= */
async function loadFromSupabase(){
  const { data, error } = await sb.from("pots").select("*");

  if(error){
    console.error("load error:", error);
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
