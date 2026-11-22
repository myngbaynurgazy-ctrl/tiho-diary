const $ = (id) => document.getElementById(id);
const story = $('story'), songInput = $('songInput'), photoInput = $('photoInput');
const palettes = {
  'Тихое': { colors: ['#bdc6ad','#9da98d','#73836f','#394c45'], label: 'приглушённая палитра, много воздуха', icon:'☁' },
  'Светлое': { colors: ['#dedc78','#c6c45a','#929b4e','#465d4d'], label: 'мягкие поля и рассеянный свет', icon:'☀' },
  'Волнительное': { colors: ['#d9c766','#b0a343','#777d4e','#343f3c'], label: 'контрастные слои и короткий ритм', icon:'〰' },
  'Тёплое': { colors: ['#d8c077','#b99b5a','#8a8250','#455a49'], label: 'тёплые оттенки бумаги и плавные переходы', icon:'♡' },
  'Своё': { colors: ['#c4c881','#a5ad61','#7d8b58','#3d5148'], label: 'смешанная палитра и свободная композиция', icon:'✳' }
};
let selectedMood = 'Светлое', photos = [], memories = [];
try { memories = JSON.parse(localStorage.getItem('tiho-memories') || '[]'); } catch { memories = []; }

function dateParts(date = new Date()) {
  return { short: new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(date),
    full: new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(date),
    day: new Intl.DateTimeFormat('ru-RU',{weekday:'long'}).format(date) };
}
function inferTitle(text) {
  const clean = text.replace(/https?:\/\/\S+/g,'').trim();
  if (!clean) return 'День в нескольких кадрах';
  const words = clean.split(/\s+/).filter(Boolean).slice(0, 6).join(' ');
  return words.replace(/[.,;:!?]+$/,'') || 'День в нескольких кадрах';
}
function parseSong(value = '') {
  const parts = value.split('|').map(part => part.trim());
  const url = parts.slice(1).join('|') || value.match(/https?:\/\/\S+/)?.[0] || '';
  const title = parts.length > 1 ? parts[0] : (url ? value.replace(url, '').trim() || url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : value);
  return { title: title.trim(), url: url.trim() };
}
function updatePreview() {
  const text = story.value.trim(), first = text.split(/[.!?\n]/)[0].trim();
  $('previewCaption').textContent = first ? (first.length > 76 ? `${first.slice(0,73)}…` : first) : 'Иногда лучший план — никуда не торопиться.';
  $('previewMood').textContent = `${palettes[selectedMood].icon} ${selectedMood.toLowerCase()} настроение`;
  const date = dateParts(); $('previewDate').textContent = date.short; $('previewWeekday').textContent = date.day;
  $('todayDate').textContent = date.full.toLocaleUpperCase('ru-RU');
  const song = parseSong(songInput.value.trim()); $('previewSong').textContent = song.title || 'Твоя песня появится здесь';
  $('songLink').href = song.url || '#'; $('songLink').classList.toggle('disabled-link', !song.url);
  $('previewSongEffect').textContent = 'станет частью воспоминания';
  const palette = palettes[selectedMood].colors;
  $('previewImage').style.setProperty('--tone-a',palette[0]); $('previewImage').style.setProperty('--tone-b',palette[1]); $('previewImage').style.setProperty('--tone-c',palette[2]); $('previewImage').style.setProperty('--tone-d',palette[3]);
  $('previewImage').classList.toggle('has-photo', !!photos[0]);
  if (photos[0]) $('previewImage').style.backgroundImage = `url("${photos[0]}")`; else $('previewImage').style.backgroundImage = '';
  const length = text.length, fast = /срочн|бежал|успел|громк|спеш|дедлайн|танц|быстр/i.test(`${text} ${song}`);
  $('previewImage').style.setProperty('--pace', `${Math.max(0.25, Math.min(1, length / 180))}`);
  $('previewImage').classList.toggle('quick-rhythm', length > 180 || fast);
  $('wordCount').textContent = `${story.value.length} / 500`;
}
story.addEventListener('input', updatePreview); songInput.addEventListener('input', updatePreview);
document.querySelectorAll('.mood').forEach(button => button.addEventListener('click', () => {
  document.querySelector('.mood.selected')?.classList.remove('selected'); button.classList.add('selected'); selectedMood = button.dataset.mood; updatePreview();
}));
document.querySelector('.mood[data-mood="Светлое"]').classList.add('selected');

photoInput.addEventListener('change', async () => {
  const files = [...photoInput.files].slice(0, 10 - photos.length);
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const src = await compressPhoto(file);
    photos.push(src);
  }
  renderPhotos(); updatePreview(); photoInput.value = '';
});
function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    const image = new Image(), url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url); resolve(canvas.toDataURL('image/jpeg', .78));
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось открыть фото')); };
    image.src = url;
  });
}
function renderPhotos() {
  $('photoPreviews').replaceChildren(...photos.map((src, i) => { const img = document.createElement('img'); img.src = src; img.className = 'photo-thumb'; img.title = 'Нажми, чтобы убрать'; img.alt = `Кадр ${i+1}`; img.onclick = () => { photos.splice(i, 1); renderPhotos(); updatePreview(); }; return img; }));
}
function addSong() { songInput.focus(); updatePreview(); if (songInput.value.trim()) $('songTip').innerHTML = '<span>♫</span> Песня останется рядом<br>с этим воспоминанием.'; }
$('songAdd').addEventListener('click', addSong); songInput.addEventListener('keydown', e => { if (e.key === 'Enter') addSong(); });
function saveMemories() { try { localStorage.setItem('tiho-memories', JSON.stringify(memories)); return true; } catch { toast('Не удалось сохранить: уменьши число или размер фотографий'); return false; } }
function toast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2500); }
$('createMemory').addEventListener('click', () => {
  const text = story.value.trim(), songInputValue = songInput.value.trim(), song = parseSong(songInputValue);
  if (!text) { story.focus(); toast('Расскажи хотя бы пару слов о дне'); return; }
  if (!photos.length) { photoInput.click(); toast('Добавь хотя бы один кадр дня'); return; }
  if (!songInputValue) { songInput.focus(); toast('Добавь песню или ссылку на неё'); return; }
  const now = new Date(), parts = dateParts(now);
  memories.unshift({ id: Date.now(), date: now.toISOString(), displayDate: parts.short, dayName: parts.day, title: inferTitle(text), story:text, mood:selectedMood, song:song.title, songUrl:song.url, quickRhythm: text.length > 180 || /срочн|бежал|успел|громк|спеш|дедлайн|танц|быстр/i.test(`${text} ${songInputValue}`), photos:[...photos] });
  if (!saveMemories()) { memories.shift(); return; }
  updateCounts(); toast('День сохранён в архиве ✨');
  story.value = ''; songInput.value = ''; photos = []; selectedMood = 'Светлое'; document.querySelector('.mood.selected')?.classList.remove('selected'); document.querySelector('[data-mood="Светлое"]').classList.add('selected'); renderPhotos(); updatePreview(); $('songTip').innerHTML = '<span>♪</span> Одной ноты иногда достаточно,<br>чтобы вспомнить целый вечер.';
});
function updateCounts() { $('todayCount').textContent = memories.length; $('memoryCount').textContent = memories.length; }
function showToday() { $('todayView').classList.remove('hidden'); $('archiveView').classList.add('hidden'); $('crumb').textContent='Сегодня'; $('pageTitle').innerHTML='День, который<br><em>хочется оставить.</em>'; $('pageIntro').textContent='Не обязательно помнить всё. Достаточно сохранить то, что чувствовалось.'; $('navToday').classList.add('active'); $('navArchive').classList.remove('active'); }
function showArchive() { $('todayView').classList.add('hidden'); $('archiveView').classList.remove('hidden'); $('crumb').textContent='Архив воспоминаний'; $('pageTitle').innerHTML='Всё, что осталось<br><em>с тобой.</em>'; $('pageIntro').textContent='Каждый день — отдельная маленькая вселенная.'; $('navToday').classList.remove('active'); $('navArchive').classList.add('active'); renderArchive(); }
$('navToday').addEventListener('click', showToday); $('navArchive').addEventListener('click', showArchive); $('backToToday').addEventListener('click', showToday);
function renderArchive() {
  const grid = $('archiveGrid'); grid.replaceChildren(); $('emptyArchive').classList.toggle('hidden', memories.length > 0);
  memories.forEach(memory => {
    const card = document.createElement('article'); card.className='archive-card'; card.tabIndex=0; card.setAttribute('role','button');
    const cover = document.createElement('div'); cover.className=`archive-card-image mood-${moodKey(memory.mood)}${memory.quickRhythm ? ' quick-rhythm' : ''}`; if (memory.photos?.[0]) cover.style.backgroundImage=`url("${memory.photos[0]}")`;
    const title = document.createElement('span'); title.textContent=memory.title || inferTitle(memory.story); cover.append(title);
    const body = document.createElement('div'); body.className='archive-card-body';
    const date = document.createElement('div'); date.className='archive-card-date'; date.textContent=`${memory.displayDate} · ${memory.dayName}`;
    const desc = document.createElement('p'); desc.textContent=memory.story;
    const tags = document.createElement('div'); tags.className='archive-card-tags'; const mood=document.createElement('span'); mood.textContent=`${palettes[memory.mood]?.icon || '✳'} ${memory.mood}`; const song=document.createElement('span'); song.textContent='♫ песня'; tags.append(mood,song);
    body.append(date,desc,tags); card.append(cover,body); card.addEventListener('click',()=>openMemory(memory)); card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')openMemory(memory)}); grid.append(card);
  });
}
function moodKey(mood='Светлое') { return ({'Тихое':'quiet','Светлое':'bright','Волнительное':'charged','Тёплое':'warm','Своё':'custom'})[mood] || 'bright'; }
function openMemory(m) {
  const hero = document.createElement('div'); hero.className=`modal-hero mood-${moodKey(m.mood)}${m.quickRhythm ? ' quick-rhythm' : ''}`; if (m.photos?.[0]) hero.style.backgroundImage=`url("${m.photos[0]}")`;
  const title = document.createElement('span'); title.textContent=m.title || inferTitle(m.story); hero.append(title);
  const date=document.createElement('div');date.className='modal-date';date.textContent=`${m.displayDate} · ${m.dayName}`;
  const h=document.createElement('h2');h.textContent='Так ощущался этот день';
  const text=document.createElement('div');text.className='modal-story';text.textContent=m.story;
  const savedSong=m.song || 'без названия';
  const meta=document.createElement('div');meta.className='modal-meta';meta.textContent=`${palettes[m.mood]?.icon || '✳'} ${m.mood}   ·   ♫ ${savedSong}`;
  const songUrl=m.songUrl || savedSong.match(/https?:\/\/\S+/)?.[0]; if(songUrl){const link=document.createElement('a');link.href=songUrl;link.target='_blank';link.rel='noopener';link.className='memory-song-link';link.textContent='Открыть песню ↗';meta.append(document.createElement('br'),link);}
  const gallery=document.createElement('div');gallery.className='modal-gallery';(m.photos||[]).forEach((src,i)=>{const img=document.createElement('img');img.src=src;img.alt=`Кадр ${i+1}`;gallery.append(img);});
  $('modalBody').replaceChildren(hero,date,h,text,meta,gallery);$('memoryModal').classList.remove('hidden');
}
$('modalClose').addEventListener('click',()=>$('memoryModal').classList.add('hidden'));
$('memoryModal').addEventListener('click',e=>{if(e.target===$('memoryModal'))$('memoryModal').classList.add('hidden')});
$('newCollection').addEventListener('click',()=>toast('Сначала сохрани несколько дней — коллекции появятся в архиве'));
$('helpButton')?.addEventListener('click',()=>$('methodModal').classList.remove('hidden'));
$('navHow')?.addEventListener('click',()=>$('methodModal').classList.remove('hidden'));
$('loginButton')?.addEventListener('click',()=>toast('Это личный дневник — записи хранятся в этом браузере'));
$('searchButton')?.addEventListener('click',showArchive);
$('methodClose').addEventListener('click',()=>$('methodModal').classList.add('hidden'));
$('methodModal').addEventListener('click',e=>{if(e.target===$('methodModal'))$('methodModal').classList.add('hidden')});
$('weatherEdit').addEventListener('click',()=>{const value=prompt('Какая сегодня погода внутри? Например: дождь и спокойствие');if(value)$('weatherLabel').textContent=value;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('methodModal').classList.add('hidden');$('memoryModal').classList.add('hidden');}});
$('createMemory').setAttribute('aria-label','Сохранить воспоминание в архив');
updateCounts(); updatePreview();

function initTouchWaves() {
  const canvas = $('waveCanvas'), section = canvas?.parentElement;
  if (!canvas || !section) return;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const pointer = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, strength: 0 };
  let width = 0, height = 0, frame = 0;
  const resize = () => {
    const rect = section.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const move = event => {
    const rect = section.getBoundingClientRect();
    pointer.targetX = event.clientX - rect.left; pointer.targetY = event.clientY - rect.top;
    pointer.strength = 1;
  };
  const leave = () => { pointer.strength = 0; pointer.targetX = -1000; pointer.targetY = -1000; };
  section.addEventListener('pointermove', move, { passive: true });
  section.addEventListener('pointerdown', move, { passive: true });
  section.addEventListener('pointerleave', leave, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  resize();
  const colors = ['rgba(155,188,150,.62)','rgba(207,204,112,.55)','rgba(149,177,135,.34)','rgba(210,207,128,.28)'];
  const draw = time => {
    ctx.clearRect(0, 0, width, height);
    pointer.x += (pointer.targetX - pointer.x) * .12; pointer.y += (pointer.targetY - pointer.y) * .12;
    pointer.strength *= .986;
    const step = Math.max(5, width / 240), radius = Math.max(130, width * .15);
    for (let wave = 0; wave < colors.length; wave++) {
      ctx.beginPath(); ctx.strokeStyle = colors[wave]; ctx.lineWidth = wave === 1 ? 1.45 : 1;
      for (let x = -4; x <= width + 4; x += step) {
        const base = height * (.43 + wave * .105) + Math.sin(x * .006 + time * .00035 + wave * .8) * (17 + wave * 3);
        const dx = x - pointer.x, dy = base - pointer.y;
        const influence = Math.exp(-(dx * dx) / (radius * radius)) * Math.exp(-(dy * dy) / 25000) * pointer.strength;
        const ripple = Math.sin(Math.abs(dx) * .035 - time * .012 + wave) * influence * 25;
        const y = base + ripple;
        if (x < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else frame = requestAnimationFrame(draw);
  });
}
initTouchWaves();
