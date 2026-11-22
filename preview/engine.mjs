export const SIZE=5, HEIGHT=3, TARGET=4;
export const key=(x,y,z)=>`${x},${y},${z}`;
export function height(board,x,z){for(let y=HEIGHT-1;y>=0;y--)if(board.has(key(x,y,z)))return y+1;return 0;}
export function landing(board,x,z,rotation,piece){const [dx,dz]=[[1,0],[0,1],[-1,0],[0,-1]][rotation];return piece.map((color,i)=>({x:x+dx*i,z:z+dz*i,color})).map(p=>({...p,y:height(board,p.x,p.z)}));}
export const valid=points=>points.every(p=>p.x>=0&&p.x<SIZE&&p.z>=0&&p.z<SIZE&&p.y<HEIGHT);
export function groups(board){const seen=new Set(),result=[];for(const [k,p]of board){if(seen.has(k))continue;const group=[],stack=[p];seen.add(k);while(stack.length){const a=stack.pop();group.push(a);for(const [dx,dy,dz]of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const nk=key(a.x+dx,a.y+dy,a.z+dz),n=board.get(nk);if(n&&!seen.has(nk)&&n.color===a.color){seen.add(nk);stack.push(n);}}}if(group.length>=TARGET)result.push(group);}return result;}
export function settle(board){const next=new Map();for(let x=0;x<SIZE;x++)for(let z=0;z<SIZE;z++){let y=0;for(let old=0;old<HEIGHT;old++){const p=board.get(key(x,old,z));if(p){const n={...p,y:y++};next.set(key(n.x,n.y,n.z),n);}}}return next;}
export function resolve(board){let current=new Map(board),waves=[];while(true){const matches=groups(current);if(!matches.length)break;const removed=matches.flat();waves.push(removed);for(const p of removed)current.delete(key(p.x,p.y,p.z));current=settle(current);}return {board:current,waves};}
export function movesRemain(board){for(let x=0;x<SIZE;x++)for(let z=0;z<SIZE;z++)for(let r=0;r<4;r++)if(valid(landing(board,x,z,r,[0,1])))return true;return false;}
export function rng(seed=724){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
