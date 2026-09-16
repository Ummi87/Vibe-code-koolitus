// Vanakooli Tetris. p5.js sketch; juhtimine: nooled, tühik, P, R.
const W = 10, H = 20;
const FORMS = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]]
};
const INK = {
  I:'#48dce8', O:'#f2d36b', T:'#b792e5', S:'#79d99a',
  Z:'#eb8192', J:'#79a5ee', L:'#eea975'
};
let grid, piece, next, bag, points, rows, level, mode, timer, lastTick;
let tile, bx, by, panelX, controls = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  textFont('monospace');
  newGame();
}

function newGame() {
  grid = Array.from({length:H}, () => Array(W).fill(null));
  bag = []; points = 0; rows = 0; level = 1; timer = 0; mode = 'play';
  next = takePiece(); spawn(); lastTick = millis();
}

function takePiece() {
  if (!bag.length) {
    bag = Object.keys(FORMS);
    for (let i=bag.length-1; i>0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [bag[i],bag[j]] = [bag[j],bag[i]];
    }
  }
  return bag.pop();
}

function spawn() {
  const kind = next; next = takePiece();
  const shape = FORMS[kind].map(r => [...r]);
  piece = {kind, shape, x:Math.floor((W-shape.length)/2), y:-1};
  if (!fits(shape,piece.x,piece.y)) mode = 'over';
}

function fits(testShape, px, py) {
  let rowIndex = 0;
  while (rowIndex < testShape.length) {
    let columnIndex = 0;
    while (columnIndex < testShape[rowIndex].length) {
      if (testShape[rowIndex][columnIndex]) {
        const gridX = px + columnIndex;
        const gridY = py + rowIndex;
        if (gridX < 0 || gridX >= W || gridY >= H) return false;
        if (gridY >= 0 && grid[gridY][gridX]) return false;
      }
      columnIndex++;
    }
    rowIndex++;
  }
  return true;
}

function shift(dx,dy) {
  if (mode!=='play' || !fits(piece.shape,piece.x+dx,piece.y+dy)) return false;
  piece.x+=dx; piece.y+=dy; return true;
}

function turn() {
  if (mode!=='play' || piece.kind==='O') return;
  const n=piece.shape.length;
  const shape=Array.from({length:n},(_,y)=>
    Array.from({length:n},(_,x)=>piece.shape[n-1-x][y]));
  for (const dx of [0,-1,1,-2,2]) {
    if (fits(shape,piece.x+dx,piece.y)) {
      piece.shape=shape; piece.x+=dx; return;
    }
  }
}

function land() {
  for (let y=0; y<piece.shape.length; y++) {
    for (let x=0; x<piece.shape[y].length; x++) {
      if (!piece.shape[y][x]) continue;
      const gy=piece.y+y;
      if (gy<0) { mode='over'; return; }
      grid[gy][piece.x+x]=piece.kind;
    }
  }
  let cleared=0;
  for (let y=H-1; y>=0; y--) {
    if (grid[y].every(Boolean)) {
      grid.splice(y,1); grid.unshift(Array(W).fill(null));
      cleared++; y++;
    }
  }
  if (cleared) {
    points += [0,100,300,500,800][cleared]*level;
    rows += cleared; level = Math.floor(rows/10)+1;
  }
  spawn(); timer=0;
}

function command(action) {
  if (action==='restart') { newGame(); return; }
  if (action==='pause') {
    if (mode==='play') mode='pause';
    else if (mode==='pause') { mode='play'; lastTick=millis(); }
    return;
  }
  if (mode!=='play') return;
  if (action==='left') shift(-1,0);
  if (action==='right') shift(1,0);
  if (action==='turn') turn();
  if (action==='down') {
    if (shift(0,1)) points++; else land();
    timer=0;
  }
  if (action==='drop') {
    let droppedRows=0;
    while (shift(0,1)) droppedRows++;
    points += droppedRows*2; land();
  }
}

function draw() {
  const now=millis(), dt=Math.min(now-lastTick,100); lastTick=now;
  if (mode==='play') {
    timer+=dt;
    if (timer>=Math.max(90,800*Math.pow(0.82,level-1))) {
      timer=0; if (!shift(0,1)) land();
    }
  }
  arrange();
  background('#101721');
  stroke('#1b2a35'); strokeWeight(1);
  for (let x=0; x<width; x+=30) line(x,0,x,height);
  for (let y=0; y<height; y+=30) line(0,y,width,y);
  noStroke(); fill('#f1ead5'); textAlign(CENTER); textStyle(BOLD);
  textSize(width<650?24:32); text('TETRIS',bx+W*tile/2,by-19);
  textStyle(NORMAL);
  boardView(); infoView(); buttonView();
  if (mode!=='play') overlayView();
}

function arrange() {
  const small=width<650;
  tile=Math.max(10,Math.floor(Math.min(
    (height-(small?260:110))/H,
    (width-(small?44:285))/W,30)));
  bx=small?Math.max(22,(width-W*tile)/2):
    Math.max(35,(width-W*tile-205)/2);
  by=small?64:Math.max(62,(height-H*tile)/2);
  panelX=small?bx:bx+W*tile+33;
}

function boardView() {
  noStroke(); fill('#080e15');
  rect(bx-7,by-7,W*tile+14,H*tile+14,3);
  stroke('#81929b'); strokeWeight(2); noFill();
  rect(bx-7,by-7,W*tile+14,H*tile+14,3);
  for (let y=0; y<H; y++) {
    for (let x=0; x<W; x++) {
      if (grid[y][x]) block(x,y,grid[y][x]);
      else {
        stroke('#26333d'); strokeWeight(1); noFill();
        rect(bx+x*tile+1,by+y*tile+1,tile-2,tile-2);
      }
    }
  }
  if (mode==='over') return;
  let ghost=piece.y;
  while (fits(piece.shape,piece.x,ghost+1)) ghost++;
  shapeView(piece.shape,piece.x,ghost,piece.kind,true);
  shapeView(piece.shape,piece.x,piece.y,piece.kind,false);
}

function shapeView(shape,px,py,kind,ghost) {
  for (let y=0; y<shape.length; y++) {
    for (let x=0; x<shape[y].length; x++) {
      if (shape[y][x] && py+y>=0) block(px+x,py+y,kind,ghost);
    }
  }
}

function block(x,y,kind,ghost=false) {
  const sx=bx+x*tile, sy=by+y*tile;
  if (ghost) {
    noFill(); stroke(INK[kind]); strokeWeight(1);
    rect(sx+4,sy+4,tile-8,tile-8); return;
  }
  noStroke(); fill(INK[kind]);
  rect(sx+1,sy+1,tile-2,tile-2,2);
  fill(255,255,255,100);
  rect(sx+3,sy+3,tile-6,Math.max(2,tile*.12));
  fill(0,0,0,60); rect(sx+3,sy+tile-5,tile-6,2);
}

function infoView() {
  const small=width<650;
  const top=small?by+H*tile+17:by+9;
  const gap=small?Math.min(96,(width-40)/3):0;
  noStroke(); textAlign(LEFT); textSize(11); fill('#a2b4b9');
  text('PUNKTID',panelX,top);
  text('READ',panelX+gap,small?top:top+76);
  text('TASE',panelX+gap*2,small?top:top+152);
  fill('#f1ead5'); textStyle(BOLD); textSize(small?14:18);
  text(points,panelX,top+25);
  text(rows,panelX+gap,small?top+25:top+101);
  text(level,panelX+gap*2,small?top+25:top+177);
  textStyle(NORMAL); fill('#a2b4b9'); textSize(11);
  const nx=small?panelX+gap*2+8:panelX;
  const ny=small?top+43:top+221;
  text('JÄRGMINE',nx,ny);
  const n=small?Math.min(13,tile*.5):18;
  FORMS[next].forEach((r,y)=>r.forEach((v,x)=>{
    if (v) { noStroke(); fill(INK[next]); rect(nx+x*n,ny+10+y*n,n-2,n-2,2); }
  }));
  if (!small && height>=680) {
    fill('#a2b4b9'); textSize(12);
    ['← →  LIIGU','↑    PÖÖRA','↓    KIIREMINI',
     'SPACE  ALLA','P    PAUS','R    UUS MÄNG'].forEach((s,i)=>
      text(s,panelX,top+340+i*25));
  }
}

function buttonView() {
  controls=[];
  if (width>=650) return;
  const labels=['←','→','↻','↓','⇓'];
  const actions=['left','right','turn','down','drop'];
  const size=Math.min(56,(width-36)/5-6), gap=(width-36-5*size)/4;
  const y=height-61;
  labels.forEach((label,i)=>{
    const x=18+i*(size+gap);
    controls.push({x,y,w:size,h:48,action:actions[i]});
    stroke('#879aa3'); strokeWeight(1); fill('#273640');
    rect(x,y,size,48,5);
    noStroke(); fill('#f1ead5'); textAlign(CENTER,CENTER);
    textSize(24); text(label,x+size/2,y+23);
  });
  noStroke(); fill('#afc0c2'); textSize(11);
  text('PAUS / JÄTKA',width/2,y-19);
  controls.push({x:width/2-80,y:y-40,w:160,h:28,action:'pause'});
}

function overlayView() {
  const y=by+H*tile*.38;
  noStroke(); fill(8,14,21,235); rect(bx,y,W*tile,130);
  fill('#f1ead5'); textAlign(CENTER); textStyle(BOLD);
  textSize(Math.min(25,tile*.9));
  text(mode==='pause'?'PAUS':'MÄNG LÄBI',bx+W*tile/2,y+48);
  textStyle(NORMAL); textSize(12);
  text(mode==='pause'?'P või puuduta jätkamiseks':
    'R või puuduta uueks mänguks',bx+W*tile/2,y+82);
}

function keyPressed() {
  const action={37:'left',39:'right',38:'turn',40:'down',
    32:'drop',80:'pause',82:'restart'}[keyCode];
  if (action) { command(action); return false; }
}

function mousePressed() {
  if (mode==='over') { newGame(); return false; }
  if (mode==='pause') { command('pause'); return false; }
  const b=controls.find(v=>mouseX>=v.x && mouseX<=v.x+v.w &&
    mouseY>=v.y && mouseY<=v.y+v.h);
  if (b) { command(b.action); return false; }
}

function touchStarted() { mousePressed(); return false; }
function windowResized() { resizeCanvas(windowWidth,windowHeight); }
