let pots = [];
let selected = { flowerIdx:-1, stemIdx:-1, potIdx:-1 };

let camX = 0;
let camY = 0;
let isPanning = false;
let lastTouchX = 0;
let lastTouchY = 0;

/* =========================
   Supabase
========================= */
const SUPABASE_URL = "https://zsvsbrkphrbxazjordss.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_KEY";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   SVG
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
   DOM
========================= */
const panel = document.getElementById("panel");
const dropdownBtn = document.getElementById("dropdownBtn");
const sendBtn = document.getElementById("sendBtn");
const tooltip = document.getElementById("tooltip");
const nameInput = document.getElementById("name");
const msgInput = document.getElementById("msg");

/* =========================
   드롭다운
========================= */
dropdownBtn?.addEventListener("click", ()=>{
  const isOpen = panel.classList.toggle("open");
  dropdownBtn.textContent = isOpen ? "▼" : "▲";
});

/* =========================
   옵션 선택
========================= */
document.querySelectorAll(".options").forEach((row)=>{
  row.addEventListener("click",(e)=>{
    const btn = e.target.closest(".option");
    if(!btn) return;

    const type = row.dataset.type;

    row.querySelectorAll(".option").forEach(el=>el.classList.remove("selected"));
    btn.classList.add("selected");

    selected[type + "Idx"] = parseInt(btn.dataset.value, 10);
  });
});

/* =========================
   크기
========================= */
let BASE_SIZE = 80;

function updateBaseSize(){
  BASE_SIZE = constrain(height * 0.07, 60, 120);
}

/* =========================
   충돌
========================= */
function isOverlapping(x, y){
  for(const p of pots){
    if(Math.abs(x - p.x) < BASE_SIZE && Math.abs(y - p.y) < BASE_SIZE*2){
      return true;
    }
  }
  return false;
}

/* =========================
   전송
========================= */
sendBtn?.addEventListener("click", async ()=>{
  if(selected.flowerIdx === -1 || selected.stemIdx === -1 || selected.potIdx === -1){
    return;
  }

  let x, y;
  do{
    x = random(width);
    y = random(height);
  }while(isOverlapping(x,y));

  const newPot = {
    x,y,
    ...selected,
    name: nameInput.value || "익명",
    msg: msgInput.value || ""
  };

  pots.push(newPot);
});

/* =========================
   p5
========================= */
function preload(){
  FLOWERS = FLOWER_PATHS.map(p=>loadImage(p));
  STEMS   = STEM_PATHS.map(p=>loadImage(p));
  POTS    = POT_PATHS.map(p=>loadImage(p));
}

function setup(){
  const stage = document.querySelector(".stage");
  const c = createCanvas(stage.clientWidth, stage.clientHeight);
  c.parent("canvas");

  imageMode(CENTER);
  updateBaseSize();
}

function draw(){
  background("#e5e3e3");

  push();
  translate(camX, camY);

  for(let p of pots){
    drawPot(p);
  }

  pop();
}

/* =========================
   화분
========================= */
function drawPot(p){
  push();
  translate(p.x, p.y);

  drawImageKeepRatio(POTS[p.potIdx],0,BASE_SIZE*0.05,BASE_SIZE);
  drawImageKeepRatio(STEMS[p.stemIdx],0,-BASE_SIZE,BASE_SIZE);
  drawImageKeepRatio(FLOWERS[p.flowerIdx],0,-BASE_SIZE*2,BASE_SIZE);

  pop();
}

function drawImageKeepRatio(img,x,y,w){
  if(!img) return;
  const r = img.height / img.width;
  image(img,x,y,w,w*r);
}

/* =========================
   드래그
========================= */
function mousePressed(){
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
   터치
========================= */
function touchStarted(e){
  const t = e.touches[0];
  lastTouchX = t.clientX;
  lastTouchY = t.clientY;
  isPanning = true;
}

function touchMoved(e){
  if(!isPanning) return;

  const t = e.touches[0];
  camX += t.clientX - lastTouchX;
  camY += t.clientY - lastTouchY;

  lastTouchX = t.clientX;
  lastTouchY = t.clientY;
}

function touchEnded(){
  isPanning = false;
}
