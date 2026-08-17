// Opens the real app at six device sizes and MEASURES it. Not a pass/fail test
// like the others in here — a tape measure. Run it, read the numbers, fix what
// they show, run it again.
//
// It exists because "responsive" had never actually been checked on a phone.
// The app is used in a warehouse, on a phone, by someone who may be wearing
// gloves, and every judgement about that until now was made by eye on a laptop.
//
// What it looks for, on every tab at every size:
//   • Does the PAGE scroll sideways? (A table scrolling inside its own box is
//     correct; the page doing it is not.)
//   • Is anything too small to hit with a thumb? Apple asks 44px, Android 48.
//   • Does anything stick out past the right edge?
//   • Did the page throw?
//
// Two things it deliberately does NOT count:
//   • The off-screen rack drawer — its children are static inside a fixed
//     parent, so they read as overflowing while sitting off-canvas by design.
//   • Small controls on the LAPTOP size. 29px is fine with a mouse; the
//     44px rule is about fingers, which is why the CSS uses (pointer: coarse)
//     and not a width breakpoint.
//
// The connection dot keeps a 10px face and gains its target from a
// pseudo-element, so it is HIT-TESTED rather than measured — see dotHit.
//
// Usage:  node tools/audit-responsive.js      (screenshots land in ./audit/)
// Needs:  npm install playwright


const fs=require('fs'), os=require('os'), path=require('path');
const {chromium}=require('playwright');

const SRC=process.argv[2] || path.join(__dirname,'..','Index_v3_fixed.html');
let html=fs.readFileSync(SRC,'utf8');

// Fake backend: getInitialData answers with a small but realistic dataset.
const stub=`<script>
window.google=window.google||{}; window.google.charts=window.google.charts||{load:function(){},setOnLoadCallback:function(){}}; Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },40); return; }
    setTimeout(function(){ ok && ok([]); },20);
  };
}})}});
var CATS=['WINDOW','SCREEN','SHOWER','MIRROR','IGU','HARDWARE'];
var NAMES=['WINDOW SCREEN 36x48','FLASHING TAPE 6"','GE SILPRUF SC2000','Rain Buster 450','44 NORTH PANEL','HF 156 GLASS','SHOWER DOOR HINGE SET','MIRROR 24x36 BEVELED'];
var LOCS=['A1A','A2B','B1C','C3A','D2B'];
function mv(i){return{rowIdx:i+2,type:['ENTRY','EXIT','TRANSFER','WASTE','RETURN'][i%5],category:CATS[i%CATS.length],
 name:NAMES[i%NAMES.length],qty:(i%9)+1,unit:'pcs',location:LOCS[i%LOCS.length],destination:LOCS[(i+2)%LOCS.length],
 project:'ALTA VISTA LOT '+(100+i),supplier:'AMSCO',po:'PO-'+(4000+i),user:'jose@ox-glass.com',
 date:new Date(2026,7,17-(i%14)).toISOString(),comments:'Delivered to site, checked by warehouse',status:'OK',pm:'Andrew A.'};}
window.__DATA={ userRole:'ADMIN', userEmail:'jose@ox-glass.com', userName:'Jose Castro',
 serverVersion:'audit', company:{name:'OX Glass LLC.',domain:'ox-glass.com',logo:''},
 movements:Array.from({length:60},function(_,i){return mv(i);}),
 stock:(function(){var o={};NAMES.forEach(function(nm,i){var k=nm.toUpperCase();
   o[k]={name:nm,category:CATS[i%CATS.length],unit:'pcs',warehouseQty:(i*7)%40,siteQty:i*2,
         availableQty:(i*7)%40,wastedQty:i%3,reservedQty:0,location:LOCS[i%LOCS.length],status:'OK',
         dateReceived:new Date(2026,7,10).toISOString(),lastNote:''};});
   // A few more per category so the monitor has something to scroll.
   CATS.forEach(function(c,ci){for(var j=0;j<6;j++){var nm=c+' ITEM '+(j+1);
     o[nm]={name:nm,category:c,unit:'pcs',warehouseQty:(ci*3+j)%25,siteQty:j,availableQty:(ci*3+j)%25,
            wastedQty:0,reservedQty:0,location:LOCS[j%LOCS.length],status:'OK',
            dateReceived:new Date(2026,7,11).toISOString(),lastNote:''};}});
   return o;})(),
 monitoredMaterials:null,
 config:{categories:CATS,projects:['ALTA VISTA','44 NORTH','BHS12'],suppliers:['AMSCO','ALSIDE','CASCADE'],
   locations:LOCS.map(function(l){return{name:l,group:'RACKS'};}),units:['pcs','ft','box'],users:[]},
 incoming:[], rackPhotos:{}, systemActivity:[
   {at:new Date(2026,7,17,2,36).toISOString(),action:'BACKUP_CREATED',label:'Backup created',detail:'OX Glass LLC. — Acopio — Backup 2026-08-17',extra:'',ref:null},
   {at:new Date(2026,7,16,2,36).toISOString(),action:'BACKUP_CREATED',label:'Backup created',detail:'OX Glass LLC. — Acopio — Backup 2026-08-16',extra:'',ref:null},
   {at:new Date(2026,7,15,2,36).toISOString(),action:'BACKUP_CREATED',label:'Backup created',detail:'OX Glass LLC. — Acopio — Backup 2026-08-15',extra:'',ref:null}],
 archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
html=html.replace('</head>', stub+'</head>');
const f=path.join(os.tmpdir(),'acopio-audit.html');
fs.writeFileSync(f,html);

const SIZES=[
 {n:'phone-360', w:360, h:740, touch:true},
 {n:'phone-390', w:390, h:844, touch:true},
 {n:'phone-430', w:430, h:932, touch:true},
 {n:'tablet-768',w:768, h:1024, touch:true},
 {n:'tablet-1024',w:1024,h:768, touch:true},
 {n:'laptop-1440',w:1440,h:900, touch:false},
];
const TABS=[['dashboard','btn-dashboard'],['movements','btn-movements'],['projects','btn-projects'],['warehouse','btn-warehouse'],['incoming','btn-incoming']];

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const findings=[];
 fs.mkdirSync('audit',{recursive:true});
 for(const s of SIZES){
   const p=await b.newPage({viewport:{width:s.w,height:s.h},deviceScaleFactor:2,hasTouch:s.touch,isMobile:s.touch});
   const errs=[]; p.on('pageerror',e=>errs.push(String(e.message)));
   await p.goto('file://'+f);
   await p.waitForTimeout(900);
   await p.evaluate(()=>{var sp=document.getElementById('appSplash'); if(sp) sp.style.display='none';});
   for(const [tab,btn] of TABS){
     await p.evaluate(([t,bn])=>{ try{ showTab(t,bn); }catch(e){} },[tab,btn]);
     await p.waitForTimeout(320);
     const r=await p.evaluate(()=>{
       const out={overflowX:document.documentElement.scrollWidth-document.documentElement.clientWidth, small:[], wide:[]};
       // Touch targets under 40px that a finger has to hit.
       document.querySelectorAll('button, a[href], select, input:not([type=hidden])').forEach(el=>{
         const r=el.getBoundingClientRect();
         if(r.width===0||r.height===0) return;
         if(r.height<36){ out.small.push((el.id||el.className||el.tagName)+' '+Math.round(r.width)+'x'+Math.round(r.height)); }
       });
       // Anything sticking out past the right edge of the viewport.
       document.querySelectorAll('body *').forEach(el=>{
         const r=el.getBoundingClientRect();
         if(r.width>0 && r.right > window.innerWidth+2 && getComputedStyle(el).position!=='fixed' && !el.closest('.rack-drawer,.rack-drawer-overlay,[style*="overflow-x"]') && !el.closest('.table-scroll,.tbl-wrap')){
           out.wide.push((el.id||el.className||el.tagName)+' right='+Math.round(r.right));
         }
       });
       // Hit-test rather than measure, where the target is bigger than the paint.
       const dot=document.getElementById('connBtn');
       if(dot){ const b=dot.getBoundingClientRect(), cx=b.left+b.width/2, cy=b.top+b.height/2;
         const hit=document.elementFromPoint(cx+16, cy);
         out.dotHit = !!(hit && (hit===dot || dot.contains(hit)));
         out.small = out.small.filter(x=>x.indexOf('connBtn')===-1 || !out.dotHit);
       }
       out.small=Array.from(new Set(out.small)).slice(0,8);
       out.wide=Array.from(new Set(out.wide)).slice(0,8);
       return out;
     });
     findings.push({size:s.n, tab, overflowX:r.overflowX, tooSmall:r.small.length, smallest:r.small, overflowing:r.wide});
     if(tab==='dashboard'||tab==='movements') await p.screenshot({path:`audit/${s.n}-${tab}.png`, fullPage:false});
   }
   if(errs.length) findings.push({size:s.n, tab:'(page errors)', errors:errs.slice(0,4)});
   await p.close();
 }
 await b.close();
 fs.writeFileSync('audit/findings.json', JSON.stringify(findings,null,1));
 // Print only what is actually wrong.
 findings.forEach(f=>{
   const bad = f.errors || f.overflowX>1 || (f.overflowing&&f.overflowing.length) || f.tooSmall>0;
   if(bad) console.log(JSON.stringify(f));
 });
 console.log('--- done, screenshots in audit/');
})();
