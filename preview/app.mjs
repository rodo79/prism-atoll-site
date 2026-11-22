import {SIZE,HEIGHT,key,height,landing,valid,resolve,movesRemain,rng} from './engine.mjs';

const french = document.documentElement.lang === 'fr';
const copy = {
  column: (label, level, target) => french
    ? `Colonne ${label}, ${level} niveaux occupés sur ${HEIGHT}${target ? ', arrivée de la paire' : ''}`
    : `Column ${label}, ${level} of ${HEIGHT} levels occupied${target ? ', landing column' : ''}`,
  done: french ? 'Partie terminée. Recommencez pour rejouer.' : 'Game over. Start over to play again.',
  falling: french ? 'La paire descend…' : 'The pair is dropping…',
  placement: (label, allowed) => french
    ? `Départ ${label} · ${allowed ? 'Placement possible' : 'Placement bloqué. Déplacez ou orientez la paire.'}`
    : `Column ${label} · ${allowed ? 'Ready to drop' : 'Move blocked. Choose another column or turn the pair.'}`,
  score: (score, turns) => french
    ? `${score} ${score < 2 ? 'point' : 'points'} · ${turns} ${turns < 2 ? 'paire' : 'paires'}`
    : `${score} ${score === 1 ? 'point' : 'points'} · ${turns} ${turns === 1 ? 'pair' : 'pairs'}`,
  ready: french ? 'Reliez quatre boules de même couleur pour les faire éclore.' : 'Connect four matching marbles to make them bloom.',
  noRoom: french ? 'La paire ne tient pas ici. Déplacez-la ou tournez-la.' : 'The pair does not fit here. Move it or turn it.',
  cascade: n => french ? `Cascade ×${n} ! La chute relie de nouvelles couleurs.` : `Cascade ×${n}! The fall connects more marbles.`,
  bloom: n => french ? `Floraison de ${n} boules.` : `${n} marbles bloomed.`,
  placed: n => french ? `Paire ${n} posée. Préparez un groupe de quatre.` : `Pair ${n} placed. Set up a group of four.`,
  gameOver: (score, turns) => french ? `Plateau rempli. ${score} points en ${turns} paires.` : `Board full. ${score} points in ${turns} pairs.`,
  turned: french ? 'Paire orientée. Les cercles pointillés montrent les arrivées.' : 'Pair turned. The dotted rings show where it will land.'
};

const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const colors=['#7bdfce','#efb276','#aea0ee','#e390b2'],symbols=['●','✦','◆','＋'];
let board=new Map(),random,piece,next,x=2,z=2,rot=0,score=0,blooms=0,turns=0,angle=-.68,targetAngle=-.68,w=0,h=0,scale=45,particles=[],busy=false,over=false,clock=12,last=performance.now(),generation=0,falling=null;

const columnButtons=[];
for(let row=0;row<SIZE;row++)for(let col=0;col<SIZE;col++){
  const button=document.createElement('button');
  button.type='button';
  button.onclick=()=>{if(busy||over)return;x=col;z=row;updateControls();};
  $('columns').append(button);columnButtons.push({button,col,row});
}
function updateControls(){
  const points=landing(board,x,z,rot,piece),allowed=valid(points);
  for(const {button,col,row} of columnButtons){
    const point=points.find(p=>p.x===col&&p.z===row),level=height(board,col,row),label=`${'ABCDE'[col]}${row+1}`;
    button.textContent=label+(point?` ${symbols[point.color]}`:'');
    button.classList.toggle('selected',col===x&&row===z);
    button.classList.toggle('paired',Boolean(point));
    button.classList.toggle('blocked',Boolean(point)&&!allowed);
    button.style.setProperty('--orb-color',point?colors[point.color]:'#c8dcda');
    button.setAttribute('aria-pressed',String(col===x&&row===z));
    button.setAttribute('aria-label',copy.column(label,level,point));
    button.disabled=busy||over;
  }
  $('placement').textContent=over ? copy.done : busy ? copy.falling : copy.placement(`${'ABCDE'[x]}${z+1}`,allowed);
  $('drop').disabled=busy||over||!allowed;$('rotate').disabled=busy||over;
}

function makePiece(){const a=Math.floor(random()*4);return[a,(a+1+Math.floor(random()*3))%4];}
function message(s){$('toast').textContent=s;}
function update(){ updateControls(); $('blooms').textContent=blooms;$('score').textContent=copy.score(score,turns);$('filled').innerHTML=`${board.size}<span>/75</span>`;$('fillbar').style.width=`${board.size/75*100}%`;$('preview').innerHTML=next.map(c=>`<span class="orb" style="background:${colors[c]}">${symbols[c]}</span>`).join('');}
function reset(){generation++;random=rng();board=new Map();piece=makePiece();next=makePiece();x=2;z=2;rot=0;score=blooms=turns=0;clock=12;over=busy=false;particles=[];falling=null;update();message(copy.ready);}
function project(px,py,pz){const a=px-2,b=pz-2,c=Math.cos(angle),s=Math.sin(angle);return {x:w*.51+(a*c-b*s)*scale,y:h*.61+(a*s+b*c)*scale*.48-py*scale*.85,depth:a*s+b*c};}
function polygon(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function cell(cx,cz,y=0,fill='#7aac9910',stroke='#9ecebd25'){polygon([[-.47,-.47],[.47,-.47],[.47,.47],[-.47,.47]].map(([dx,dz])=>project(cx+dx,y,cz+dz)),fill,stroke);}
function orb(p,alpha=1,ghost=false){const pos=project(p.x,p.y+.43,p.z),r=scale*.34;ctx.save();ctx.globalAlpha=alpha;ctx.shadowColor=colors[p.color];ctx.shadowBlur=ghost?8:14;let grad=ctx.createRadialGradient(pos.x-r*.3,pos.y-r*.4,1,pos.x,pos.y,r);grad.addColorStop(0,ghost?'#e0fff3': '#f3fff6');grad.addColorStop(.22,colors[p.color]);grad.addColorStop(1,ghost?'#182d36': '#25333b');ctx.fillStyle=grad;ctx.beginPath();ctx.arc(pos.x,pos.y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=colors[p.color];ctx.lineWidth=ghost?2:1;ctx.setLineDash(ghost?[3,4]:[]);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=ghost?'#fff':'#142535';ctx.font=`${Math.max(10,r*.65)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(symbols[p.color],pos.x,pos.y);ctx.restore();}
function resize(){const rect=canvas.getBoundingClientRect();w=rect.width;h=rect.height;scale=Math.min(61,w*.055,h*.105);if(w<600)scale=Math.min(46,w*.115);const dpr=Math.min(devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;angle+=(targetAngle-angle)*Math.min(1,dt*9);ctx.clearRect(0,0,w,h);ctx.save();const center=project(2,-.2,2);ctx.beginPath();ctx.ellipse(center.x,center.y+15,scale*4,scale*1.8,0,0,Math.PI*2);ctx.fillStyle='#00000040';ctx.shadowColor='#000';ctx.shadowBlur=50;ctx.fill();ctx.restore();
ctx.beginPath();ctx.ellipse(center.x,center.y,scale*3.95,scale*1.9,0,0,Math.PI*2);ctx.fillStyle="#162b2d";ctx.fill();ctx.strokeStyle="#6b8873";ctx.lineWidth=3;ctx.stroke();ctx.lineWidth=1;
const corners=[[-.7,-.7],[4.7,-.7],[4.7,4.7],[-.7,4.7]];polygon(corners.map(([a,b])=>project(a,-.22,b)),'#132528','#48665c');polygon(corners.map(([a,b])=>project(a,-.05,b)),'#14272a','#708f7d');
for(let a=0;a<SIZE;a++)for(let b=0;b<SIZE;b++)cell(a,b);
// Quiet height markers make the three storeys readable.
for(let y=1;y<=HEIGHT;y++){let p=project(-.75,y-.3,4.85);ctx.fillStyle='#7c9b90';ctx.font='9px system-ui';ctx.textAlign='right';ctx.fillText(`${y}`,p.x-8,p.y);ctx.beginPath();ctx.moveTo(p.x-3,p.y);ctx.lineTo(p.x+4,p.y);ctx.strokeStyle='#78968866';ctx.stroke();}
let targets=landing(board,x,z,rot,piece),allowed=valid(targets);for(const p of targets)if(p.x>=0&&p.x<5&&p.z>=0&&p.z<5)cell(p.x,p.z,0,allowed?'#9fedc730':'#ee8a6d35',allowed?'#a8efce':'#e78d79');
const items=[...board.values()].map(p=>({...p,ghost:false}));if(!busy&&!over)items.push(...targets.filter(p=>p.x>=0&&p.x<5&&p.z>=0&&p.z<5).map(p=>({...p,ghost:true})));
items.sort((a,b)=>{const pa=project(a.x,a.y,a.z),pb=project(b.x,b.y,b.z);return(pa.depth+a.y*.08)-(pb.depth+b.y*.08);});for(const p of items)orb(p,p.ghost?.48:1,p.ghost);
// Current pair hovers above its landing columns; faint guides explain depth.
if(falling){const t=Math.min(1,(now-falling.start)/380);for(const p of falling.points)orb({...p,y:4.15+(p.y-4.15)*t*t},1);}
if(!busy&&!over){for(const p of targets){const start=project(p.x,4.5,p.z),end=project(p.x,p.y+.7,p.z);ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.strokeStyle=allowed?'#bde4ca28':'#ed987944';ctx.setLineDash([2,6]);ctx.stroke();ctx.setLineDash([]);orb({...p,y:4.15+Math.sin(now/1000)*.05},.9);}}
particles=particles.filter(p=>p.life>0);for(const p of particles){p.life-=dt;p.y+=dt*p.vy;p.x+=dt*p.vx;p.z+=dt*p.vz;const s=project(p.x,p.y,p.z);ctx.globalAlpha=Math.max(0,p.life/1.2);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(s.x,s.y,2.3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
if($('timed').checked&&!busy&&!over&&!document.hidden){clock-=dt;if(clock<=0){if(allowed)drop();else{clock=12;message(copy.noRoom);}}}$('timerbar').style.width=`${clock/12*100}%`;requestAnimationFrame(frame);}
async function drop(){if(busy||over)return;const points=landing(board,x,z,rot,piece);if(!valid(points)){message(copy.noRoom);return;}busy=true;updateControls();const gen=generation;falling={points,start:performance.now()};await new Promise(r=>setTimeout(r,390));if(gen!==generation)return;falling=null;for(const p of points)board.set(key(p.x,p.y,p.z),p);turns++;update();const result=resolve(board);if(result.waves.length){for(const wave of result.waves){for(const p of wave)for(let i=0;i<10;i++)particles.push({...p,color:colors[p.color],life:1.2,vx:(Math.random()-.5)*1.5,vz:(Math.random()-.5)*1.5,vy:.4+Math.random()});}await new Promise(r=>setTimeout(r,420));if(gen!==generation)return;board=result.board;blooms+=result.waves.length;score+=result.waves.reduce((s,g,i)=>s+g.length*10*(i+1),0);message(result.waves.length>1?copy.cascade(result.waves.length):copy.bloom(result.waves[0].length));}else message(copy.placed(turns));piece=next;next=makePiece();clock=12;busy=false;over=!movesRemain(board);if(over)message(copy.gameOver(score,turns));update();}
function rotate(){if(busy||over)return;rot=(rot+1)%4;updateControls();message(copy.turned);}
function pointIn(px,py,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(((a.y>py)!==(b.y>py))&&(px<(b.x-a.x)*(py-a.y)/(b.y-a.y)+a.x))inside=!inside;}return inside;}
canvas.addEventListener('pointermove',e=>{if(busy||over)return;const rect=canvas.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;let candidates=[];for(let a=0;a<5;a++)for(let b=0;b<5;b++){const level=Math.min(height(board,a,b),2);for(const y of [0,level]){const poly=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([dx,dz])=>project(a+dx,y,b+dz));if(pointIn(px,py,poly))candidates.push({x:a,z:b,depth:project(a,y,b).depth});}}if(candidates.length){candidates.sort((a,b)=>b.depth-a.depth);x=candidates[0].x;z=candidates[0].z;updateControls();}});
canvas.addEventListener('click',()=>{canvas.focus();rotate();});
window.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||(e.target.tagName==='BUTTON'&&e.key===' '))return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();if(e.key===' ')drop();else if(e.key.toLowerCase()==='r')rotate();else if(e.key.toLowerCase()==='q')targetAngle-=Math.PI/2;else if(e.key.toLowerCase()==='e')targetAngle+=Math.PI/2;else{let sx=0,sy=0;if(e.key==='ArrowLeft')sx=-1;if(e.key==='ArrowRight')sx=1;if(e.key==='ArrowUp')sy=-1;if(e.key==='ArrowDown')sy=1;if(sx||sy){const c=Math.cos(angle),s=Math.sin(angle),dx=sx*c+sy*s,dz=-sx*s+sy*c;if(Math.abs(dx)>Math.abs(dz))x=Math.max(0,Math.min(4,x+Math.sign(dx)));else z=Math.max(0,Math.min(4,z+Math.sign(dz)));updateControls();}}});
$('drop').onclick=drop;$('rotate').onclick=rotate;$('restart').onclick=reset;$('left').onclick=()=>targetAngle-=Math.PI/2;$('right').onclick=()=>targetAngle+=Math.PI/2;$('timed').onchange=()=>clock=12;window.addEventListener('resize',resize);reset();resize();requestAnimationFrame(frame);
