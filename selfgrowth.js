"use strict";

document.addEventListener("DOMContentLoaded", () => {

  const STATE_KEY = "samostroy_academy_state_v1";
  const SG_KEY = "sa_selfgrowth_progress_v1";
  const COURSE_ID = "selfgrowth";

  // ===== MODULES (10 уроків) =====
  const MODULES = [
    {
      id:"m1",
      title:"Внутрішня опора",
      lessons:[
        {id:"m1l1", title:"Що таке внутрішня сила?", url:"m1l1.html"},
        {id:"m1l2", title:"Емоційна стабільність", url:"m1l2.html"},
        {id:"m1l3", title:"Як тримати себе в балансі", url:"m1l3.html"}
      ]
    },
    {
      id:"m2",
      title:"Дисципліна та звички",
      lessons:[
        {id:"m2l1", title:"Будівництво дисципліни", url:"m2l1.html"},
        {id:"m2l2", title:"Звички, які змінюють життя", url:"m2l2.html"},
        {id:"m2l3", title:"Сила маленьких кроків", url:"m2l3.html"}
      ]
    },
    {
      id:"m3",
      title:"Фокус і продуктивність",
      lessons:[
        {id:"m3l1", title:"Управління увагою", url:"m3l1.html"},
        {id:"m3l2", title:"Як працювати в стані потоку", url:"m3l2.html"}
      ]
    },
    {
      id:"m4",
      title:"Мислення та розвиток",
      lessons:[
        {id:"m4l1", title:"Гнучке мислення", url:"m4l1.html"},
        {id:"m4l2", title:"Як вчитись швидше та глибше", url:"m4l2.html"}
      ]
    }
  ];

  const TOTAL = MODULES.reduce((s,m)=>s + m.lessons.length,0);

  // ===== BEДЖІ =====
  const BADGES = [
    {id:"sg_start", name:"Старт розвитку", icon:"award", desc:"Ти почав(ла) роботу над собою.", check:(n,p)=>n>=1},
    {id:"sg_25",    name:"Перший прорив", icon:"gauge", desc:"Ти опанував(ла) перші навички.", check:(n,p)=>p>=25},
    {id:"sg_50",    name:"Середина шляху", icon:"gauge", desc:"Внутрішні зміни вже помітні.", check:(n,p)=>p>=50},
    {id:"sg_75",    name:"Сила всередині", icon:"gauge", desc:"Ти близько до нової версії себе.", check:(n,p)=>p>=75},
    {id:"sg_done",  name:"Саморозвиток завершено", icon:"trophy", desc:"Ти став(ла) сильнішим зсередини.", check:(n,p)=>p>=100}
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

  // ===== LOAD STATES =====
  function loadAcademy(){
    try{ return JSON.parse(localStorage.getItem(STATE_KEY)); }
    catch(e){ return null; }
  }

  function loadProgress(){
    try{
      const raw = JSON.parse(localStorage.getItem(SG_KEY));
      if(raw && Array.isArray(raw.lessons)) return raw;
      return {lessons:[]};
    }catch(e){
      return {lessons:[]};
    }
  }

  function saveProgress(p){
    localStorage.setItem(SG_KEY, JSON.stringify(p));
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
      pct >= 80 ? "Сильний"
    : pct >= 40 ? "Сформований"
    : "Новачок";

    heroLevel.textContent = level;

    const lvl = Math.max(1, Math.floor((pct||0)/25)+1);
    headerStatus.textContent = `${level} • lvl ${lvl}`;

    lucide.createIcons();
  }

  // ===== UPDATE PROGRESS =====
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
      progressSub.textContent = "Почни шлях до кращої версії себе.";
      progressHint.textContent = "Внутрішні зміни починаються з першого кроку.";
    } else if(pct < 100){
      progressSub.textContent = "Продовжуй!";
      progressHint.textContent = "Ти закладаєш внутрішній фундамент сили.";
    } else {
      progressSub.textContent = "Курс завершено!";
      progressHint.textContent = "Ти став(ла) сильнішою особистістю.";
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

  // ===== MODULES RENDER =====
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
