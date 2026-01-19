"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const STATE_KEY = "samostroy_academy_state_v1";
  const DS_KEY = "sa_ds_zero_v1";
  const COURSE_ID = "ds_zero";

  // МОДУЛІ ТА УРОКИ (24 уроки)
  const MODULES = [
    {
      id:"m1",
      title:"Швидкий старт у дропшипінгу",
      lessons:[
        {id:"m1l1", title:"Що таке дропшипінг і де тут гроші", url:"cd/m1l1.html"},
        {id:"m1l2", title:"Вибір ніші та продукту",              url:"m1l2.html"},
        {id:"m1l3", title:"Перевірка попиту на товар",           url:"m1l3.html"},
        {id:"m1l4", title:"Перший постачальник",                 url:"m1l4.html"},
        {id:"m1l5", title:"Перші продажі без власного сайту",    url:"m1l5.html"}
      ]
    },
    {
      id:"m2",
      title:"Система та фінансова основа",
      lessons:[
        {id:"m2l1", title:"Як працює модель продажів",           url:"#"},
        {id:"m2l2", title:"Маржа, ціни, витрати",                url:"#"},
        {id:"m2l3", title:"Типові помилки новачків",             url:"#"}
      ]
    },
    {
      id:"m3",
      title:"Асортимент та вигрузка товарів",
      lessons:[
        {id:"m3l1", title:"Підготовка до масової вигрузки",      url:"#"},
        {id:"m3l2", title:"Вигрузка великої кількості SKU",      url:"#"},
        {id:"m3l3", title:"Вибір прибуткових продуктів",         url:"#"},
        {id:"m3l4", title:"Тестування товарів перед масштабом",  url:"#"}
      ]
    },
    {
      id:"m4",
      title:"Вітрина продажів",
      lessons:[
        {id:"m4l1", title:"Що має бути на продаючій вітрині",    url:"#"},
        {id:"m4l2", title:"Психологія клієнта та довіра",        url:"#"},
        {id:"m4l3", title:"Картки товарів, які продають",        url:"#"},
        {id:"m4l4", title:"Як підняти конверсію",                url:"#"}
      ]
    },
    {
      id:"m5",
      title:"Контент, TikTok, Reels",
      lessons:[
        {id:"m5l1", title:"Формати відео, які продають",         url:"#"},
        {id:"m5l2", title:"Шаблони контенту для старту",         url:"#"},
        {id:"m5l3", title:"Як знімати без сорому",               url:"#"},
        {id:"m5l4", title:"Як потрапляти в рекомендації",        url:"#"}
      ]
    },
    {
      id:"m6",
      title:"Замовлення та сервіс",
      lessons:[
        {id:"m6l1", title:"Спілкування з клієнтами",             url:"#"},
        {id:"m6l2", title:"Повторні продажі та робота з відмовами", url:"#"}
      ]
    },
    {
      id:"m7",
      title:"Масштабування",
      lessons:[
        {id:"m7l1", title:"Реклама та бюджети",                  url:"#"},
        {id:"m7l2", title:"Система та команда",                  url:"#"}
      ]
    }
  ];
  const TOTAL_LESSONS = MODULES.reduce((sum,m)=>sum + m.lessons.length,0); // 24

  // БЕЙДЖІ САМЕ ДЛЯ ЦЬОГО КУРСУ
  const COURSE_BADGES = [
    {
      id:"ds_first_step",
      name:"Перший урок",
      icon:"award",
      type:"Прогрес курсу",
      desc:"Ти зробив(ла) перший крок у курсі «Дропшипінг з нуля».",
      check:(lessonsDone,pct)=>lessonsDone>=1
    },
    {
      id:"ds_25",
      name:"25% курсу",
      icon:"gauge",
      type:"Прогрес курсу",
      desc:"Пройдено щонайменше чверть базового курсу.",
      check:(lessonsDone,pct)=>pct>=25
    },
    {
      id:"ds_50",
      name:"50% курсу",
      icon:"gauge",
      type:"Прогрес курсу",
      desc:"Полова шляху позаду — тримай темп.",
      check:(lessonsDone,pct)=>pct>=50
    },
    {
      id:"ds_75",
      name:"75% курсу",
      icon:"gauge",
      type:"Прогрес курсу",
      desc:"Ти майже на фініші базового курсу.",
      check:(lessonsDone,pct)=>pct>=75
    },
    {
      id:"ds_complete",
      name:"База закінчена",
      icon:"trophy",
      type:"Прогрес курсу",
      desc:"Ти завершив(ла) «Дропшипінг з нуля»!",
      check:(lessonsDone,pct)=>pct>=100
    }
  ];

  // ===== Курсы для расчёта XP/уровня (как в академии) =====
  const COURSES_META = [
    { id:"ds_zero",      lessons:24 },
    { id:"scale_up",     lessons:12 },
    { id:"million100",   lessons:10 },
    { id:"sales3",       lessons:14 },
    { id:"leadership",   lessons:10 },
    { id:"selfgrowth",   lessons:10 },
    { id:"learn60",      lessons:4  },
    { id:"change_or_die",lessons:8  }
  ];

  // ===== DOM =====
  const yearEl           = document.getElementById("cdYear");
  const headerNameEl     = document.getElementById("cdHeaderName");
  const headerStatusEl   = document.getElementById("cdHeaderStatus");
  const headerAvatarEl   = document.getElementById("cdHeaderAvatar");

  const heroLevelEl      = document.getElementById("cdHeroLevel");
  const heroXpEl         = document.getElementById("cdHeroXp");
  const heroLessonsEl    = document.getElementById("cdHeroLessons");

  const progressValueEl  = document.getElementById("cdProgressValue");
  const progressBarEl    = document.getElementById("cdProgressBar");
  const progressSubEl    = document.getElementById("cdProgressSub");
  const progressDetailsEl= document.getElementById("cdProgressDetails");
  const progressHintEl   = document.getElementById("cdProgressHint");

  const badgesGridEl     = document.getElementById("cdBadgesGrid");
  const badgesCountEl    = document.getElementById("cdBadgesCount");

  const modulesListEl    = document.getElementById("cdModulesList");

  // ===== СТАН =====
  let state = loadState();
  let dsProgress = loadDsProgress();

  // ===== ІНІТ =====
  yearEl.textContent = new Date().getFullYear();
  applyTheme(state.profile.style || "classic");

  // гарантируем запись по этому курсу
  ensureCourseState();

  // пересчёт прогресса на основе dsProgress
  updateCourseFromDs();
  // запись обратно в глобальный state
  saveState(state);

  renderAll();

  if (window.lucide) lucide.createIcons();

  // ====== ФУНКЦІЇ СТАНУ / THEME / АВАТАР ======

  function defaultState(){
    const coursesMap = {};
    COURSES_META.forEach(c=>{
      coursesMap[c.id] = {
        id:c.id,
        started:false,
        completed:false,
        progress:0,
        lessonsDone:0,
        lessonsTotal:c.lessons
      };
    });
    return {
      profile:{
        name:"Студент",
        avatarId:"rocket",
        style:"classic",
        initialized:false,
        createdAt:Date.now(),
        lastVisit:Date.now(),
        streakDays:1,
        sessions:1
      },
      courses:coursesMap,
      achievements:{},
      activeCourseId:null
    };
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STATE_KEY);
      if(!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if(!parsed || typeof parsed!=="object") return defaultState();

      if(!parsed.profile) parsed.profile = defaultState().profile;
      if(!parsed.courses || typeof parsed.courses!=="object"){
        parsed.courses = defaultState().courses;
      }else{
        const def = defaultState();
        COURSES_META.forEach(c=>{
          if(!parsed.courses[c.id]){
            parsed.courses[c.id] = def.courses[c.id];
          }else{
            if(typeof parsed.courses[c.id].lessonsTotal==="undefined"){
              parsed.courses[c.id].lessonsTotal = c.lessons;
            }
          }
        });
      }
      if(typeof parsed.activeCourseId==="undefined"){
        parsed.activeCourseId = null;
      }
      if(!parsed.achievements || typeof parsed.achievements!=="object"){
        parsed.achievements = {};
      }
      return parsed;
    }catch(e){
      return defaultState();
    }
  }

  function saveState(st){
    localStorage.setItem(STATE_KEY, JSON.stringify(st));
  }

  function loadDsProgress(){
    try{
      const raw = localStorage.getItem(DS_KEY);
      if(!raw) return {completedLessons:[]};
      const obj = JSON.parse(raw);
      if(!obj || !Array.isArray(obj.completedLessons)) return {completedLessons:[]};
      return obj;
    }catch(e){
      return {completedLessons:[]};
    }
  }

  function saveDsProgress(dp){
    localStorage.setItem(DS_KEY, JSON.stringify(dp));
  }

  function ensureCourseState(){
    if(!state.courses[COURSE_ID]){
      state.courses[COURSE_ID] = {
        id:COURSE_ID,
        started:false,
        completed:false,
        progress:0,
        lessonsDone:0,
        lessonsTotal:TOTAL_LESSONS
      };
    }else{
      if(typeof state.courses[COURSE_ID].lessonsTotal==="undefined"){
        state.courses[COURSE_ID].lessonsTotal = TOTAL_LESSONS;
      }
    }
  }

  function applyTheme(style){
    document.documentElement.setAttribute("data-theme", style || "classic");
  }

  function avatarIconFor(id){
    switch(id){
      case "ninja": return "sword";
      case "lion":  return "flame";
      case "owl":   return "moon-star";
      default:      return "rocket";
    }
  }

  function getStats(){
    const coursesArr = Object.values(state.courses);
    let completedCourses = 0;
    let startedCourses = 0;
    let xp = 0;
    const totalCourses = COURSES_META.length;

    coursesArr.forEach(c=>{
      if(c.completed) completedCourses++;
      if(c.started || c.completed) startedCourses++;
      xp += Math.round(c.progress || 0);
    });

    const maxXp = totalCourses * 100;
    return {completedCourses, startedCourses, xp, maxXp};
  }

  function getLevelTitle(stats){
    const {completedCourses, xp} = stats;
    if(completedCourses>=3 || xp>=250) return "На шляху до мільйона";
    if(completedCourses>=2 || xp>=150) return "Підприємець";
    if(completedCourses>=1 || xp>=80)  return "Практик";
    if(xp>=20)                         return "Активний студент";
    return "Новачок";
  }

  // ===== ОБНОВЛЕНИЕ КУРСА ИЗ DS_PROGRESS =====
  function updateCourseFromDs(){
    const set = new Set(dsProgress.completedLessons || []);
    const lessonsDone = set.size;
    const pct = TOTAL_LESSONS>0 ? Math.min(100, Math.round(lessonsDone*100/TOTAL_LESSONS)) : 0;

    const cs = state.courses[COURSE_ID];
    cs.started = lessonsDone>0;
    if(pct>cs.progress) cs.progress = pct;
    cs.lessonsDone = lessonsDone;
    cs.lessonsTotal = TOTAL_LESSONS;
    if(lessonsDone>=TOTAL_LESSONS){
      cs.completed = true;
    }

    if(!state.activeCourseId && cs.started && !cs.completed){
      state.activeCourseId = COURSE_ID;
    }

    // апдейтим достижения по курсу (без модалок, тихо)
    updateCourseBadges(lessonsDone, pct);
  }

  function updateCourseBadges(lessonsDone, pct){
    COURSE_BADGES.forEach(b=>{
      const ok = b.check(lessonsDone, pct);
      if(ok && !state.achievements[b.id]){
        state.achievements[b.id] = true;
      }
    });
  }

  // ===== РЕНДЕР =====
  function renderHeader(){
    const stats = getStats();
    const levelTitle = getLevelTitle(stats);
    const lvlNumber = Math.max(1, Math.floor(stats.xp/100)+1);

    const name = state.profile.name || "Студент";
    const icon = avatarIconFor(state.profile.avatarId || "rocket");

    headerNameEl.textContent = name;
    headerStatusEl.textContent = `${levelTitle} • lvl ${lvlNumber}`;
    headerAvatarEl.innerHTML = `<i data-lucide="${icon}"></i>`;

    heroLevelEl.textContent = levelTitle;
    heroXpEl.textContent = `${stats.xp} / ${Math.max(stats.maxXp,100)} XP`;
    heroLessonsEl.textContent = `${TOTAL_LESSONS} уроки`;

    if(window.lucide) lucide.createIcons();
  }

  function renderProgress(){
    const cs = state.courses[COURSE_ID];
    const pct = cs.progress || 0;
    const lessonsDone = cs.lessonsDone || 0;

    progressValueEl.textContent = pct + "%";
    progressBarEl.style.width = pct + "%";
    progressDetailsEl.textContent = `${lessonsDone} / ${TOTAL_LESSONS} уроків`;

    if(lessonsDone===0){
      progressSubEl.textContent = "Почни з першого уроку, щоб побачити рух по курсу.";
      progressHintEl.textContent = "Кожен завершений урок — це XP і крок до наступних програм.";
    }else if(pct<100){
      progressSubEl.textContent = "Продовжуй модуль за модулем. Прогрес рахується автоматично.";
      progressHintEl.textContent = "Після завершення базового курсу відкриються всі інші програми академії.";
    }else{
      progressSubEl.textContent = "Курс завершено. Ти можеш повертатися до матеріалів у будь-який момент.";
      progressHintEl.textContent = "Тепер обери наступний курс в академії й рухайся далі.";
    }
  }

  function renderBadges(){
    badgesGridEl.innerHTML = "";
    const cs = state.courses[COURSE_ID];
    const lessonsDone = cs.lessonsDone || 0;
    const pct = cs.progress || 0;
    const earnedSet = new Set(Object.keys(state.achievements||{}));

    let earnedHere = 0;

    COURSE_BADGES.forEach(b=>{
      const earned = earnedSet.has(b.id) || b.check(lessonsDone,pct);
      if(earned) earnedHere++;

      const card = document.createElement("div");
      card.className = "cd-badge-card" + (earned ? " cd-badge-earned" : "");
      card.innerHTML = `
        <div class="cd-badge-icon">
          <i data-lucide="${b.icon}"></i>
        </div>
        <div class="cd-badge-name">${b.name}</div>
        <div class="cd-badge-desc">${b.desc}</div>
        <div class="cd-badge-tag">${b.type}</div>
      `;
      badgesGridEl.appendChild(card);
    });

    badgesCountEl.textContent = `${earnedHere} / ${COURSE_BADGES.length} бейджів`;

    if(window.lucide) lucide.createIcons();
  }

  function renderModules(){
    modulesListEl.innerHTML = "";
    const set = new Set(dsProgress.completedLessons || []);

    MODULES.forEach((m,mi)=>{
      const moduleCard = document.createElement("div");
      moduleCard.className = "cd-module-card";

      const doneCount = m.lessons.filter(l=>set.has(l.id)).length;
      const moduleDone = doneCount === m.lessons.length;

      moduleCard.innerHTML = `
        <div class="cd-module-header">
          <div class="cd-module-title">${m.title}</div>
          <div class="cd-module-progress-pill ${moduleDone?"cd-module-progress-pill-done":""}">
            ${doneCount}/${m.lessons.length} уроків
          </div>
        </div>
        <div class="cd-lessons-list"></div>
      `;

      const lessonsList = moduleCard.querySelector(".cd-lessons-list");

      m.lessons.forEach((lesson, li)=>{
        const done = set.has(lesson.id);
        const row = document.createElement("div");
        row.className = "cd-lesson-row" + (done ? " cd-lesson-row-done" : "");
        row.dataset.lessonId = lesson.id;

        row.innerHTML = `
          <div class="cd-lesson-main">
            <div class="cd-lesson-index">${li+1}</div>
            <div class="cd-lesson-titles">
              <div class="cd-lesson-title">${lesson.title}</div>
              <div class="cd-lesson-meta">
                Урок ${li+1} в модулі ${mi+1}
              </div>
            </div>
          </div>
          <div class="cd-lesson-actions">
            <span class="cd-lesson-status">
              ${done ? "Пройдено" : "Не пройдено"}
            </span>
            <button class="cd-btn-lesson ${done?"cd-btn-lesson-done":""}" type="button">
              <i data-lucide="${done?"check":"check-circle"}"></i>
              ${done ? "Відмінити" : "Позначити"}
            </button>
          </div>
        `;

        // клик по строке — открыть урок
        row.addEventListener("click",(e)=>{
          // если клик по кнопке — не открываем ссылку, только переключаем
          if(e.target.closest(".cd-btn-lesson")) return;
          if(lesson.url && lesson.url!=="#"){
            window.open(lesson.url,"_blank");
          }
        });

        // клик по кнопке — toggle completion
        const btn = row.querySelector(".cd-btn-lesson");
        btn.addEventListener("click",(e)=>{
          e.stopPropagation();
          toggleLesson(lesson.id);
        });

        lessonsList.appendChild(row);
      });

      modulesListEl.appendChild(moduleCard);
    });

    if(window.lucide) lucide.createIcons();
  }

  function renderAll(){
    renderHeader();
    renderProgress();
    renderBadges();
    renderModules();
  }

  // ===== ДЕЙСТВИЯ =====
  function toggleLesson(lessonId){
    if(!Array.isArray(dsProgress.completedLessons)){
      dsProgress.completedLessons = [];
    }
    const set = new Set(dsProgress.completedLessons);

    if(set.has(lessonId)){
      set.delete(lessonId);
    }else{
      set.add(lessonId);
    }

    dsProgress.completedLessons = Array.from(set);
    saveDsProgress(dsProgress);

    // обновляем глобальный state и перерендер
    updateCourseFromDs();
    saveState(state);
    renderAll();
  }

});



