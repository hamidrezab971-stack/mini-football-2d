'use strict';
(() => {
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const W = 960, H = 540;
  const field = {left: 42, right: 918, top: 30, bottom: 510};
  const goal = {top: 202, bottom: 338};
  const matchLength = 90;
  const keys = new Set();
  let playing = false, elapsed = 0, lastFrame = 0, goalPause = 0, message = '', shotQueued = false;
  let blueScore = 0, redScore = 0;
  const blue = {x: 222, y: 270, vx: 0, vy: 0, r: 19, color: '#44c4ff', facingX: 1, facingY: 0};
  const red = {x: 730, y: 270, vx: 0, vy: 0, r: 19, color: '#ff7069', facingX: -1, facingY: 0};
  const blueKeeper = {x: 79, y: 270, r: 21, color: '#e9d768'};
  const redKeeper = {x: 881, y: 270, r: 21, color: '#efb65a'};
  const ball = {x: 470, y: 270, vx: 0, vy: 0, r: 10, lastKick: 0};
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const normalize = (x, y) => { const d = Math.hypot(x, y) || 1; return [x / d, y / d]; };
  const overlay = $('game-overlay');

  function resetPositions() {
    Object.assign(blue, {x: 225, y: 270, vx: 0, vy: 0, facingX: 1, facingY: 0});
    Object.assign(red, {x: 735, y: 270, vx: 0, vy: 0, facingX: -1, facingY: 0});
    Object.assign(ball, {x: W/2, y: H/2, vx: 0, vy: 0, lastKick: 0});
    blueKeeper.y = redKeeper.y = H/2;
  }
  function refreshBoard() {
    $('score-blue').textContent = blueScore;
    $('score-red').textContent = redScore;
    const seconds = Math.max(0, Math.ceil(matchLength - elapsed));
    $('timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    $('game-status').textContent = message || (playing ? 'مسابقه در جریان است' : 'برای شروع آماده‌ای؟');
  }
  function showOverlay(title, info, button) {
    $('overlay-title').textContent = title;
    $('overlay-text').textContent = info;
    $('play-button').textContent = button;
    overlay.classList.remove('hidden');
  }
  function startMatch() {
    blueScore = redScore = 0; elapsed = goalPause = 0;
    message = ''; playing = true; resetPositions();
    overlay.classList.add('hidden'); refreshBoard();
  }
  function endMatch() {
    playing = false;
    const result = blueScore > redScore ? '🏆 تو برنده شدی!' : blueScore < redScore ? 'مسابقه تمام شد!' : '🤝 مساوی شد!';
    const detail = `نتیجه نهایی: ${blueScore} - ${redScore}`;
    showOverlay(result, detail, 'بازی دوباره');
    message = 'پایان مسابقه'; refreshBoard();
  }
  function collidePlayer(player) {
    const dx = ball.x - player.x, dy = ball.y - player.y;
    const d = Math.hypot(dx, dy) || 0.001;
    const limit = player.r + ball.r;
    if (d < limit) {
      const nx = dx / d, ny = dy / d;
      ball.x = player.x + nx * limit;
      ball.y = player.y + ny * limit;
      const move = player === blue ? 90 : 95;
      ball.vx += nx * move;
      ball.vy += ny * move;
    }
  }
  function keeperCollision(keeper, dir, dt) {
    const target = clamp(ball.y, goal.top + 10, goal.bottom - 10);
    keeper.y += clamp(target - keeper.y, -225 * dt, 225 * dt);
    if (dist(keeper, ball) < keeper.r + ball.r + 1) {
      const vx = dir * 355;
      ball.x = keeper.x + dir * (keeper.r + ball.r + 1);
      ball.vx = vx;
      ball.vy = clamp((ball.y - keeper.y) * 8, -280, 280);
    }
  }
  function score(team) {
    if (team === 'blue') blueScore++; else redScore++;
    message = team === 'blue' ? '⚽ گل برای شما!' : '⚽ گل برای حریف!';
    goalPause = 1.4;
    ball.vx = ball.vy = 0;
    refreshBoard();
  }
  function kickBall(from, power, targetX, targetY) {
    if (dist(from, ball) > from.r + ball.r + 27) return false;
    const [nx, ny] = normalize(targetX - ball.x, targetY - ball.y);
    ball.x = from.x + nx * (from.r + ball.r + 2);
    ball.y = from.y + ny * (from.r + ball.r + 2);
    ball.vx = nx * power;
    ball.vy = ny * power;
    ball.lastKick = performance.now();
    return true;
  }
  function update(dt) {
    if (!playing) return;
    if (goalPause > 0) {
      goalPause -= dt;
      if (goalPause <= 0) { goalPause = 0; message = ''; resetPositions(); }
      return;
    }
    elapsed += dt;
    if (elapsed >= matchLength) { elapsed = matchLength; endMatch(); return; }

    // Player movement.
    let dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    let dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
    let [nx, ny] = normalize(dx, dy);
    if (dx === 0 && dy === 0) nx = ny = 0;
    const speed = keys.has('shift') ? 335 : 255;
    blue.vx = nx * speed; blue.vy = ny * speed;
    blue.x = clamp(blue.x + blue.vx * dt, field.left + blue.r, field.right - blue.r);
    blue.y = clamp(blue.y + blue.vy * dt, field.top + blue.r, field.bottom - blue.r);
    if (dx || dy) { blue.facingX = nx; blue.facingY = ny; }

    // Simple opponent: chase the ball, shoot at your goal.
    const toward = normalize(ball.x - red.x, ball.y - red.y);
    red.vx = toward[0] * 190; red.vy = toward[1] * 190;
    red.x = clamp(red.x + red.vx * dt, field.left + red.r, field.right - red.r);
    red.y = clamp(red.y + red.vy * dt, field.top + red.r, field.bottom - red.r);
    red.facingX = toward[0]; red.facingY = toward[1];
    collidePlayer(blue); collidePlayer(red);

    if (shotQueued) {
      const aimX = blue.facingX < -0.4 ? 0 : W;
      const aimY = H/2 + blue.facingY * 145;
      kickBall(blue, 685, aimX, aimY);
      shotQueued = false;
    }
    if (dist(red, ball) < red.r + ball.r + 19 && (performance.now() - ball.lastKick > 500)) {
      kickBall(red, 480, field.left, H/2 + (Math.random() - 0.5) * 100);
    }
    keeperCollision(blueKeeper, 1, dt);
    keeperCollision(redKeeper, -1, dt);

    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    const damping = Math.pow(0.989, dt * 60);
    ball.vx *= damping; ball.vy *= damping;
    if (Math.abs(ball.vx) < 1) ball.vx = 0;
    if (Math.abs(ball.vy) < 1) ball.vy = 0;
    if (ball.y - ball.r < field.top) { ball.y = field.top + ball.r; ball.vy = Math.abs(ball.vy) * .78; }
    if (ball.y + ball.r > field.bottom) { ball.y = field.bottom - ball.r; ball.vy = -Math.abs(ball.vy) * .78; }
    if (ball.x + ball.r > field.right) {
      if (ball.y > goal.top + ball.r && ball.y < goal.bottom - ball.r) score('blue');
      else { ball.x = field.right - ball.r; ball.vx = -Math.abs(ball.vx) * .79; }
    }
    if (ball.x - ball.r < field.left) {
      if (ball.y > goal.top + ball.r && ball.y < goal.bottom - ball.r) score('red');
      else { ball.x = field.left + ball.r; ball.vx = Math.abs(ball.vx) * .79; }
    }
    refreshBoard();
  }
  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
  function circle(x,y,r,fill) { ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); if(fill)ctx.fill();else ctx.stroke(); }
  function drawPerson(p, label) {
    ctx.fillStyle='#051b1b55'; circle(p.x+3,p.y+5,p.r+3,true);
    ctx.fillStyle=p.color; circle(p.x,p.y,p.r,true);
    ctx.strokeStyle='#fff';ctx.lineWidth=3; circle(p.x,p.y,p.r,false);
    ctx.fillStyle='#10232c';ctx.font='bold 15px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,p.x,p.y+1);
  }
  function drawField() {
    ctx.fillStyle='#14683f';ctx.fillRect(0,0,W,H);
    const stripeWidth=(field.right-field.left)/12;
    for(let i=0;i<12;i++) { ctx.fillStyle = i%2?'#197e4a':'#1a7748';ctx.fillRect(field.left+i*stripeWidth,field.top,stripeWidth,field.bottom-field.top); }
    ctx.strokeStyle='#ffffffa8';ctx.lineWidth=3;
    ctx.strokeRect(field.left,field.top,field.right-field.left,field.bottom-field.top);
    line(W/2,field.top,W/2,field.bottom);circle(W/2,H/2,68,false);
    ctx.fillStyle='#fff';circle(W/2,H/2,4,true);
    ctx.strokeRect(field.left,H/2-114,132,228);ctx.strokeRect(field.right-132,H/2-114,132,228);
    ctx.strokeRect(field.left,H/2-64,54,128);ctx.strokeRect(field.right-54,H/2-64,54,128);
    ctx.fillStyle='#fff';circle(field.left+93,H/2,4,true);circle(field.right-93,H/2,4,true);
    ctx.fillStyle='#092a3455';ctx.fillRect(12,goal.top,field.left-12,goal.bottom-goal.top);ctx.fillRect(field.right,goal.top,30,goal.bottom-goal.top);
    ctx.strokeStyle='#fff';ctx.strokeRect(12,goal.top,field.left-12,goal.bottom-goal.top);ctx.strokeRect(field.right,goal.top,30,goal.bottom-goal.top);
    ctx.lineWidth=1;ctx.strokeStyle='#ffffff40';
    for(let y=goal.top+15;y<goal.bottom;y+=15){line(12,y,field.left,y);line(field.right,y,948,y);}
    ctx.fillStyle='#ffffff70';ctx.font='bold 16px Arial';ctx.textAlign='center';ctx.fillText('MINI FOOTBALL',W/2,field.bottom-12);
  }
  function render() {
    ctx.clearRect(0,0,W,H);drawField();
    drawPerson(blueKeeper,'1'); drawPerson(redKeeper,'1');
    drawPerson(blue,'10');drawPerson(red,'9');
    ctx.fillStyle='#031e2338';circle(ball.x+3,ball.y+4,ball.r+3,true);
    ctx.fillStyle='#fff';circle(ball.x,ball.y,ball.r,true);
    ctx.strokeStyle='#172d33';ctx.lineWidth=2;circle(ball.x,ball.y,ball.r,false);
    ctx.fillStyle='#263b40';circle(ball.x,ball.y,3.7,true);
    if (goalPause > 0) {
      ctx.fillStyle='#10232caa';ctx.fillRect(W/2-260,H/2-50,520,100);
      ctx.font='bold 36px Tahoma,Arial';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText(message,W/2,H/2+12);
    }
  }
  function frame(timestamp) {
    const dt = Math.min(.033, (timestamp - (lastFrame||timestamp)) / 1000);
    lastFrame = timestamp;
    update(dt);render();requestAnimationFrame(frame);
  }
  const moveKeys=new Set(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' ','shift','r']);
  document.addEventListener('keydown', ev => {
    const k=ev.key.toLowerCase();if(moveKeys.has(k))ev.preventDefault();keys.add(k);
    if(k===' ' && !ev.repeat)shotQueued=true;
    if(k==='r'&&!ev.repeat)startMatch();
  });
  document.addEventListener('keyup', ev => keys.delete(ev.key.toLowerCase()));
  window.addEventListener('blur',()=>keys.clear());
  $('play-button').addEventListener('click', startMatch);
  $('restart-button').addEventListener('click', startMatch);
  document.querySelectorAll('[data-control]').forEach(button=>{
    const name = ({up:'arrowup',down:'arrowdown',left:'arrowleft',right:'arrowright'})[button.dataset.control];
    button.addEventListener('pointerdown', ev=>{ev.preventDefault();button.setPointerCapture(ev.pointerId);keys.add(name);});
    for(const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event,()=>keys.delete(name));
  });
  $('touch-shoot').addEventListener('pointerdown',ev=>{ev.preventDefault();shotQueued=true;});
  resetPositions();refreshBoard();requestAnimationFrame(frame);
})();
