"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // ГЛАВНЫЙ КЛЮЧ АКАДЕМИИ — ДОЛЖЕН БЫТЬ ОДИН И ТОТ ЖЕ ДЛЯ ВСЕХ КУРСОВ
  const STATE_KEY = "samostroy_academy_state_v1";

  // ЛОКАЛЬНЫЙ КЛЮЧ ПРОГРЕССА КУРСА «МАСШТАБУВАННЯ»
  const SCALE_KEY = "sa_scale_progress_v1";

  // ID КУРСА В АКАДЕМИИ
  const COURSE_ID = "scale_up";

  // ===== MODULES (12 lessons total) =====
  const MODULES = [
    {
      id:"m1",
      title:"Система бізнесу",
      lessons:[
        {id:"m1l1", title:"Що таке система та чому без неї немає росту", url:"m1l1.html"},
        {id:"m1l2", title:"Як правильно будувати процеси", url:"m1l2.html"}
      ]
    },
    {
      id:"m2",
      title:"Масштабування товарів",
      lessons:[
        {id:"m2l1", title:"Як вибирати продукти під масштаб", url:"m2l1.html"},
        {id:"m2l2", title:"Аналіз конверсій та точок росту", url:"m2l2.html"},
        {id:"m2l3", title:"Оптимізація SKU перед масштабуванням", url:"m2l3.html"}
      ]
    },
    {
      id:"m3",
      title:"Команда та процеси",
      lessons:[
        {id:"m3l1", title:"Кого наймати першим?", url:"m3l1.html"},
        {id:"m3l2", title:"Мотивація команди", url:"m3l2.html"},
        {id:"m3l3", title:"Автоматизація задач", url:"m3l3.html"}
      ]
    },
    {
      id:"m4",
      title:"Трафік та реклама",
      lessons:[
        {id:"m4l1", title:"Огляд каналів трафіку", url:"m4l1.html"},
        {id:"m4l2", title:"Як масштабувати рекламу без ризиків", url:"m4l2.html"}
      ]
    },
    {
      id:"m5",
      title:"Фінанси та контроль",
      lessons:[
        {id:"m5l1", title:"Контроль грошей у бізнесі", url:"m5l1.html"},
        {id:"m5l2", title:"Фінансова модель масштабування", url:"m5l2.html"}
      ]
    }
  ];

  const TOTAL = MODULES.reduce((sum,m)=>sum + m.lessons.length,0);

  // ===== BADGES LOCAL (ONLY for display, NOT saved globally) =====
  const BADGES = [
    {id:"sc_start", name:"Перший урок", icon:"award", desc:"Ти розпочав(ла) курс «Масштабування».", check:(n,p)=>n>=1},
    {id:"sc_25",    name:"25% курсу", icon:"gauge", desc:"Чверть курсу позаду!", check:(n,p)=>p>=25},
    {id:"sc_50",    name:"50% курсу", icon:"gauge", desc:"Половина шляху!", check:(n,p)=>p>=50},
    {id:"sc_75",    name:"75% курсу", icon:"gauge", desc:"Ти близько до фіналу!", check:(n,p)=>p>=75},
    {id:"sc_done",  name:"Курс завершено!", icon:"trophy", desc:"Ти опанував(ла) масштабування!", check:(n,p)=>p>=100}
  ];

  // ===== Elements =====
  const yearEl = document.getElementById("scYear");
  const headerName = document.getElementById("scHeaderName");
  const headerAvatar = document.getElementById("scHeaderAvatar");
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
    try{
      return JSON.parse(localStorage.getItem(STATE_KEY));
    }catch(e){
      return null;
    }
  }

  function loadProgress(){
    try{
      const raw = JSON.parse(localStorage.getItem(SCALE_KEY));
      if(raw && Array.isArray(raw.lessons)) return raw;
      return {lessons:[]};
    }catch(e){
      return {lessons:[]};
    }
  }

  function saveProgress(data){
    localStorage.setItem(SCALE_KEY, JSON.stringify(data));
  }

  // INIT
  let academy = loadAcademy() || {
    profile:{name:"Студент", avatarId:"rocket"},
    courses:{},
    activeCourseId:COURSE_ID
  };

  if(!academy.courses[COURSE_ID]){
    academy.courses[COURSE_ID] = {
      id:COURSE_ID,
      started:false,
      completed:false,
      progress:0
    };
  }

  let progress = loadProgress();
  const doneSet = new Set(progress.lessons);

  yearEl.textContent = new Date().getFullYear();

  // ===== PROFILE HEADER =====
  function renderProfile(){
    headerName.textContent = academy.profile.name;

    let icon = "rocket";
    if(academy.profile.avatarId === "ninja") icon = "sword";
    else if(academy.profile.avatarId === "lion") icon = "flame";

    headerAvatar.innerHTML = `<i data-lucide="${icon}"></i>`;

    const pct = academy.courses[COURSE_ID].progress;
    heroXp.textContent = `${pct} / 100 XP`;

    heroLevel.textContent =
        pct >= 80 ? "Лідер"
      : pct >= 40 ? "Системний"
      : "Новачок";
  }

  // ===== COURSE PROGRESS =====
  function updateCourseProgress(){
    const done = doneSet.size;
    const pct = Math.round((done / TOTAL) * 100);

    let course = academy.courses[COURSE_ID];
    course.started = done > 0;
    course.completed = pct >= 100;
    course.progress = pct;

    localStorage.setItem(STATE_KEY, JSON.stringify(academy));
    return {done, pct};
  }

  function renderProgress(){
    const {done, pct} = updateCourseProgress();

    progressValue.textContent = pct + "%";
    progressBar.style.width = pct + "%";

    progressDetails.textContent = `${done} / ${TOTAL} уроків`;

    if(pct === 0){
      progressSub.textContent = "Почни рухатися вперед.";
      progressHint.textContent = "Системність — основа масштабу.";
    } else if(pct < 100){
      progressSub.textContent = "Продовжуй!";
      progressHint.textContent = "Ти формуєш навички, які множать оборот.";
    } else {
      progressSub.textContent = "Курс завершено!";
      progressHint.textContent = "Тепер ти розумієш, як масштабувати бізнес.";
    }
  }

  // ===== BADGES LOCAL RENDER =====
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

  // ===== MODULES & LESSONS =====
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
            <button class="cd-btn-lesson ${finished?"cd-btn-lesson-done":""}">
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
