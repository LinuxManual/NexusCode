(()=>{
const boot=()=>{
 const landing=document.getElementById('landing'); if(!landing)return;
 const platform=landing.querySelector('#platform');
 if(platform && !document.getElementById('capabilities')){
  platform.insertAdjacentHTML('afterend',`<section id="capabilities" class="site-section capabilities-section"><div class="section-kicker">01.5 / CAPABILITIES</div><div class="cap-head"><div><h2>Everything in one<br><span>digital command center.</span></h2></div><p class="section-intro">A growing platform designed around the way modern builders actually work: create, inspect, communicate, secure and ship.</p></div><div class="cap-grid"><article><b>01</b><strong>Build</strong><span>Terminal, editor, files and developer workflows.</span></article><article><b>02</b><strong>Think</strong><span>Nexus AI interface for intelligent workflows.</span></article><article><b>03</b><strong>Connect</strong><span>Realtime community communications and presence.</span></article><article><b>04</b><strong>Protect</strong><span>Security center, authentication and monitoring.</span></article></div></section>`);
 }
 const security=landing.querySelector('#security');
 if(security && !document.getElementById('roadmap')){
  security.insertAdjacentHTML('beforebegin',`<section id="roadmap" class="site-section roadmap-section"><div class="section-kicker">02.5 / EVOLUTION</div><h2>Built to keep<br><span>getting better.</span></h2><div class="roadmap"><div class="roadmap-line"></div><article><i>NOW</i><b>NexusOS foundation</b><p>Browser desktop, terminal, virtual workspace, monitoring and core apps.</p></article><article><i>NEXT</i><b>Connected workspace</b><p>Realtime identity, communication, presence and richer collaboration.</p></article><article><i>FUTURE</i><b>Intelligent platform</b><p>Deeper AI workflows, automation and developer-focused tools.</p></article></div></section>`);
 }
 const about=landing.querySelector('#about');
 if(about && !document.getElementById('launch-panel')){
  about.insertAdjacentHTML('beforebegin',`<section id="launch-panel" class="launch-panel"><div><div class="section-kicker">NEXUS / READY</div><h2>Enter the workspace.</h2><p>Your next digital environment is one click away.</p></div><button class="hero-btn" id="upgrade-launch">Launch NexusOS <b>→</b></button></section>`);
  document.getElementById('upgrade-launch')?.addEventListener('click',()=>{landing.classList.add('hidden');document.getElementById('auth')?.classList.remove('hidden');document.getElementById('auth-user')?.focus()});
 }
 const nav=landing.querySelector('.site-nav');
 if(nav&&!nav.dataset.upgraded){nav.dataset.upgraded='1';
  const pill=document.createElement('div');pill.className='nav-live';pill.innerHTML='<i></i> SYSTEM OPERATIONAL';nav.insertBefore(pill,nav.querySelector('.nav-cta'));
 }
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.addEventListener('load',boot);
})();