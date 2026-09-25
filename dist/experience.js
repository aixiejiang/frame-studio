(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const talents = [
    {name:'林予安',en:'YUNA LIN',code:'F / 001',image:'https://images.unsplash.com/photo-1550639524-a6f58345a2ca?auto=format&fit=crop&w=1000&q=85',tag:'自然 · 叙事 · 生活方式',height:'173 cm',city:'上海 / 杭州',languages:'普通话 / 英语',intro:'安静而有层次的镜头表达，在自然与都市之间自在切换。擅长用细微的情绪和身体语言，为品牌故事带来真实的温度。',skills:['生活方式广告','自然情绪表达','户外拍摄'],films:[{id:0,role:'概念主演 · 户外品牌片'},{id:2,role:'概念出镜 · 运动广告'}]},
    {name:'陈叙',en:'EVAN CHEN',code:'F / 002',image:'https://images.unsplash.com/photo-1508243771214-6e95d137426b?auto=format&fit=crop&w=1000&q=85',tag:'都市 · 运动 · 自由表达',height:'186 cm',city:'上海 / 北京',languages:'普通话 / 英语',intro:'兼具都市气质与运动张力。以松弛、直接的表达连接镜头，适合户外生活、运动与现代男装方向的广告叙事。',skills:['运动生活方式','时装广告','动作表现'],films:[{id:2,role:'概念主演 · 运动广告'},{id:0,role:'概念出镜 · 户外品牌片'}]},
    {name:'沈知夏',en:'IRIS SHEN',code:'F / 003',image:'https://images.unsplash.com/photo-1681500920181-0aff411f8cab?auto=format&fit=crop&w=1000&q=85',tag:'时装 · 美妆 · 鲜明态度',height:'176 cm',city:'上海 / 深圳',languages:'普通话',intro:'鲜明的轮廓与富有力量的表现力，在极简画面中建立令人记住的个性。擅长时装、都市生活与具有实验气质的视觉表达。',skills:['时装平面','美妆特写','概念影像'],films:[{id:0,role:'概念出镜 · 品牌形象广告'}]}
  ];
  const grid = document.querySelector('#talent-grid');
  const profile = document.querySelector('#talent-profile');
  grid.innerHTML = talents.map((t,i) => `<button class="talent-card" data-talent="${i}" aria-expanded="false" aria-controls="talent-profile" aria-label="查看${t.name}模特介绍"><span class="talent-photo"><img loading="lazy" src="${t.image}" alt="${t.name}概念档案的示意肖像"><span class="talent-code">${t.code}</span><span class="talent-discover">认识 ${t.en.split(' ')[0]} <b aria-hidden="true">↗</b></span></span><span class="talent-card-meta"><span><strong>${t.name}</strong><em>${t.en}</em></span><small>${t.tag}</small></span></button>`).join('');
  function showTalent(index) {
    const t = talents[index];
    if (!t) return;
    grid.querySelectorAll('button').forEach((b,i) => b.setAttribute('aria-expanded', String(i===index)));
    profile.innerHTML = `<button class="profile-close" aria-label="关闭模特介绍">✕</button><div class="profile-top"><img class="profile-portrait" src="${t.image}" alt="${t.name}概念档案的示意肖像"><div class="profile-copy"><span class="mini">TALENT PROFILE / ${t.code} / 概念资料</span><h3 id="talent-profile-name" tabindex="-1">${t.name}<small>${t.en}</small></h3><p>${t.intro}</p><div class="profile-tags">${t.skills.map(s=>`<span>${s}</span>`).join('')}</div><div class="profile-stats"><div>示范身高<b>${t.height}</b></div><div>示范工作城市<b>${t.city}</b></div><div>示范语言<b>${t.languages}</b></div></div></div></div><div class="profile-films"><div class="profile-films-head"><h4>参演广告影片 <span>(${t.films.length.toString().padStart(2,'0')})</span></h4><span>SELECTED COMMERCIALS / 概念关联</span></div><div class="model-films">${t.films.map(f=>{const w=works[f.id];return `<button class="model-film" data-project="${f.id}" aria-label="查看${t.name}参演的${w.title}"><img loading="lazy" src="${images[w.image]}" alt="${w.title}影片封面"><span><strong>${w.title} ↗</strong><small>${f.role}<br>${w.year} / ${w.duration}</small></span></button>`}).join('')}</div><a href="#contact" class="profile-contact">沟通 ${t.name} 的选角需求 <span>↗</span></a></div>`;
    profile.hidden = false;
    profile.querySelector('.profile-close').addEventListener('click',()=>{
      profile.hidden=true;
      const b=grid.querySelector(`[data-talent="${index}"]`);
      b.setAttribute('aria-expanded','false');
      b.focus({preventScroll:true});
      grid.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
    });
    profile.querySelector('.profile-contact').addEventListener('click',()=>{
      const field=document.querySelector('[name="idea"]');
      if (!field.value.trim()) field.value=`我想了解 ${t.name} 的选角合作，项目需求：`;
    });
    profile.querySelector('h3').focus({preventScroll:true});
    profile.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
  }
  grid.addEventListener('click',e=>{const b=e.target.closest('[data-talent]');if(b)showTalent(Number(b.dataset.talent));});
})();
