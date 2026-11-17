(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let motion = !reduce.matches;
  let ticking = false;
  let metrics = {};
  const hero = $('.hero'), ritual = $('.ritual'), gallery = $('.atmosphere');
  const stage = $('.hero-stage'), ritualStage = $('.ritual-stage'), galleryStage = $('.gallery-stage');
  const word = $('.cinema-title'), heroPhoto = $('.cinema-photo'), heroCopy = $('.cinema-copy');
  const heroSeal = $('.cinema-seal'), heroLight = $('.cinema-light');
  const ritualPhoto = $('.ritual-photo'), ritualImage = $('.ritual-photo img'), ritualType = $('.ritual-type');
  const stamp = $('.craft-stamp'), track = $('.gallery-track'), galleryImages = $$('.gallery-card img');
  const progress = $('.scroll-progress'), galleryProgress = $('.gallery-progress i'), dock = $('.mobile-dock');
  const spins = $$('.spin-scroll');
  const clamp = (v,min=0,max=1) => Math.max(min,Math.min(max,v));
  const portion = (y, top, distance) => clamp((y-top)/Math.max(distance,1));
  function measure() {
    metrics = {
      heroTop:hero.offsetTop, heroDistance:hero.offsetHeight-stage.offsetHeight,
      ritualTop:ritual.offsetTop, ritualDistance:ritual.offsetHeight-ritualStage.offsetHeight,
      galleryTop:gallery.offsetTop, galleryDistance:gallery.offsetHeight-galleryStage.offsetHeight,
      galleryTravel:Math.max(0,track.scrollWidth-innerWidth+innerWidth*.04),
      pageHeight:document.documentElement.scrollHeight-innerHeight,
      spins:spins.map(el=>({el,top:el.getBoundingClientRect().top+scrollY}))
    };
    requestTick();
  }
  function render() {
    ticking=false;
    const y=scrollY;
    $('#header').classList.toggle('is-away',y>25);
    progress.style.transform=`scaleX(${clamp(y/Math.max(metrics.pageHeight,1))})`;
    dock.classList.toggle('is-visible',y>Math.min(innerHeight*.75,600));
    if(!motion)return;
    const h=metrics.heroDistance>1?portion(y,metrics.heroTop,metrics.heroDistance):0;
    const copyBase=innerWidth>700?(innerHeight<=730?'-34%':'-40%'):'0px';
    heroCopy.style.transform=`translate3d(0,calc(${copyBase} - ${h*(innerWidth<=700?30:55)}px),0)`;
    heroCopy.style.opacity=String(1-h*.5);
    word.style.transform=`perspective(1100px) rotateY(${-h*7}deg) translate3d(${-h*10}px,0,0) scale(${1+h*.035})`;
    heroPhoto.style.transform=`scale(${1.015+h*.1}) translate3d(${-h*1.5}%,${h*1.4}%,0)`;
    heroSeal.style.transform=`rotate(${-15+h*75}deg)`;
    heroLight.style.transform=`translate3d(${h*270}%,0,0) rotate(-22deg)`;
    const r=metrics.ritualDistance>1?portion(y,metrics.ritualTop,metrics.ritualDistance):0;
    ritualPhoto.style.transform=`translate3d(0,${30-r*60}px,0) rotate(${4-r*7}deg)`;
    ritualImage.style.transform=`scale(1.15) translate3d(0,${-3+r*6}%,0)`;
    ritualType.style.transform=`translate3d(${-r*90}px,0,0)`;
    stamp.style.transform=`rotate(${r*110}deg)`;
    $('#ritual-progress').textContent=String(Math.min(3,1+Math.floor(r*3))).padStart(2,'0');
    const g=metrics.galleryDistance>1?portion(y,metrics.galleryTop,metrics.galleryDistance):0;
    track.style.transform=`translate3d(${-g*metrics.galleryTravel}px,0,0)`;
    galleryProgress.style.transform=`scaleX(${.05+g*.95})`;
    $('#gallery-current').textContent=String(Math.min(3,1+Math.floor(g*3))).padStart(2,'0');
    galleryImages.forEach((img,i)=>{img.style.transform=`scale(1.06) translate3d(${(g-.5)*(i%2?2:-2)}%,0,0)`;});
    metrics.spins.forEach(({el,top})=>{if(top>y-innerHeight&&top<y+innerHeight*2)el.style.transform=`rotate(${(y+innerHeight-top)*.065}deg)`;});
  }
  function requestTick(){if(!ticking){ticking=true;requestAnimationFrame(render);}}
  function updateMarquee(){document.querySelector('.marquee-track').style.animationPlayState=document.hidden||!motion?'paused':'running';}
  const resetElements=[word,heroPhoto,heroCopy,heroSeal,heroLight,ritualPhoto,ritualImage,ritualType,stamp,track,...galleryImages,...spins];
  function setMotion(enabled){
    motion=enabled&&!reduce.matches;
    document.body.classList.toggle('motion-off',!motion);
    document.documentElement.style.scrollBehavior=motion?'smooth':'auto';
    const toggle=$('.motion-toggle');
    toggle.setAttribute('aria-pressed',String(motion));
    toggle.querySelector('span').textContent=motion?'АНИМАЦИЯ ВКЛ':'АНИМАЦИЯ ВЫКЛ';
    updateMarquee();
    if(!motion){resetElements.forEach(el=>el.style.removeProperty('transform'));heroCopy.style.removeProperty('opacity');}
    requestAnimationFrame(measure);
  }
  $('.motion-toggle').addEventListener('click',()=>setMotion(!motion));
  reduce.addEventListener('change',()=>setMotion(!reduce.matches));
  if(motion) document.body.classList.add('js-motion');
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}});
  },{threshold:.12,rootMargin:'0px 0px -35px 0px'});
  $$('.reveal,.line-reveal').forEach(el=>observer.observe(el));
  const menuButton=$('.menu-toggle'),nav=$('#main-nav');
  function closeMenu(){nav.classList.remove('is-open');menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Открыть меню');}
  menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';nav.classList.toggle('is-open',open);menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');});
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('is-open')){closeMenu();menuButton.focus();}});
  document.addEventListener('click',e=>{if(!$('#header').contains(e.target))closeMenu();});
  if(fine.matches){$$('.button-primary,.header-book,.cinema-book').forEach(button=>{
    button.addEventListener('pointermove',e=>{if(!motion)return;const rect=button.getBoundingClientRect();button.style.transform=`translate(${(e.clientX-rect.left-rect.width/2)*.035}px,${(e.clientY-rect.top-rect.height/2)*.06}px)`;});
    button.addEventListener('pointerleave',()=>button.style.removeProperty('transform'));
  });}
  addEventListener('scroll',requestTick,{passive:true});
  addEventListener('resize',()=>{if(innerWidth>650)closeMenu();measure();},{passive:true});
  document.addEventListener('visibilitychange',updateMarquee);
  addEventListener('load',measure,{once:true});
  document.fonts.ready.then(measure);
  $('#year').textContent=String(new Date().getFullYear());
  setMotion(motion);
  measure();
})();
