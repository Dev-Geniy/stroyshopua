"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // ГЛАВНЫЙ КЛЮЧ АКАДЕМИИ — ОДИН ДЛЯ ВСІХ КУРСІВ
  const STATE_KEY = "samostroy_academy_state_v1";

  // ЛОКАЛЬНИЙ КЛЮЧ ПРОГРЕСУ КУРСУ «ЛІДЕРСТВО»
  const LEAD_KEY = "sa_lead_progress_v1";

  // ID КУРСА В АКАДЕМІЇ
  const COURSE_ID = "leadership";

  // ===== MODULES (10 lessons total) =====
  const MODULES = [
    {
      id:"m1",
      title:"Основи лідерства",
      lessons:[
        {id:"m1l1", title:"Хто такий лідер і як формується вплив", url:"m1l1.html"},
        {id:"m1l2", title:"Лідерське мислення: як мислять сильні керівники", url:"m1l2.html"},
        {id:"m1l3", title:"Внутрішня сила: цінності та особисті принципи", url:"m1l3.html"}
      ]
    },
    {
      id:"m2",
      title:"Ефективна комунікація",
      lessons:[
        {id:"m2l1", title:"Комунікація, якій довіряють", url:"m2l1.html"},
        {id:"m2l2", title:"Складні розмови без конфліктів", url:"m2l2.html"},
        {id:"m2l3", title:"Лідерський голос: впевненість та вплив", url:"m2l3.html"}
      ]
    },
    {
      id:"m3",
      title:"Лідер і команда",
      lessons:[
        {id:"m3l1", title:"Як об'єднувати людей навколо ідеї", url:"m3l1.html"},
        {id:"m3l2", title:"Мотивація без примусу", url:"m3l2.html"}
      ]
    },
    {
      id:"m4",
      title:"Рішення та стійкість",
      lessons:[
        {id:"m4l1", title:"Прийняття рішень та відповідальність", url:"m4l1.html"},
        {id:"m4l2", title:"Лідер у важкі періоди: стресостійкість", url:"m4l2.html"}
      ]
    }
  ];

  const TOTAL = MODULES.reduce((sum,m)=>sum + m.lessons.length,0); // 10

  // ===== BADGES LOCAL (ONLY display) =====
  const BADGES = [
    {id:"ld_start", name:"Перший крок лідера", icon:"award", desc:"Ти розпочав(ла) курс «Лідерство».", check:(n,p)=>n>=1},
    {id:"ld_25",    name:"25% шляху",          icon:"gauge", desc:"Ти формуєш базу особистого впливу.", check:(n,p)=>p>=25},
    {id:"ld_50",    name:"50% курсу",          icon:"gauge", desc:"Половина лідерського шляху позаду!", check:(n,p)=>p>=50},
    {id:"ld_75",    name:"75% курсу",          icon:"gauge", desc:"Ти майже на фінальній прямій.", check:(n,p)=>p>=75},
    {id:"ld_done",  name:"Лідер сформований",  icon:"trophy",desc:"Ти завершив(ла) курс «Лідерство».", check:(n,p)=>p>=100}
  ];

  // ===== Elements =====
  const yearEl        = document.getElementById("scYear");
  const headerName    = document.getElementById("scHeaderName");
  const headerAvatar  = document.getElementById("scHeaderAvatar");
  const headerStatus  = document.getElementById("scHeaderStatus");

  const heroLevel     = document.getElementById("scHeroLevel");
  const heroXp        = document.getElementById("scHeroXp");

  const progressValue   = document.getElementById("scProgressValue");
  const progressBar     = document.getElementById("scProgressBar");
  const progressSub     = document.getElementById("scProgressSub");
  const progressDetails = document.getElementById("scProgressDetails");
  const progressHint    = document.getElementById("scProgressHint");

  const badgesGrid    = document.getElementById("scBadgesGrid");
  const badgesCount   = document.getElementById("scBadgesCount");

  const modulesList   = document.getElementById("scModulesList");

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
      const raw = JSON.parse(localStorage.getItem(LEAD_KEY));
      if(raw && Array.isArray(raw.lessons)) return raw;
      return {lessons:[]};
    }catch(e){
      return {lessons:[]};
    }
  }

  function saveProgress(data){
    localStorage.setItem(LEAD_KEY, JSON.stringify(data));
  }

  // INIT
  let academy = loadAcademy() || {
    profile:{name:"Студент", avatarId:"rocket", style:"classic"},
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

  // делаем этот курс активным, если другой не в фокусе
  academy.activeCourseId = COURSE_ID;
  localStorage.setItem(STATE_KEY, JSON.stringify(academy));

  let progress = loadProgress();
  const doneSet = new Set(progress.lessons);

  yearEl.textContent = new Date().getFullYear();

  // ===== PROFILE HEADER =====
  function renderProfile(){
    headerName.textContent = academy.profile.name || "Студент";

    let icon = "rocket";
    if(academy.profile.avatarId === "ninja") icon = "sword";
    else if(academy.profile.avatarId === "lion") icon = "flame";

    headerAvatar.innerHTML = `<i data-lucide="${icon}"></i>`;

    const pct = academy.courses[COURSE_ID].progress || 0;
    heroXp.textContent = `${pct} / 100 XP`;

    const levelText =
        pct >= 80 ? "Лідер"
      : pct >= 40 ? "Системний"
      : "Новачок";

    heroLevel.textContent = levelText;

    // статус як в академії: рівень + lvl N
    const lvl = Math.max(1, Math.floor((pct || 0) / 25) + 1);
    if (headerStatus){
      headerStatus.textContent = `${levelText} • lvl ${lvl}`;
    }

    if (window.lucide) lucide.createIcons();
  }

  // ===== COURSE PROGRESS (синхронизируем з академією) =====
  function updateCourseProgress(){
    const done = doneSet.size;
    const pct = Math.round((done / TOTAL) * 100);

    let course = academy.courses[COURSE_ID];
    course.started   = done > 0;
    course.completed = pct >= 100;
    course.progress  = pct;
    course.lessonsDone  = done;
    course.lessonsTotal = TOTAL;

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
      progressHint.textContent = "Лідерство починається з першого усвідомленого кроку.";
    } else if(pct < 100){
      progressSub.textContent = "Продовжуй!";
      progressHint.textContent = "Ти формуєш характер і вплив, які ведуть людей за собою.";
    } else {
      progressSub.textContent = "Курс завершено!";
      progressHint.textContent = "Ти розумієш, як діяти як лідер для команди та клієнтів.";
    }
  }

  // ===== BADGES RENDER =====
  function renderBadges(){
    badgesGrid.innerHTML = "";

    const done = doneSet.size;
    const pct  = academy.courses[COURSE_ID].progress || 0;

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

    if (window.lucide) lucide.createIcons();
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
          <div class="cd-module-progress-pill ${done===total ? "cd-module-progress-pill-done" : ""}">
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
              <i data-lucide="${finished ? "check" : "check-circle"}"></i>
              ${finished ? "Відмінити" : "Позначити"}
            </button>
          </div>
        `;

        // клік по всей строке — відкриття уроку
        row.addEventListener("click", (e)=>{
          if(!e.target.closest(".cd-btn-lesson")){
            if(lesson.url) window.location.href = lesson.url;
          }
        });

        // клік по кнопке — тільки toggle
        row.querySelector(".cd-btn-lesson").addEventListener("click", (e)=>{
          e.stopPropagation();
          toggleLesson(lesson.id);
        });

        list.appendChild(row);
      });

      modulesList.appendChild(box);
    });

    if (window.lucide) lucide.createIcons();
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
