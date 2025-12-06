"use strict";

document.addEventListener("DOMContentLoaded", () => {

  const STATE_KEY = "samostroy_academy_state_v1";
  const SALES3_KEY = "sa_sales3_v1";
  const COURSE_ID = "sales3";

  // === МОДУЛІ КУРСУ (14 уроків) ===
  const MODULES = [
    {
      id: "s3m1",
      title: "Основи сучасних продажів",
      lessons: [
        { id:"s3m1l1", title:"Що таке Продажі 3.0?", url:"s3m1l1.html" },
        { id:"s3m1l2", title:"Де зароджується довіра?", url:"s3m1l2.html" },
        { id:"s3m1l3", title:"Психологія покупця у 2026 році", url:"s3m1l3.html" }
      ]
    },
    {
      id: "s3m2",
      title: "Продажі в чаті",
      lessons: [
        { id:"s3m2l1", title:"Швидкість реакції та тон", url:"s3m2l1.html" },
        { id:"s3m2l2", title:"Скрипти відповідей", url:"s3m2l2.html" },
        { id:"s3m2l3", title:"Робота із сумнівами", url:"s3m2l3.html" }
      ]
    },
    {
      id: "s3m3",
      title: "Телефонні продажі",
      lessons: [
        { id:"s3m3l1", title:"Перші 7 секунд", url:"s3m3l1.html" },
        { id:"s3m3l2", title:"Техніка активного слухання", url:"s3m3l2.html" },
        { id:"s3m3l3", title:"Як завершити угоду", url:"s3m3l3.html" }
      ]
    },
    {
      id: "s3m4",
      title: "Заперечення та психологія",
      lessons: [
        { id:"s3m4l1", title:"ТОП-10 заперечень", url:"s3m4l1.html" },
        { id:"s3m4l2", title:"Чому клієнт відмовляється?", url:"s3m4l2.html" }
      ]
    },
    {
      id: "s3m5",
      title: "Професійний продавець 2026",
      lessons: [
        { id:"s3m5l1", title:"Стиль, тон, позиціонування", url:"s3m5l1.html" },
        { id:"s3m5l2", title:"Що відрізняє найкращих?", url:"s3m5l2.html" }
      ]
    }
  ];

  const TOTAL_LESSONS = MODULES.reduce((sum, m) => sum + m.lessons.length, 0);

  // === Бейджі курсу ===
  const COURSE_BADGES = [
    { id:"s3_first", name:"Перший урок", icon:"award", type:"Прогрес", desc:"Ти почав(ла) курс «Продажі 3.0».", check:(n,p)=>n>=1 },
    { id:"s3_25", name:"25% курсу", icon:"gauge", type:"Прогрес", desc:"Ти подолав(ла) чверть курсу!", check:(n,p)=>p>=25 },
    { id:"s3_50", name:"50% курсу", icon:"gauge", type:"Прогрес", desc:"Ти на середині!", check:(n,p)=>p>=50 },
    { id:"s3_75", name:"75% курсу", icon:"gauge", type:"Прогрес", desc:"Залишилося трохи — ти майже там!", check:(n,p)=>p>=75 },
    { id:"s3_done", name:"Курс завершено!", icon:"trophy", type:"Фініш", desc:"Ти завершив(ла) весь курс «Продажі 3.0».", check:(n,p)=>p>=100 }
  ];

  // === DOM elements ===
  const yearEl = document.getElementById("csYear");
  const headerName = document.getElementById("csHeaderName");
  const headerStatus = document.getElementById("csHeaderStatus");
  const headerAvatar = document.getElementById("csHeaderAvatar");

  const heroLevel = document.getElementById("csHeroLevel");
  const heroXp = document.getElementById("csHeroXp");
  const heroLessons = document.getElementById("csHeroLessons");

  const progressValue = document.getElementById("csProgressValue");
  const progressBar = document.getElementById("csProgressBar");
  const progressSub = document.getElementById("csProgressSub");
  const progressDetails = document.getElementById("csProgressDetails");
  const progressHint = document.getElementById("csProgressHint");

  const badgesGrid = document.getElementById("csBadgesGrid");
  const badgesCount = document.getElementById("csBadgesCount");

  const modulesList = document.getElementById("csModulesList");

  // === Основні збережені стани ===
  let state = loadState();
  let sales3Progress = loadSales3();

  yearEl.textContent = new Date().getFullYear();


  // ===== Функції state =====
  function defaultState(){
    return {
      profile:{
        name:"Студент",
        avatarId:"rocket",
        style:"classic",
        initialized:false,
        streakDays:1
      },
      courses:{
        sales3:{
          id:"sales3",
          started:false,
          completed:false,
          progress:0,
          lessonsDone:0,
          lessonsTotal:TOTAL_LESSONS
        }
      },
      achievements:{},
      activeCourseId:"sales3"
    };
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STATE_KEY);
      if(!raw) return defaultState();
      return JSON.parse(raw);
    }catch(e){
      return defaultState();
    }
  }

  function saveState(st){
    localStorage.setItem(STATE_KEY, JSON.stringify(st));
  }

  function loadSales3(){
    try{
      const raw = localStorage.getItem(SALES3_KEY);
      if(!raw) return {completedLessons:[]};
      const obj = JSON.parse(raw);
      return obj && Array.isArray(obj.completedLessons) ? obj : {completedLessons:[]};
    }catch(e){
      return {completedLessons:[]};
    }
  }

  function saveSales3(p){
    localStorage.setItem(SALES3_KEY, JSON.stringify(p));
  }

  // ===== Обновление прогресса =====
  function updateCourseProgress(){
    const set = new Set(sales3Progress.completedLessons);
    const done = set.size;
    const pct = Math.round(done * 100 / TOTAL_LESSONS);

    let cs = state.courses[COURSE_ID];
    cs.started = done>0;
    cs.lessonsDone = done;
    cs.progress = pct;
    cs.completed = pct>=100;

    // Open badges quietly
    COURSE_BADGES.forEach(b=>{
      if(b.check(done,pct)) state.achievements[b.id] = true;
    });

    saveState(state);
  }

  // ===== Рендер профиля =====
  function renderProfile(){
    const p = state.profile;
    headerName.textContent = p.name;

    // XP
    const xp = state.courses.sales3.progress;
    heroXp.textContent = `${xp} / 100 XP`;

    heroLevel.textContent = xp>=80 ? "Профі" :
                            xp>=40 ? "Активний продавець" :
                                     "Новачок";

    // avatar
    const icon = p.avatarId==="ninja" ? "sword" :
                 p.avatarId==="lion" ? "flame" :
                 "rocket";
    headerAvatar.innerHTML = `<i data-lucide="${icon}"></i>`;
  }

  // ===== Прогрес =====
  function renderProgress(){
    const cs = state.courses.sales3;
    const pct = cs.progress;
    const done = cs.lessonsDone;

    progressValue.textContent = pct+"%";
    progressBar.style.width = pct+"%";
    progressDetails.textContent = `${done} / ${TOTAL_LESSONS} уроків`;

    if(pct===0){
      progressSub.textContent = "Почни з першого уроку.";
      progressHint.textContent = "Уроки принесуть XP та бейджі.";
    } else if(pct<100){
      progressSub.textContent = "Чудовий прогрес!";
      progressHint.textContent = "Продовжуй — попереду заперечення, скрипти та переговори.";
    } else {
      progressSub.textContent = "Курс завершено.";
      progressHint.textContent = "Ти можеш повернутися до уроків у будь-який момент.";
    }
  }

  // ===== Бейджі =====
  function renderBadges(){
    badgesGrid.innerHTML = "";
    const done = state.courses.sales3.lessonsDone;
    const pct = state.courses.sales3.progress;
    const earned = state.achievements;

    let earnedCount = 0;

    COURSE_BADGES.forEach(b=>{
      const ok = b.check(done,pct);
      if(ok) earnedCount++;

      const card = document.createElement("div");
      card.className = "cd-badge-card" + (ok ? " cd-badge-earned": "");
      card.innerHTML = `
        <div class="cd-badge-icon"><i data-lucide="${b.icon}"></i></div>
        <div class="cd-badge-name">${b.name}</div>
        <div class="cd-badge-desc">${b.desc}</div>
        <div class="cd-badge-tag">${b.type}</div>
      `;
      badgesGrid.appendChild(card);
    });

    badgesCount.textContent = `${earnedCount} / ${COURSE_BADGES.length} бейджів`;

    if(window.lucide) lucide.createIcons();
  }

  // ===== Модулі та уроки =====
  function renderModules(){
    modulesList.innerHTML = "";
    const set = new Set(sales3Progress.completedLessons);

    MODULES.forEach((m,mi)=>{
      const wr = document.createElement("div");
      wr.className = "cd-module-card";

      const done = m.lessons.filter(l=>set.has(l.id)).length;

      wr.innerHTML = `
        <div class="cd-module-header">
          <div class="cd-module-title">${m.title}</div>
          <div class="cd-module-progress-pill ${done===m.lessons.length ? "cd-module-progress-pill-done":""}">
            ${done}/${m.lessons.length} уроків
          </div>
        </div>
        <div class="cd-lessons-list"></div>
      `;

      const list = wr.querySelector(".cd-lessons-list");

      m.lessons.forEach((lesson, li)=>{
        const isDone = set.has(lesson.id);

        const row = document.createElement("div");
        row.className = "cd-lesson-row" + (isDone?" cd-lesson-row-done":"");
        row.dataset.lessonId = lesson.id;

        row.innerHTML = `
          <div class="cd-lesson-main">
            <div class="cd-lesson-index">${li+1}</div>
            <div>
              <div class="cd-lesson-title">${lesson.title}</div>
              <div class="cd-lesson-meta">Урок ${li+1} в модулі ${mi+1}</div>
            </div>
          </div>

          <div class="cd-lesson-actions">
            <span class="cd-lesson-status">${isDone?"Пройдено":"Не пройдено"}</span>
            <button class="cd-btn-lesson ${isDone?"cd-btn-lesson-done":""}">
              <i data-lucide="${isDone?"check":"check-circle"}"></i>
              ${isDone?"Відмінити":"Позначити"}
            </button>
          </div>
        `;

        row.addEventListener("click",(e)=>{
          if(e.target.closest(".cd-btn-lesson")) return;
          if(lesson.url && lesson.url!=="#") window.open(lesson.url, "_blank");
        });

        row.querySelector(".cd-btn-lesson").addEventListener("click",(e)=>{
          e.stopPropagation();
          toggleLesson(lesson.id);
        });

        list.appendChild(row);
      });

      modulesList.appendChild(wr);
    });

    if(window.lucide) lucide.createIcons();
  }

  // ===== Toggle lesson =====
  function toggleLesson(id){
    const set = new Set(sales3Progress.completedLessons);

    if(set.has(id)) set.delete(id);
    else set.add(id);

    sales3Progress.completedLessons = Array.from(set);
    saveSales3(sales3Progress);

    updateCourseProgress();
    renderAll();
  }

  // ===== Full render =====
  function renderAll(){
    renderProfile();
    renderProgress();
    renderBadges();
    renderModules();
  }

  updateCourseProgress();
  renderAll();

});
