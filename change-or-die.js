"use strict";

document.addEventListener("DOMContentLoaded", () => {

  const STATE_KEY = "samostroy_academy_state_v1";
  const COD_KEY = "sa_change_or_die_progress_v1";
  const COURSE_ID = "change_or_die";

  const MODULES = [
    {
      id:"m1",
      title:"Радикальна ревізія життя",
      lessons:[
        {id:"m1l1", title:"Що у твоєму житті «мертве» і не працює", url:"m1l1.html"},
        {id:"m1l2", title:"Ворог змін — комфорт і старі моделі", url:"m1l2.html"},
        {id:"m1l3", title:"Формування нової точки відліку", url:"m1l3.html"}
      ]
    },
    {
      id:"m2",
      title:"Сміливі рішення",
      lessons:[
        {id:"m2l1", title:"Як приймати рішення, що лякають", url:"m2l1.html"},
        {id:"m2l2", title:"Радикальна чесність із собою", url:"m2l2.html"},
        {id:"m2l3", title:"Рух проти страху", url:"m2l3.html"}
      ]
    },
    {
      id:"m3",
      title:"Перезбірка себе та бізнесу",
      lessons:[
        {id:"m3l1", title:"Створення нової моделі дій", url:"m3l1.html"},
        {id:"m3l2", title:"Система, яка не дозволяє скотитися назад", url:"m3l2.html"}
      ]
    }
  ];

  const TOTAL = MODULES.reduce((sum,m)=>sum + m.lessons.length,0);

  const BADGES = [
    {id:"cod_start", name:"Перший радикальний крок", icon:"zap", desc:"Ти розпочав шлях радикальних змін.", check:(n,p)=>n>=1},
    {id:"cod_25", name:"25% змін", icon:"gauge", desc:"Ти вже відчуваєш трансформацію.", check:(n,p)=>p>=25},
    {id:"cod_50", name:"50% шляху", icon:"gauge", desc:"Ти ламаєш старі моделі.", check:(n,p)=>p>=50},
    {id:"cod_75", name:"75% — нове життя поруч", icon:"gauge", desc:"Ти майже перезібрав себе.", check:(n,p)=>p>=75},
    {id:"cod_done", name:"Народження нового себе", icon:"flame", desc:"Ти пройшов курс повністю.", check:(n,p)=>p>=100}
  ];

  // ===== Elements =====
  const yearEl = document.getElementById("scYear");
  const headerName = document.getElementById("scHeaderName");
  const headerAvatar = document.getElementById("scHeaderAvatar");
  const headerStatus = document.getElementById("scHeaderStatus");

  const heroLevel = document.getElementById("scHeroLevel");
  const heroXp = document.getElementById("scHeroXp");

  const progressValue = document.getElementById("scProgressValue");
  const progressBar = document.getElementById("scProgressBar");
  const progressSub = document.getElementById("scProgressSub");
  const progressDetails = document.getElementById("scProgressDetails");
  const progressHint = document.getElementById("scProgressHint");

  const badgesGrid = document.getElementById("scBadgesGrid");
  const badgesCount = document.getElementById("scBadgesCount");

  const modulesList = document.getElementById("scModulesList");

  // ===== LOAD =====
  function loadAcademy(){
    try{ return JSON.parse(localStorage.getItem(STATE_KEY)); }
    catch(e){ return null; }
  }

  function loadProgress(){
    try{
      const raw = JSON.parse(localStorage.getItem(COD_KEY));
      if(raw && Array.isArray(raw.lessons)) return raw;
      return {lessons:[]};
    }catch(e){
      return {lessons:[]};
    }
  }

  function saveProgress(p){
    localStorage.setItem(COD_KEY, JSON.stringify(p));
  }

  let academy = loadAcademy() || {
    profile:{name:"Студент", avatarId:"rocket"},
    courses:{},
    achievements:{},
    activeCourseId:COURSE_ID
  };

  if(!academy.courses[COURSE_ID]){
    academy.courses[COURSE_ID] = {
      id:COURSE_ID,
      started:false,
      completed:false,
      progress:0,
      lessonsDone:0,
      lessonsTotal:TOTAL
    };
  }

  academy.activeCourseId = COURSE_ID;
  localStorage.setItem(STATE_KEY, JSON.stringify(academy));

  let progress = loadProgress();
  const doneSet = new Set(progress.lessons);

  yearEl.textContent = new Date().getFullYear();

  // ===== PROFILE =====
  function renderProfile(){
    headerName.textContent = academy.profile.name;

    let icon = "rocket";
    if(academy.profile.avatarId === "ninja") icon = "sword";
    else if(academy.profile.avatarId === "lion") icon = "flame";

    headerAvatar.innerHTML = `<i data-lucide="${icon}"></i>`;

    const pct = academy.courses[COURSE_ID].progress;
    heroXp.textContent = `${pct} / 100 XP`;

    const level =
      pct >= 80 ? "Трансформатор"
    : pct >= 40 ? "Сміливець"
    : "Новачок";

    heroLevel.textContent = level;
    headerStatus.textContent = `${level} • lvl ${Math.max(1, Math.floor((pct||0)/25)+1)}`;

    lucide.createIcons();
  }

  // ===== PROGRESS =====
  function updateProgress(){
    const done = doneSet.size;
    const pct = Math.round((done / TOTAL) * 100);

    let c = academy.courses[COURSE_ID];
    c.started = done > 0;
    c.completed = pct >= 100;
    c.progress = pct;
    c.lessonsDone = done;
    c.lessonsTotal = TOTAL;

    localStorage.setItem(STATE_KEY, JSON.stringify(academy));
    return {done, pct};
  }

  function renderProgress(){
    const {done, pct} = updateProgress();

    progressValue.textContent = pct + "%";
    progressBar.style.width = pct + "%";
    progressDetails.textContent = `${done} / ${TOTAL} уроків`;

    if(pct === 0){
      progressSub.textContent = "Перший крок — найважчий.";
      progressHint.textContent = "Трансформація починається тут.";
    } else if(pct < 100){
      progressSub.textContent = "Рухайся далі!";
      progressHint.textContent = "Ти ламаєш старі обмеження.";
    } else {
      progressSub.textContent = "Курс завершено!";
      progressHint.textContent = "Ласкаво просимо у нову версію себе.";
    }
  }

  // ===== BADGES =====
  function renderBadges(){
    badgesGrid.innerHTML = "";

    const done = doneSet.size;
    const pct = academy.courses[COURSE_ID].progress;

    let count = 0;

    BADGES.forEach(b=>{
      const earned = b.check(done,pct);
      if(earned) count++;

      const card = document.createElement("div");
      card.className = "cd-badge-card" + (earned ? " cd-badge-earned" : "");

      card.innerHTML = `
        <div class="cd-badge-icon"><i data-lucide="${b.icon}"></i></div>
        <div class="cd-badge-name">${b.name}</div>
        <div class="cd-badge-desc">${b.desc}</div>
      `;

      badgesGrid.appendChild(card);
    });

    badgesCount.textContent = `${count} / ${BADGES.length} бейджів`;

    lucide.createIcons();
  }

  // ===== MODULES =====
  function renderModules(){
    modulesList.innerHTML = "";

    MODULES.forEach((module, mi)=>{
      const box = document.createElement("div");
      box.className = "cd-module-card";

      const done = module.lessons.filter(l=>doneSet.has(l.id)).length;
      const total = module.lessons.length;

      box.innerHTML = `
        <div class="cd-module-header">
          <div class="cd-module-title">${module.title}</div>
          <div class="cd-module-progress-pill ${done===total?"cd-module-progress-pill-done":""}">
            ${done}/${total} уроків
          </div>
        </div>

        <div class="cd-lessons-list"></div>
      `;

      const list = box.querySelector(".cd-lessons-list");

      module.lessons.forEach((lesson, li)=>{
        const finished = doneSet.has(lesson.id);

        const row = document.createElement("div");
        row.className = "cd-lesson-row" + (finished ? " cd-lesson-row-done" : "");

        row.innerHTML = `
          <div class="cd-lesson-main">
            <div class="cd-lesson-index">${li+1}</div>
            <div>
              <div class="cd-lesson-title">${lesson.title}</div>
              <div class="cd-lesson-meta">Модуль ${mi+1}</div>
            </div>
          </div>

          <div class="cd-lesson-actions">
            <button class="cd-btn-lesson ${finished ? "cd-btn-lesson-done" : ""}">
              <i data-lucide="${finished?"check":"check-circle"}"></i>
              ${finished?"Відмінити":"Позначити"}
            </button>
          </div>
        `;

        row.addEventListener("click", (e)=>{
          if(!e.target.closest(".cd-btn-lesson")){
            if(lesson.url) window.location.href = lesson.url;
          }
        });

        row.querySelector(".cd-btn-lesson").addEventListener("click", (e)=>{
          e.stopPropagation();
          toggleLesson(lesson.id);
        });

        list.appendChild(row);
      });

      modulesList.appendChild(box);
    });

    lucide.createIcons();
  }

  // ===== TOGGLE =====
  function toggleLesson(id){
    if(doneSet.has(id)) doneSet.delete(id);
    else doneSet.add(id);

    progress.lessons = Array.from(doneSet);
    saveProgress(progress);

    renderAll();
  }

  // ===== RENDER ALL =====
  function renderAll(){
    renderProfile();
    renderProgress();
    renderBadges();
    renderModules();
  }

  renderAll();
});


