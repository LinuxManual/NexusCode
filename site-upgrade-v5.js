(() => {
  const root = document.querySelector('#landing'); if (!root) return;
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Command palette
  const palette = document.createElement('div');
  palette.className='nx-palette hidden';
  palette.innerHTML='<div class="nx-palette-card"><div class="nx-palette-head"><b>NEXUS COMMAND</b><kbd>ESC</kbd></div><input id="nx-command" placeholder="Search NexusCode..." autocomplete="off"><div id="nx-results"></div></div>';
  root.appendChild(palette);
  const commands=[['Platform','#platform'],['Services','#services'],['Security','#security'],['About','#about'],['Launch NexusOS','launch']];
  const input=palette.querySelector('#nx-command'), results=palette.querySelector('#nx-results');
  const render=(term='')=>{const t=term.toLowerCase();results.innerHTML=commands.filter(c=>c[0].toLowerCase().includes(t)).map((c,i)=>`<button data-cmd="${i}"><span>${c[0]}</span><kbd>↵</kbd></button>`).join('')||'<p class="nx-empty">No command found.</p>';results.querySelectorAll('button').forEach(b=>b.onclick=()=>run(+b.dataset.cmd));};
  const run=i=>{const c=commands[i];palette.classList.add('hidden');if(c[1]==='launch'){document.querySelector('#landing')?.classList.add('hidden');document.querySelector('#auth')?.classList.remove('hidden');document.querySelector('#auth-user')?.focus()}else document.querySelector(c[1])?.scrollIntoView({behavior:'smooth'});};
  const open=()=>{palette.classList.remove('hidden');input.value='';render();setTimeout(()=>input.focus(),20)};
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open()}if(e.key==='Escape')palette.classList.add('hidden')});
  input.oninput=()=>render(input.value); render();
  // Add a keyboard hint to nav without changing markup manually
  const cta=document.querySelector('.nav-cta'); if(cta) cta.insertAdjacentHTML('afterend','<button class="nx-search-btn" title="Command palette (Ctrl+K)">⌘K</button>'); document.querySelector('.nx-search-btn')?.addEventListener('click',open);
  // Counter animation for future numeric metrics
  document.querySelectorAll('[data-count]').forEach(el=>{const target=Number(el.dataset.count)||0;let start=0;const io=new IntersectionObserver(es=>es.forEach(x=>{if(!x.isIntersecting)return;const t0=performance.now();const tick=now=>{const p=Math.min(1,(now-t0)/900);el.textContent=Math.round((1-Math.pow(1-p,3))*target).toLocaleString();if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick);io.disconnect()});io.observe(el)});
})();
