"use strict";

document.addEventListener("DOMContentLoaded", () => {

  const STATE_KEY = "samostroy_academy_state_v1";
  const DS_KEY = "sa_ds_zero_v1";
  const DS_TOTAL_LESSONS = 24;

  // ===== КУРСИ =====
const COURSES = [
  {
    id: "ds_zero",
    title: "Дропшипінг з нуля",
    tag: "Базовий курс",
    type: "main",
    cover: "https://i.ibb.co/C3K0HFr4/unnamed-11.jpg",
    url: "course-dropshipping.html",
    lessons: 24,
    price: 4900,
    short: "Швидкий старт у дропшипінг-бізнесі від нуля до перших продажів.",
    bullets: [ "7 модулів, 24 практичні уроки.", "Фокус на перших реальних продажах, а не просто теорії.", "Шаблони, скрипти, чеклісти та приклади оголошень." ]
  },
  {
    id: "scale_up",
    title: "Масштабування",
    tag: "Продвинутий рівень",
    type: "advanced",
    cover: "https://i.ibb.co/KjWYgDhW/unnamed-12.jpg",
    url: "course-scale-up.html",
    lessons: 12,
    price: 5900,
    short: "Як вирости з перших продажів до стабільного обороту.",
    bullets: [ "Фінансова модель, KPI та контроль.", "Мультиплікатори прибутку.", "План дій по тижнях." ]
  },
  {
    id: "million100",
    title: "Мільйон за 100",
    tag: "Фокус на результат",
    type: "advanced",
    cover: "https://i.ibb.co/TBGmS8XC/unnamed-5.jpg",
    url: "course-million100.html",
    lessons: 10,
    price: 7500,
    short: "Стратегія до обороту 1 000 000 грн за 100 днів.",
    bullets: [ "Структура діалогу: від привітання до оплати.", "Робота з запереченнями та знижками.", "Скрипти, які не звучать як скрипти." ]
  },
  {
    id: "sales3",
    title: "Продажі 3.0",
    tag: "Продажі та скрипти",
    type: "sales",
    cover: "https://i.ibb.co/pvytPnBR/unnamed-13.jpg",
    url: "course-sales3.html",
    lessons: 14,
    price: 4200,
    short: "Сучасні техніки продажів у чаті та по телефону.",
    bullets: [ "Структура діалогу: від привітання до оплати.", "Робота з запереченнями та знижками.", "Скрипти, які не звучать як скрипти." ]
  },
  {
    id: "leadership",
    title: "Лідерство",
    tag: "Особистий вплив",
    type: "soft",
    cover: "https://i.ibb.co/1Yq1GHWr/unnamed-45.jpg",
    url: "course-leadership.html",
    lessons: 10,
    price: 3800,
    short: "Як стати лідером для своєї команди.",
    bullets: [ "Мислення лідера.", "Комунікація і довіра.", "Особисті кордони та цінності." ]
  },
  {
    id: "selfgrowth",
    title: "Саморозвиток",
    tag: "Внутрішня робота",
    type: "soft",
    cover: "https://i.ibb.co/WNjy8nJB/unnamed-46.jpg",
    url: "course-selfgrowth.html",
    lessons: 10,
    price: 3600,
    short: "Внутрішні зміни для стійкості.",
    bullets: [ "Привички та дисципліна.", "Робота зі страхами та сумнівами.", "План розвитку на 90 днів." ]
  },
  {
    id: "learn60",
    title: "Навчись за 60 хвилин",
    tag: "Експрес-формат",
    type: "mini",
    cover: "https://i.ibb.co/N29GQHQN/unnamed-49.jpg",
    url: "course-learn60.html",
    lessons: 4,
    price: 2900,
    short: "Як навчитись будь-чому за 60 хвилин на день.",
    bullets: [ "Один урок — одна навичка.", "Тільки суть без води.", "Домашка, яку реально зробити." ]
  },
  {
    id: "change_or_die",
    title: "Змінись або помри",
    tag: "Радикальні зміни",
    type: "mindset",
    cover: "https://i.ibb.co/nskbgqzd/unnamed-27.jpg",
    url: "course-change-or-die.html",
    lessons: 8,
    price: 5100,
    short: "Курс про радикальні рішення.",
    bullets: [ "Ревізія життя: що працює, а що ні.", "Сміливі кроки та відповідальність.", "План радикальних змін." ]
  }
];


  // ===== БЕЙДЖІ =====
  const BADGES = [
    { id:"first_login",     name:"Перший вхід",            icon:"sparkles",     type:"академія",   desc:"Твій перший вхід у Samostroy Academy." },
    { id:"profile_filled",  name:"Оформлений профіль",     icon:"user-check",   type:"академія",   desc:"Ти заповнив імʼя та обрав аватар." },
    { id:"academy_member",  name:"Член академії",          icon:"shield",       type:"академія",   desc:"Офіційно став(ла) частиною академії." },
    { id:"first_course_start", name:"Перший старт",        icon:"rocket",       type:"курси",      desc:"Ти запустив(ла) свій перший курс." },
    { id:"ds_first_step",   name:"Перший урок",            icon:"award",        type:"дропшипінг", desc:"Перший крок у курсі «Дропшипінг з нуля»." },
    { id:"ds_25",           name:"25% базового курсу",     icon:"gauge",        type:"дропшипінг", desc:"Пройдено 25% курсу «Дропшипінг з нуля»." },
    { id:"ds_50",           name:"50% базового курсу",     icon:"gauge",        type:"дропшипінг", desc:"Середина шляху в базовому курсі." },
    { id:"ds_75",           name:"75% базового курсу",     icon:"gauge",        type:"дропшипінг", desc:"Фінішна пряма базового курсу." },
    { id:"ds_complete",     name:"База закінчена",         icon:"trophy",       type:"дропшипінг", desc:"Ти завершив(ла) «Дропшипінг з нуля»." },
    { id:"two_courses",     name:"2 курси",                icon:"stars",        type:"курси",      desc:"Завершено 2 різні курси." },
    { id:"three_courses",   name:"3+ курси",               icon:"badge-check",       type:"курси",      desc:"Ти пройшов(ла) щонайменше 3 курси." },
    { id:"viewer",          name:"Цікавий студент",        icon:"info",         type:"академія",   desc:"Ти переглянув(ла) опис курсу." },
    { id:"selector",        name:"Сміливий вибір",         icon:"target",       type:"академія",   desc:"Ти обрав(ла) новий курс для старту." },
    { id:"focus",           name:"Фокус 1 курс",           icon:"focus",        type:"дисципліна", desc:"Ти дотримуєшся правила — один курс за раз." },
    { id:"return_day",      name:"Повернення",             icon:"clock",        type:"дисципліна", desc:"Ти повернувся(лася) в академію наступного дня." },
    { id:"week_streak",     name:"7 днів підряд",          icon:"calendar",     type:"дисципліна", desc:"7 днів поспіль у фокусі на навчанні." },
    { id:"xp_100",          name:"100 XP",                 icon:"flame",        type:"академія",   desc:"Накопичено щонайменше 100 XP." },
    { id:"xp_250",          name:"250 XP",                 icon:"flame",        type:"академія",   desc:"Серйозний прогрес — 250 XP." },
    { id:"ach_collector",   name:"Колекціонер",            icon:"medal",        type:"бейджі",     desc:"Ти зібрав(ла) 10 бейджів." },
    { id:"super_collector", name:"Легенда академії",       icon:"crown",        type:"бейджі",     desc:"20 бейджів і більше. Це вже легендарний рівень." }
  ];

  // ===== DOM елементи =====
  const yearEl           = document.getElementById("year");
  const scrollBadgesBtn  = document.getElementById("scrollBadgesBtn");
  const headerNameEl     = document.getElementById("headerName");
  const headerStatusEl   = document.getElementById("headerStatus");
  const headerAvatarEl   = document.getElementById("headerAvatar");
  const openProfileBtn   = document.getElementById("openProfileBtn");

  const heroStudentsEl   = document.getElementById("heroStudents");
  const heroLevelTitleEl = document.getElementById("heroLevelTitle");
  const heroXpTextEl     = document.getElementById("heroXpText");
  const heroXpBarEl      = document.getElementById("heroXpBar");
  const heroLevelHintEl  = document.getElementById("heroLevelHint");

  const progressEmptyEl  = document.getElementById("progressEmpty");
  const progressPanelEl  = document.getElementById("progressPanel");
  const activeCourseNameEl   = document.getElementById("activeCourseName");
  const activeCourseHintEl   = document.getElementById("activeCourseHint");
  const activeCourseValueEl  = document.getElementById("activeCourseValue");
  const activeCourseBarEl    = document.getElementById("activeCourseBar");
  const activeCourseFooterEl = document.getElementById("activeCourseFooter");

  const myCoursesEmptyEl = document.getElementById("myCoursesEmpty");
  const myCoursesGridEl  = document.getElementById("myCoursesGrid");
  const allCoursesGridEl = document.getElementById("allCoursesGrid");

  const badgesSectionEl  = document.getElementById("badgesSection");
  const badgesGridEl     = document.getElementById("badgesGrid");
  const badgesSummaryEl  = document.getElementById("badgesSummary");
  const badgesStatsEl    = document.getElementById("badgesStats");

  // Модали
  const profileOverlayEl   = document.getElementById("profileOverlay");
  const profileNameInputEl = document.getElementById("profileNameInput");
  const avatarGridEl       = document.getElementById("avatarGrid");
  const styleGridEl        = document.getElementById("styleGrid");
  const profileSaveBtnEl   = document.getElementById("profileSaveBtn");
  const profileSkipBtnEl   = document.getElementById("profileSkipBtn");

  const courseModalEl      = document.getElementById("courseModal");
  const courseModalTitleEl = document.getElementById("courseModalTitle");
  const courseModalDescEl  = document.getElementById("courseModalDesc");
  const courseModalBulletsEl = document.getElementById("courseModalBullets");
  const courseModalTagEl   = document.getElementById("courseModalTag");
  const courseModalStartEl = document.getElementById("courseModalStart");
  const courseModalCancelEl= document.getElementById("courseModalCancel");
  const courseModalCloseEl = document.getElementById("courseModalClose");

  const achModalEl         = document.getElementById("achModal");
  const achModalIconEl     = document.getElementById("achModalIcon");
  const achModalTitleEl    = document.getElementById("achModalTitle");
  const achModalTextEl     = document.getElementById("achModalText");
  const achModalUserEl     = document.getElementById("achModalUser");
  const achModalOkEl       = document.getElementById("achModalOk");

  // ===== СТАН =====
  let state = loadState();

  // черга бейджів для показу
  const achQueue = [];
  let achShowing = false;
  // останній курс, відкритий в модалці
  let courseModalCurrentId = null;

  // ===== ІНІТ =====
  yearEl.textContent = new Date().getFullYear();

  // синхронізуємо прогрес базового курсу з окремої сторінки
  syncDropshippingProgress(state);

  // оновлюємо візити / streak
  updateVisitStats(state);

  // перші досягнення
  if (!state.achievements["first_login"]) {
    unlockAchievement("first_login");
  }
  if (!state.achievements["academy_member"]) {
    unlockAchievement("academy_member");
  }

  // збережемо стан після ініта
  saveState(state);

  // відкриваємо модал профілю, якщо ще не налаштований
  if (!state.profile.initialized) {
    openProfileModal(true);
  }

  // рендер всього
  renderAll();
  // перевірка мета-бейджів (курси, XP, колекціонер)
  checkMetaAchievements();

  if (window.lucide) {
    lucide.createIcons();
  }

  // ====== ОБРОБНИКИ ======

  scrollBadgesBtn.addEventListener("click", () => {
    badgesSectionEl.scrollIntoView({ behavior:"smooth", block:"start" });
  });

  openProfileBtn.addEventListener("click", () => {
    openProfileModal(false);
  });

  avatarGridEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".ac-avatar-option");
    if (!btn) return;
    const id = btn.dataset.avatar;
    selectAvatarOption(id);
  });

  styleGridEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".ac-style-chip");
    if (!btn) return;
    const style = btn.dataset.style;
    selectStyleOption(style);
  });

  profileSaveBtnEl.addEventListener("click", () => {
    const name = (profileNameInputEl.value || "").trim() || "Студент";
    const avatar = getSelectedAvatarId();
    const style = getSelectedStyleId();
    state.profile.name = name;
    state.profile.avatarId = avatar;
    state.profile.style = style;
    state.profile.initialized = true;
    saveState(state);

    applyTheme(style);
    renderHeader();
    closeProfileModal();

    unlockAchievement("profile_filled");
    checkMetaAchievements();
  });

  profileSkipBtnEl.addEventListener("click", () => {
    state.profile.initialized = true;
    saveState(state);
    closeProfileModal();
  });

  // закриття модалей по кліку фону
  profileOverlayEl.addEventListener("click", (e) => {
    if (e.target === profileOverlayEl) {
      closeProfileModal();
    }
  });

  courseModalEl.addEventListener("click", (e) => {
    if (e.target === courseModalEl) {
      closeCourseModal();
    }
  });

  courseModalCloseEl.addEventListener("click", closeCourseModal);
  courseModalCancelEl.addEventListener("click", closeCourseModal);

  courseModalStartEl.addEventListener("click", () => {
    if (!courseModalCurrentId) return;
    startCourse(courseModalCurrentId);
    closeCourseModal();
  });

  achModalEl.addEventListener("click", (e) => {
    if (e.target === achModalEl) {
      closeAchModal();
    }
  });
  achModalOkEl.addEventListener("click", closeAchModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!profileOverlayEl.classList.contains("ac-hidden")) closeProfileModal();
      if (!courseModalEl.classList.contains("ac-hidden")) closeCourseModal();
      if (!achModalEl.classList.contains("ac-hidden")) closeAchModal(true);
    }
  });

  // ===== ФУНКЦІЇ СТАНУ =====

  function defaultState() {
    const coursesMap = {};
    COURSES.forEach(c => {
      coursesMap[c.id] = {
        id: c.id,
        started: false,
        completed: false,
        progress: 0,      // 0–100
        lessonsDone: 0,
        lessonsTotal: c.lessons || 0
      };
    });

    return {
      profile: {
        name: "Студент",
        avatarId: "rocket",
        style: "classic",
        initialized: false,
        createdAt: Date.now(),
        lastVisit: Date.now(),
        streakDays: 1,
        sessions: 1
      },
      courses: coursesMap,
      achievements: {},
      activeCourseId: null
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return defaultState();

      // профіль
      if (!parsed.profile) {
        parsed.profile = defaultState().profile;
      }

      // курси
      const def = defaultState();
      if (!parsed.courses || typeof parsed.courses !== "object") {
        parsed.courses = def.courses;
      } else {
        // дозаповнюємо відсутні курси
        COURSES.forEach(c => {
          if (!parsed.courses[c.id]) {
            parsed.courses[c.id] = def.courses[c.id];
          } else {
            if (typeof parsed.courses[c.id].lessonsTotal === "undefined") {
              parsed.courses[c.id].lessonsTotal = c.lessons || 0;
            }
          }
        });
      }

      if (typeof parsed.activeCourseId === "undefined") {
        parsed.activeCourseId = null;
      }
      if (!parsed.achievements || typeof parsed.achievements !== "object") {
        parsed.achievements = {};
      }

      return parsed;
    } catch (e) {
      return defaultState();
    }
  }

  function saveState(st) {
    localStorage.setItem(STATE_KEY, JSON.stringify(st));
  }

  function syncDropshippingProgress(st) {
    try {
      const raw = localStorage.getItem(DS_KEY);
      if (!raw) return;
      const ds = JSON.parse(raw);
      if (!ds || !Array.isArray(ds.completedLessons)) return;

      const done = ds.completedLessons.length;
      const pct = Math.min(100, Math.round((done / DS_TOTAL_LESSONS) * 100));

      const courseState = st.courses["ds_zero"];
      if (!courseState) return;

      if (done > 0) {
        courseState.started = true;
      }
      if (pct > courseState.progress) {
        courseState.progress = pct;
      }
      courseState.lessonsDone = Math.max(courseState.lessonsDone || 0, done);
      if (done >= DS_TOTAL_LESSONS) {
        courseState.completed = true;
      }

      // авто-бейджі по прогресу
      if (done >= 1)   unlockAchievement("ds_first_step");
      if (pct >= 25)   unlockAchievement("ds_25");
      if (pct >= 50)   unlockAchievement("ds_50");
      if (pct >= 75)   unlockAchievement("ds_75");
      if (pct >= 100)  unlockAchievement("ds_complete");

      // якщо базовий курс активний і ще не завершений
      if (!st.activeCourseId && done > 0 && !courseState.completed) {
        st.activeCourseId = "ds_zero";
      }

    } catch (e) {
      // нічого
    }
  }

  function updateVisitStats(st) {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const diff = now - (st.profile.lastVisit || now);
    if (diff >= oneDay * 2) {
      // пропускали більше дня — обнуляємо streak
      st.profile.streakDays = 1;
    } else if (diff >= oneDay * 1) {
      // повернення на наступний день
      st.profile.streakDays = (st.profile.streakDays || 1) + 1;
      unlockAchievement("return_day");
      if (st.profile.streakDays >= 7) {
        unlockAchievement("week_streak");
      }
    }

    st.profile.lastVisit = now;
    st.profile.sessions = (st.profile.sessions || 0) + 1;
  }

  function getCourseMeta(id) {
    return COURSES.find(c => c.id === id);
  }

  function getStats() {
    const coursesArr = Object.values(state.courses);
    const totalCourses = COURSES.length;
    let completedCourses = 0;
    let startedCourses = 0;
    let xp = 0;

    coursesArr.forEach(c => {
      if (c.completed) completedCourses++;
      if (c.started || c.completed) startedCourses++;
      xp += Math.round(c.progress); // 1% = 1 XP
    });

    const maxXp = totalCourses * 100;
    const earnedBadges = Object.keys(state.achievements).length;

    return {
      totalCourses,
      completedCourses,
      startedCourses,
      xp,
      maxXp,
      earnedBadges
    };
  }

  function getLevelTitle(stats) {
    const { completedCourses, xp } = stats;
    if (completedCourses >= 3 || xp >= 250) return "На шляху до мільйона";
    if (completedCourses >= 2 || xp >= 150) return "Підприємець";
    if (completedCourses >= 1 || xp >= 80)  return "Практик";
    if (xp >= 20)                            return "Активний студент";
    return "Новачок";
  }

  // ===== АВТО-БЕЙДЖІ ПО СТАТИСТИЦІ (КУРСИ / XP / КОЛЕКЦІОНЕР) =====
  function checkMetaAchievements() {
    const stats = getStats();

    // курси
    if (stats.completedCourses >= 2) {
      unlockAchievement("two_courses");
    }
    if (stats.completedCourses >= 3) {
      unlockAchievement("three_courses");
    }

    // XP
    if (stats.xp >= 100) {
      unlockAchievement("xp_100");
    }
    if (stats.xp >= 250) {
      unlockAchievement("xp_250");
    }

    // колекціонер
    const earned = Object.keys(state.achievements).length;
    if (earned >= 10) {
      unlockAchievement("ach_collector");
    }
    if (earned >= 20) {
      unlockAchievement("super_collector");
    }
  }

  // ===== ТЕМА / АВАТАР =====

  function applyTheme(style) {
    const root = document.documentElement;
    root.setAttribute("data-theme", style || "classic");
  }

  function avatarIconFor(id) {
    switch (id) {
      case "ninja": return "sword";
      case "lion":  return "flame";
      case "owl":   return "moon-star";
      default:      return "rocket";
    }
  }

  function selectAvatarOption(id) {
    const options = avatarGridEl.querySelectorAll(".ac-avatar-option");
    options.forEach(o => {
      o.classList.toggle("ac-avatar-selected", o.dataset.avatar === id);
    });
  }
  function getSelectedAvatarId() {
    const sel = avatarGridEl.querySelector(".ac-avatar-selected");
    return sel ? sel.dataset.avatar : "rocket";
  }

  function selectStyleOption(style) {
    const chips = styleGridEl.querySelectorAll(".ac-style-chip");
    chips.forEach(c => {
      c.classList.toggle("ac-style-selected", c.dataset.style === style);
    });
  }
  function getSelectedStyleId() {
    const sel = styleGridEl.querySelector(".ac-style-selected");
    return sel ? sel.dataset.style : "classic";
  }

  // ===== БЕЙДЖІ =====

  function unlockAchievement(id) {
    if (!id) return;
    if (state.achievements[id]) return; // вже є

    const def = BADGES.find(b => b.id === id);
    if (!def) return;

    state.achievements[id] = true;
    saveState(state);
    renderBadgesBoard(); // оновимо

    // у чергу на показ модалки
    achQueue.push(def);
    showNextAchievement();
  }

  function showNextAchievement() {
    if (achShowing) return;
    const next = achQueue.shift();
    if (!next) return;

    achShowing = true;

    achModalTitleEl.textContent = next.name;
    achModalTextEl.textContent = next.desc;

    const userName = state.profile.name || "Студент";
    achModalUserEl.textContent = userName + ", так тримати!";

    achModalIconEl.innerHTML = `<i data-lucide="${next.icon}"></i>`;
    achModalEl.classList.remove("ac-hidden");

    if (window.lucide) lucide.createIcons();
  }

  function closeAchModal(skipQueue) {
    achModalEl.classList.add("ac-hidden");
    achShowing = false;
    if (!skipQueue && achQueue.length > 0) {
      setTimeout(showNextAchievement, 200);
    }
  }

  // ===== РЕНДЕР =====

  function renderHeader() {
    const stats = getStats();
    const levelTitle = getLevelTitle(stats);
    const levelText = levelTitle;

    const xpNow = stats.xp;
    const xpCap = Math.max(stats.maxXp, 100);
    const xpPercent = xpCap ? Math.min(100, Math.round((xpNow / xpCap) * 100)) : 0;

    const name = state.profile.name || "Студент";
    headerNameEl.textContent = name;
    headerStatusEl.textContent = `${levelTitle} • lvl ${Math.max(1, Math.floor(xpNow / 100) + 1)}`;

    // аватар
    const icon = avatarIconFor(state.profile.avatarId || "rocket");
    headerAvatarEl.innerHTML = `<i data-lucide="${icon}"></i>`;

    heroLevelTitleEl.textContent = levelText;
    heroXpTextEl.textContent = `${xpNow} / ${xpCap} XP`;
    heroXpBarEl.style.width = xpPercent + "%";

    if (stats.completedCourses === 0 && stats.startedCourses === 0) {
      heroLevelHintEl.textContent = "Почни базовий курс і відкрий для себе всю академію.";
    } else if (stats.completedCourses === 0) {
      heroLevelHintEl.textContent = "Продовжуй базовий курс — після завершення відкриються всі інші програми.";
    } else {
      heroLevelHintEl.textContent = "Обирай наступний курс і рухайся до свого фінансового результату.";
    }

    // студенти (трохи «живої» цифри)
    heroStudentsEl.textContent = (57 + stats.completedCourses * 3 + stats.startedCourses) + "+";

    if (window.lucide) lucide.createIcons();
  }

  function renderProgress() {
    const anyStarted = Object.values(state.courses).some(c => c.started || c.completed);
    if (!anyStarted) {
      progressEmptyEl.style.display = "block";
      progressPanelEl.style.display = "none";
      return;
    }
    progressEmptyEl.style.display = "none";
    progressPanelEl.style.display = "flex";

    const id = state.activeCourseId;
    const courseState = id ? state.courses[id] : null;
    const meta = id ? getCourseMeta(id) : null;

    const title = meta ? meta.title : "Курс";
    const pct = courseState ? (courseState.progress || 0) : 0;

    activeCourseNameEl.textContent = title;
    activeCourseValueEl.textContent = pct + "%";
    activeCourseBarEl.style.width = pct + "%";

    if (!courseState || !courseState.started) {
      activeCourseHintEl.textContent = "Почни перший урок — і тут зʼявиться прогрес по курсу.";
    } else if (!courseState.completed) {
      activeCourseHintEl.textContent = "Рухайся модуль за модулем. Система рахує все автоматично.";
    } else {
      activeCourseHintEl.textContent = "Курс завершено. Можеш обрати нову програму.";
    }

    if (id === "ds_zero") {
      if (!courseState || !courseState.completed) {
        activeCourseFooterEl.textContent = "Після завершення базового курсу відкриються всі інші програми академії.";
      } else {
        activeCourseFooterEl.textContent = "Базовий курс пройдено. Обери наступний курс вище.";
      }
    } else {
      activeCourseFooterEl.textContent = "Один курс — один фокус. Коли завершиш, можеш запустити новий.";
    }
  }

  function renderMyCourses() {
    myCoursesGridEl.innerHTML = "";

    const my = COURSES.filter(c => {
      const st = state.courses[c.id];
      return st && (st.started || st.completed);
    });

    if (my.length === 0) {
      myCoursesEmptyEl.style.display = "block";
      return;
    }
    myCoursesEmptyEl.style.display = "none";

    my.forEach(c => {
      const st = state.courses[c.id];
      const card = document.createElement("div");
      card.className = "ac-course-card";

      const isActive = state.activeCourseId === c.id && !st.completed;

      let tagClass = "ac-course-tag";
      let tagText = c.tag;

      // Активний курс — зелений
      if (isActive && !st.completed) {
        tagClass = "ac-course-tag ac-course-tag-main";
        tagText = "Активний курс";
      }
      // Завершено — сірий
      else if (st.completed) {
        tagClass = "ac-course-tag";
        tagText = "Завершено";
      }

      const statusText = st.completed
        ? "Курс завершено."
        : (st.started ? `Прогрес: ${st.progress || 0}%` : "Ще не розпочато.");

      card.innerHTML = `
        <div class="${tagClass}">${tagText}</div>
        <div class="ac-course-cover" style="background-image:url('${c.cover}')"></div>
        <div class="ac-course-title">${c.title}</div>
        <div class="ac-course-sub">${c.short}</div>
        
        <div class="ac-course-price-box">
        <div class="ac-price-old">${c.price?.toLocaleString("uk-UA") || "3 900"} грн</div>
        <div class="ac-price-free">Безкоштовно</div></div>

        <div class="ac-course-status">${statusText}</div>
        <div class="ac-course-actions"></div>
      `;

      const actions = card.querySelector(".ac-course-actions");

      const btnMain = document.createElement("button");
      btnMain.className = "ac-btn ac-btn-small";
      if (st.completed) {
        btnMain.innerHTML = `<i data-lucide="play-circle"></i>Переглянути`;
      } else {
        btnMain.innerHTML = `<i data-lucide="play"></i>Продовжити`;
      }
      btnMain.addEventListener("click", () => startCourse(c.id));
      actions.appendChild(btnMain);

      const btnInfo = document.createElement("button");
      btnInfo.className = "ac-btn-ghost ac-btn-small";
      btnInfo.innerHTML = `<i data-lucide="info"></i>Детальніше`;
      btnInfo.addEventListener("click", () => openCourseModal(c.id));
      actions.appendChild(btnInfo);

      myCoursesGridEl.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
  }

  function renderAllCourses() {
    allCoursesGridEl.innerHTML = "";

    const mainState = state.courses["ds_zero"];
    const currentId = state.activeCourseId;

    COURSES.forEach(c => {
      const st = state.courses[c.id];

      // не показуємо курс, якщо він уже в "Мої курси"
      if (st && (st.started || st.completed)) return;

      let locked = false;
      let lockedReason = "";

      // логіка блокування
      if (c.id !== "ds_zero") {
        if (!mainState.completed) {
          locked = true;
          lockedReason = "Спочатку заверши базовий курс «Дропшипінг з нуля».";
        } else if (currentId && currentId !== c.id && !state.courses[currentId].completed) {
          locked = true;
          const meta = getCourseMeta(currentId);
          lockedReason = "Заверш спочатку поточний курс: «" + (meta ? meta.title : "активний курс") + "».";
        }
      }

      const card = document.createElement("div");
      card.className = "ac-course-card";

      const tagClass = c.id === "ds_zero" ? "ac-course-tag ac-course-tag-main" : "ac-course-tag";

      card.innerHTML = `
        <div class="${tagClass}">
          ${c.id === "ds_zero" ? "Стартовий курс" : c.tag}
        </div>
        <div class="ac-course-cover" style="background-image:url('${c.cover}')"></div>
        <div class="ac-course-title">${c.title}</div>
        <div class="ac-course-sub">${c.short}</div>
        
        <div class="ac-course-price-box">
        <div class="ac-price-old">${c.price?.toLocaleString("uk-UA") || "3 900"} грн</div>
        <div class="ac-price-free">Безкоштовно</div></div>

        <div class="ac-course-status">
          ${
            locked
              ? lockedReason
              : "Можна почати у будь-який час."
          }
        </div>
        <div class="ac-course-actions"></div>
      `;

      const actions = card.querySelector(".ac-course-actions");

      const btnInfo = document.createElement("button");
      btnInfo.className = "ac-btn-ghost ac-btn-small";
      btnInfo.innerHTML = `<i data-lucide="info"></i>Детальніше`;
      btnInfo.addEventListener("click", () => openCourseModal(c.id));
      actions.appendChild(btnInfo);

      const btnStart = document.createElement("button");
      btnStart.className = "ac-btn ac-btn-small";
      if (locked) {
        btnStart.classList.add("ac-btn-disabled");
        btnStart.innerHTML = `<i data-lucide="lock"></i>Заблоковано`;
      } else {
        btnStart.innerHTML = `<i data-lucide="${c.id === "ds_zero" ? "rocket" : "play"}"></i>Почати курс`;
        btnStart.addEventListener("click", () => startCourse(c.id));
      }
      actions.appendChild(btnStart);

      allCoursesGridEl.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
  }

  function renderBadgesBoard() {
    badgesGridEl.innerHTML = "";  
    
    const earnedIds = Object.keys(state.achievements);
    const earnedSet = new Set(earnedIds);

    BADGES.forEach(b => {
      const card = document.createElement("div");
      card.className = "ac-badge-card" + (earnedSet.has(b.id) ? " ac-badge-earned" : "");

      card.innerHTML = `
        <div class="ac-badge-icon">
          <i data-lucide="${b.icon}"></i>
        </div>
        <div class="ac-badge-name">${b.name}</div>
        <div class="ac-badge-desc">${b.desc}</div>
        <div class="ac-badge-tag">${b.type}</div>
      `;

      badgesGridEl.appendChild(card);
    });

// ===== BADGE FULLSCREEN INFO =====
const badgeOverlay = document.getElementById("badgeInfoOverlay");
const badgeInfoIcon = document.getElementById("badgeInfoIcon");
const badgeInfoTitle = document.getElementById("badgeInfoTitle");
const badgeInfoStatus = document.getElementById("badgeInfoStatus");
const badgeInfoDesc = document.getElementById("badgeInfoDesc");

// клік по бейджу
badgesGridEl.addEventListener("click", (e) => {
  const card = e.target.closest(".ac-badge-card");
  if (!card) return;

  const icon = card.querySelector("i")?.getAttribute("data-lucide");
  const title = card.querySelector(".ac-badge-name")?.textContent;
  const desc = card.querySelector(".ac-badge-desc")?.textContent;
  const earned = card.classList.contains("ac-badge-earned");

  // встановлення
  badgeInfoIcon.innerHTML = `<i data-lucide="${icon}"></i>`;
  badgeInfoTitle.textContent = title;

  if (earned) {
    badgeInfoStatus.textContent = "Досягнуто ✓";
    badgeInfoStatus.className = "badge-info-status ok";
  } else {
    badgeInfoStatus.textContent = "Ще не досягнуто";
    badgeInfoStatus.className = "badge-info-status fail";
  }

  badgeInfoDesc.textContent = desc;

  badgeOverlay.classList.remove("ac-hidden");

  if (window.lucide) lucide.createIcons();
});

// закриття по кліку будь-де
badgeOverlay.addEventListener("click", () => {
  badgeOverlay.classList.add("ac-hidden");
});

    
    
    
    

    const stats = getStats();
    const totalBadges = BADGES.length;
    const earnedBadges = stats.earnedBadges;

    badgesSummaryEl.textContent = `${earnedBadges} / ${totalBadges} бейджів відкрито.`;
    badgesStatsEl.textContent = `Завершено курсів: ${stats.completedCourses} • XP: ${stats.xp}`;

    if (window.lucide) lucide.createIcons();
  }

  function renderAll() {
    applyTheme(state.profile.style || "classic");
    renderHeader();
    renderProgress();
    renderMyCourses();
    renderAllCourses();
    renderBadgesBoard();
  }

  // ===== КУРСИ: ДІЇ =====
  function startCourse(courseId) {
    const meta = getCourseMeta(courseId);
    if (!meta) return;

    const st = state.courses[courseId];

    // якщо вже завершено — просто відкриваємо
    if (st.completed && meta.url && meta.url !== "#") {
      window.location.href = meta.url;
      return;
    }

    // обмеження: базовий курс перед іншими
    const base = state.courses["ds_zero"];
    if (courseId !== "ds_zero" && !base.completed) {
      alert("Спочатку заверши базовий курс «Дропшипінг з нуля».");
      return;
    }

    // обмеження: один курс одночасно
    if (state.activeCourseId &&
        state.activeCourseId !== courseId &&
        !state.courses[state.activeCourseId].completed) {
      const activeMeta = getCourseMeta(state.activeCourseId);
      alert("Заверши поточний курс: «" + (activeMeta ? activeMeta.title : "активний курс") + "».");
      return;
    }

    st.started = true;
    state.activeCourseId = courseId;
    saveState(state);

    unlockAchievement("selector");
    unlockAchievement("focus");
    if (!state.achievements["first_course_start"]) {
      unlockAchievement("first_course_start");
    }

    renderAll();
    checkMetaAchievements();

    // перехід на сторінку курсу
    if (meta.url && meta.url !== "#") {
      window.location.href = meta.url;
    } else {
      alert("Цей курс буде доступний після розробки його програми 🙂");
    }
  }

  // ===== МОДАЛ КУРСУ =====

  function openCourseModal(courseId) {
    const meta = getCourseMeta(courseId);
    if (!meta) return;
    courseModalCurrentId = courseId;

    courseModalTitleEl.textContent = meta.title;
    courseModalTagEl.textContent = meta.tag;
    courseModalDescEl.textContent = meta.short;
    courseModalBulletsEl.innerHTML = "";

    (meta.bullets || []).forEach(b => {
      const li = document.createElement("li");
      li.textContent = b;
      courseModalBulletsEl.appendChild(li);
    });

    courseModalEl.classList.remove("ac-hidden");
    unlockAchievement("viewer");
    checkMetaAchievements();

    if (window.lucide) lucide.createIcons();
  }

  function closeCourseModal() {
    courseModalEl.classList.add("ac-hidden");
    courseModalCurrentId = null;
  }

  // ===== МОДАЛ ПРОФІЛЮ =====

  function openProfileModal(firstTime) {
    profileOverlayEl.classList.remove("ac-hidden");

    profileNameInputEl.value = state.profile.name || "";
    selectAvatarOption(state.profile.avatarId || "rocket");
    selectStyleOption(state.profile.style || "classic");

    profileSkipBtnEl.style.display = firstTime ? "inline-flex" : "none";

    if (window.lucide) lucide.createIcons();
  }

  function closeProfileModal() {
    profileOverlayEl.classList.add("ac-hidden");
  }

});

// =========================
// NEWYEAR START (REMOVE LATER)
// =========================
(function(){
  // Сезон каждый год: 15 Dec - 15 Jan (включительно)
  function isNewYearSeason(d){
    const m = d.getMonth(); // 0=Jan ... 11=Dec
    const day = d.getDate();
    return (m === 11 && day >= 15) || (m === 0 && day <= 15);
  }

  const now = new Date();
  if(!isNewYearSeason(now)){
    document.documentElement.classList.remove("ny");
    return;
  }
  document.documentElement.classList.add("ny");

  // Год у логотипа: декабрь -> следующий год, январь -> текущий
  const nyYear = (now.getMonth() === 11) ? (now.getFullYear() + 1) : now.getFullYear();
  const logo = document.querySelector(".ac-logo");
  if(logo) logo.setAttribute("data-ny-year", String(nyYear));

  // SVG лампочка (обводка + линза)
  function bulbSVG(){
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path class="ny-glass" d="M12 3c-3.6 0-6.5 2.8-6.5 6.4 0 2.3 1.1 3.9 2.5 5.2.9.8 1.6 1.7 1.8 2.8h4.4c.2-1.1.9-2 1.8-2.8 1.4-1.3 2.5-2.9 2.5-5.2C18.5 5.8 15.6 3 12 3z"/>
        <path class="ny-stroke" d="M12 3c-3.6 0-6.5 2.8-6.5 6.4 0 2.3 1.1 3.9 2.5 5.2.9.8 1.6 1.7 1.8 2.8h4.4c.2-1.1.9-2 1.8-2.8 1.4-1.3 2.5-2.9 2.5-5.2C18.5 5.8 15.6 3 12 3z"/>
        <path class="ny-stroke" d="M9.2 18.4h5.6"/>
        <path class="ny-stroke" d="M9.8 21h4.4"/>
      </svg>
    `;
  }

  // SVG снежинка
  function snowflakeSVG(){
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2v20M4 6l16 12M20 6L4 18M6 4l2 2M18 4l-2 2M6 20l2-2M18 20l-2-2M2 12h3M19 12h3"/>
      </svg>
    `;
  }

  // ============ ГИРЛЯНДА ============
  const garland = document.querySelector(".ny-garland");
  if(garland && !garland.querySelector(".ny-garland-row")){
    const row = document.createElement("div");
    row.className = "ny-garland-row";

    const colors = ["#ff4e6d","#5ce3a0","#38bdf8","#ffb347","#a855f7","#f97316","#ffffff"];
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const count = isMobile ? 14 : 22;

    for(let i=0;i<count;i++){
      const b = document.createElement("div");
      b.className = "ny-bulb";

      const r = Math.random();
      if(r < 0.30) b.classList.add("ny-fast");
      else if(r < 0.65) b.classList.add("ny-slow");

      b.style.setProperty("--ny-drop", `${Math.round((Math.random()*6)-3)}px`);
      b.style.setProperty("--ny-rot", `${Math.round((Math.random()*10)-5)}deg`);
      b.style.setProperty("--ny-wave", `${(2.8 + Math.random()*2.0).toFixed(2)}s`);
      b.style.setProperty("--ny-blink", `${(0.9 + Math.random()*3.0).toFixed(2)}s`);

      const c = colors[i % colors.length];
      b.style.setProperty("--ny-c", c);
      b.style.animationDelay = `${(i*0.10 + Math.random()*0.25).toFixed(2)}s`;

      b.innerHTML = bulbSVG();
      row.appendChild(b);
    }

    garland.appendChild(row);

    // Клик по любой лампочке => всем рандомные цвета (без setInterval, чтобы не грузить)
    row.addEventListener("click", (e) => {
      const bulb = e.target.closest(".ny-bulb");
      if(!bulb) return;

      const bulbs = row.querySelectorAll(".ny-bulb");
      bulbs.forEach((el) => {
        el.style.setProperty("--ny-c", colors[Math.floor(Math.random() * colors.length)]);
        el.style.setProperty("--ny-wave", `${(2.6 + Math.random()*2.2).toFixed(2)}s`);
        el.style.setProperty("--ny-blink", `${(0.9 + Math.random()*3.2).toFixed(2)}s`);
      });
    });
  }

  // ============ СНЕГ ============
  const snow = document.querySelector(".ny-snow");
  if(snow && !snow.querySelector(".ny-flake")){
    const isMobile = window.matchMedia("(max-width: 640px)").matches;

    // ультра-лайт: минимум элементов
    const flakesCount = isMobile ? 5 : 9;

    for(let i=0;i<flakesCount;i++){
      const f = document.createElement("div");
      f.className = "ny-flake";

      // внутренний слой для sway (дешево)
      f.innerHTML = `<div class="ny-flake-inner">${snowflakeSVG()}</div>`;

      const left = Math.random() * 100;
      const size = (isMobile ? 10 : 12) + Math.random() * (isMobile ? 8 : 12);
      const op = 0.16 + Math.random() * 0.16; // ещё прозрачнее
      const dur = (isMobile ? 11 : 12) + Math.random() * (isMobile ? 8 : 12);
      const sway = 10 + Math.random() * 18;
      const swayDur = 3.6 + Math.random() * 3.6;

      // дрейф по x (не “по прямой”)
      const x = (Math.random() * 30) - 15;
      const x2 = x + ((Math.random() * 50) - 25);
      const r2 = 360 + Math.round(Math.random()*360);

      f.style.left = `${left}%`;
      f.style.setProperty("--ny-size", `${size.toFixed(1)}px`);
      f.style.setProperty("--ny-op", op.toFixed(2));
      f.style.setProperty("--ny-dur", `${dur.toFixed(2)}s`);
      f.style.setProperty("--ny-sway", `${sway.toFixed(1)}px`);
      f.style.setProperty("--ny-sway-dur", `${swayDur.toFixed(2)}s`);
      f.style.setProperty("--ny-x", `${x.toFixed(1)}px`);
      f.style.setProperty("--ny-x2", `${x2.toFixed(1)}px`);
      f.style.setProperty("--ny-r2", `${r2}deg`);

      // разнесём старт, чтобы не “пачкой”
      const delay = Math.random() * (isMobile ? 4 : 6);
      f.style.animationDelay = `${delay.toFixed(2)}s`;

      snow.appendChild(f);
    }
  }
})();
// =========================
// NEWYEAR END (REMOVE LATER)
// =========================
