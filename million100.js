"use strict";

document.addEventListener("DOMContentLoaded", () => {

  const STATE_KEY = "samostroy_academy_state_v1";
  const M100_KEY = "sa_million100_progress_v1";
  const COURSE_ID = "million100";

  // ===== MODULES (10 уроків) =====
  const MODULES = [
    {
      id:"m1",
      title:"Стратегія на 100 днів",
      lessons:[
        {id:"m1l1", title:"Формування цілі 1 000 000 грн", url:"m1l1.html"},
        {id:"m1l2", title:"Модель досягнення: шлях у цифрах", url:"m1l2.html"}
      ]
    },
    {
      id:"m2",
      title:"Система продажів",
      lessons:[
        {id:"m2l1", title:"Продукти-локомотиви", url:"m2l1.html"},
        {id:"m2l2", title:"Швидкі канали залучення клієнтів", url:"m2l2.html"},
        {id:"m2l3", title:"Формування щоденних KPI", url:"m2l3.html"}
      ]
    },
    {
      id:"m3",
      title:"Масштабування процесів",
      lessons:[
        {id:"m3l1", title:"Системи, що тримають бізнес", url:"m3l1.html"},
        {id:"m3l2", title:"Масштабування рекламних каналів", url:"m3l2.html"},
        {id:"m3l3", title:"Контроль виконання плану", url:"m3l3.html"}
      ]
    },
    {
      id:"m4",
      title:"Гроші та фінансова модель",
      lessons:[
        {id:"m4l1", title:"Як управляти грошовим потоком", url:"m4l1.html"},
        {id:"m4l2", title:"Прибутковість 1 000 000 грн", url:"m4l2.html"}
      ]
    }
  ];

  const TOTAL = MODULES.reduce((s,m)=>s + m.lessons.length,0);

  // ===== БЕЙДЖІ =====
  const BADGES = [
    {id:"m100_start", name:"Початок шляху", icon:"award", desc:"Ти стартував шлях до мільйона.", check:(n,p)=>n>=1},
    {id:"m100_25",    name:"Перші результати", icon:"gauge", desc:"Ти вже на шляху!", check:(n,p)=>p>=25},
    {id:"m100_50",    name:"Половина шляху", icon:"gauge", desc:"Вже видно перші плоди стратегії.", check:(n,p)=>p>=50},
    {id:"m100_75",    name:"Близько до мети", icon:"gauge", desc:"Ти майже досягнув своєї вершини!", check:(n,p)=>p>=75},
    {id:"m100_done",  name:"Мільйон досягнуто", icon:"trophy", desc:"Курс завершено — шлях пройдено!", check:(n,p)=>p>=100}
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
      const raw = JSON.parse(localStorage.getItem(M100_KEY));
      if(raw && Array.isArray(raw.lessons)) return raw;
      return {lessons:[]};
    }catch(e){
      return {lessons:[]};
    }
  }

  function saveProgress(p){
    localStorage.setItem(M100_KEY, JSON.stringify(p));
  }

  // INIT
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
      pct >= 80 ? "Профі"
    : pct >= 40 ? "Майстер"
    : "Новачок";

    heroLevel.textContent = level;

    const lvl = Math.max(1, Math.floor((pct||0)/25)+1);
    headerStatus.textContent = `${level} • lvl ${lvl}`;

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
      progressSub.textContent = "Стартуй до свого мільйона!";
      progressHint.textContent = "Перший крок відкриває шлях.";
    } else if(pct < 100){
      progressSub.textContent = "Продовжуй працювати!";
      progressHint.textContent = "Результат множиться кожним уроком.";
    } else {
      progressSub.textContent = "Курс завершено!";
      progressHint.textContent = "Ти оволодів(ла) стратегією до мільйона!";
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

  // ===== TOGGLE LESSON =====
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

