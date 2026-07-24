(() => {
  "use strict";

  const state = { solved: 0, cipherSolved: false };
  const STORAGE_KEY = "case20_progress";
  const expectedDigits = ["7", "1", "3", "4"];

  /* ---------- сохранение прогресса ---------- */
  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ solved: state.solved, cipher: state.cipherSolved })
      );
    } catch (_) {}
  }
  function loadSaved() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (_) {
      return null;
    }
  }
  function reveal(section) {
    section.classList.remove("hidden");
  }

  const hero = document.querySelector("#hero");
  const investigation = document.querySelector("#investigation");
  const progressFill = document.querySelector("#progressFill");
  const progressLabel = document.querySelector("#progressLabel");
  const digitSlots = [...document.querySelectorAll(".digits span")];
  const clues = [...document.querySelectorAll(".clue")];
  const checkpoint = document.querySelector("#checkpoint");
  const decoder = document.querySelector("#decoder");
  const finale = document.querySelector("#finale");

  /* ---------- подсказки ---------- */
  const hints = {
    0: [
      "Цифру размазывает любой наклон. Нужен вид строго «в лицо» облаку.",
      "Верни вращение в начальное положение — без поворота влево/вправо и без наклона вверх/вниз.",
      "Это семёрка. Ответ: 7."
    ],
    1: [
      "«Между Казанью и Сочи ровно два рейса» — значит они на противоположных концах очереди (позиции 1 и 4).",
      "Казань раньше Самары, Самара раньше Москвы. Сочи — последняя. Порядок: Казань → Самара → Москва → Сочи.",
      "Третий рейс — Москва №401. Последняя цифра: 1. Ответ: 1."
    ],
    2: [
      "В радиограмме цвета спрятаны за образами. Молодой лист — зелёный, спелый мёд — жёлтый, небо над головою — синий. А огонь — красный — должен спать.",
      "Чёт гасит, нечёт зажигает. Найди два тумблера, чьи цвета сходятся только на красной — тогда красная погаснет, а синей не хватит одного голоса, и его добавит штурвал.",
      "Включи Шасси и Ток, поставь штурвал на синюю (отметка 3). Ответ: 3."
    ],
    3: [
      "Ветер перпендикулярен курсу и равен ему по силе. Какой угол дают две равные перпендикулярные силы?",
      "Они делят угол между Севером и Востоком ровно пополам.",
      "Получается 45°. Первая цифра — 4. Ответ: 4."
    ],
    cipher: [
      "Подпись «А1Я33» — это подсказка о нумерации алфавита.",
      "А — первая буква (1), Я — последняя (33). Значит Ё идёт сразу после Е.",
      "15 = Н, 6 = Е, 2 = Б, 16 = О. Слово — НЕБО."
    ]
  };
  const hintIndex = { 0: 0, 1: 0, 2: 0, 3: 0, cipher: 0 };

  function makeStars() {
    const stars = document.querySelector("#stars");
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 72; i += 1) {
      const star = document.createElement("i");
      star.className = "star";
      star.style.left = `${(i * 47.13) % 100}%`;
      star.style.top = `${(i * i * 13.7 + 9) % 100}%`;
      star.style.setProperty("--duration", `${2.4 + (i % 7) * 0.45}s`);
      star.style.setProperty("--delay", `${-(i % 11) * 0.38}s`);
      if (i % 9 === 0) star.style.width = star.style.height = "3px";
      fragment.appendChild(star);
    }
    stars.appendChild(fragment);
  }

  function showSection(section) {
    section.classList.remove("hidden");
    requestAnimationFrame(() => section.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function updateProgress(index, digit) {
    digitSlots[index].textContent = digit;
    digitSlots[index].classList.add("revealed");
    progressLabel.textContent = `${index + 1} / 4`;
    progressFill.style.width = `${(index + 1) * 25}%`;
  }

  /* ---------- единая разгадка улики ---------- */
  function solveClue(index) {
    if (clues[index].dataset.solved === "1") return;
    clues[index].dataset.solved = "1";
    updateProgress(index, expectedDigits[index]);
    state.solved = index + 1;
    persist();
    window.setTimeout(() => {
      clues[index].classList.remove("active");
      if (index < clues.length - 1) {
        clues[index + 1].classList.add("active");
        clues[index + 1].scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        showSection(checkpoint);
      }
    }, 750);
  }

  /* ===========================================================
     УЛИКА 01 — облако точек (3D-проекция на canvas)
     =========================================================== */
  function initCloud() {
    const canvas = document.getElementById("cloudCanvas");
    const overlay = document.getElementById("cloudOverlay");
    const readout = document.getElementById("cloudReadout");
    const result = document.getElementById("cloudResult");
    const ctx = canvas.getContext("2d");
    const form = document.getElementById("cloudForm");
    const input = document.getElementById("answer-0");
    const feedback = document.getElementById("feedback-0");

    // точки, образующие цифру 7 на плоскости XY + случайная глубина Z
    function buildPoints() {
      const p = [];
      for (let i = 0; i < 22; i += 1) {
        const t = i / 21;
        p.push([-0.5 + t * 1.0, 0.55, (Math.random() * 2 - 1) * 1.3]);
      }
      for (let i = 1; i < 29; i += 1) {
        const t = i / 28;
        p.push([0.5 - t * 1.0, 0.55 - t * 1.15, (Math.random() * 2 - 1) * 1.3]);
      }
      return p;
    }
    let points = buildPoints();

    let rotX = 0.62;
    let rotY = 0.7;
    let velX = 0;
    let velY = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let locked = false;
    let holdTimer = 0;

    function resize() {
      const w = canvas.parentElement.clientWidth;
      const h = Math.max(220, Math.min(300, Math.round(w * 0.82)));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function render() {
      if (locked) return;
      rotX += velX;
      rotY += velY;
      velX *= 0.9;
      velY *= 0.9;
      const w = parseFloat(canvas.style.width) || 260;
      const h = parseFloat(canvas.style.height) || 260;
      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.min(w, h) * 0.34;
      ctx.clearRect(0, 0, w, h);

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const f = 5;

      const projected = points.map(([x, y, z]) => {
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        const y1 = y;
        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;
        const factor = f / (f - z2);
        return { sx: cx + x1 * factor * scale, sy: cy - y2 * factor * scale, r: 2.4 * factor, d: z2 };
      });
      projected.sort((a, b) => a.d - b.d);
      for (const pt of projected) {
        const depth = (pt.d + 1.5) / 3;
        const alpha = 0.35 + depth * 0.55;
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, Math.max(1, pt.r), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(244,201,77,${alpha})`;
        ctx.shadowColor = "rgba(244,201,77,.6)";
        ctx.shadowBlur = 8 * factor_safe(pt.r);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // проверка попадания в целевой ракурс (0,0)
      const normY = normAngle(rotY);
      const normX = normAngle(rotX);
      if (Math.abs(normY) < 0.2 && Math.abs(normX) < 0.2 && !dragging) {
        holdTimer += 1;
        readout.textContent = "Свет сходится…";
        if (holdTimer > 18) {
          locked = true;
          result.textContent = "Это цифра";
          result.classList.add("found");
          readout.textContent = "Ракурс найден";
          canvas.style.pointerEvents = "none";
          form.classList.remove("hidden");
          input.focus({ preventScroll: true });
        }
      } else {
        holdTimer = 0;
        if (!locked) readout.textContent = dragging ? "Вращай облако…" : "Вращай облако пальцем";
      }
      requestAnimationFrame(render);
    }
    function factor_safe(r) {
      return Math.min(1, r / 3);
    }
    function normAngle(a) {
      let x = a % (Math.PI * 2);
      if (x > Math.PI) x -= Math.PI * 2;
      if (x < -Math.PI) x += Math.PI * 2;
      return x;
    }

    function down(clientX, clientY) {
      dragging = true;
      lastX = clientX;
      lastY = clientY;
      velX = velY = 0;
    }
    function move(clientX, clientY) {
      if (!dragging) return;
      const dx = clientX - lastX;
      const dy = clientY - lastY;
      lastX = clientX;
      lastY = clientY;
      velY = dx * 0.012;
      velX = dy * 0.012;
    }
    function up() {
      dragging = false;
    }

    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      down(e.clientX, e.clientY);
    });
    canvas.addEventListener("pointermove", (e) => move(e.clientX, e.clientY));
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    resize();
    window.addEventListener("resize", () => {
      if (clues[0].classList.contains("active")) resize();
    });
    requestAnimationFrame(render);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (v === expectedDigits[0]) {
        feedback.textContent = "Верно. Ракурс подтверждён.";
        feedback.className = "feedback success";
        input.disabled = true;
        form.querySelector("button[type=submit]").disabled = true;
        solveClue(0);
      } else {
        feedback.textContent = "Не та цифра. Присмотрись к облаку ещё раз.";
        feedback.className = "feedback";
        input.select();
      }
    });

    return {
      resize,
      restoreSolved() {
        locked = true;
        rotX = 0;
        rotY = 0;
        render();
        result.textContent = "Это цифра";
        result.classList.add("found");
        readout.textContent = "Ракурс найден";
        canvas.style.pointerEvents = "none";
        form.classList.remove("hidden");
        input.value = expectedDigits[0];
        input.disabled = true;
        form.querySelector("button[type=submit]").disabled = true;
        feedback.textContent = "Улика подтверждена.";
        feedback.className = "feedback success";
      }
    };
  }

  /* ===========================================================
     УЛИКА 02 — маршрутный журнал (очерёдность вылета)
     =========================================================== */
  // data-pos = настоящая позиция в очереди вылета (0..3)
  // порядок: Самара(0) → Казань(1) → Москва(2) → Сочи(3)
  // третьим (pos=2) улетает Москва, №401 → последняя цифра 1
  function initJournal() {
    const board = document.getElementById("journalBoard");
    const status = document.getElementById("journalStatus");
    const form = document.getElementById("journalForm");
    const input = document.getElementById("answer-1");
    const feedback = document.getElementById("feedback-1");
    const cards = [...board.querySelectorAll(".flight-card")];
    const CORRECT_POS = "2";
    let locked = false;

    function pick(card) {
      if (locked) return;
      if (card.dataset.pos === CORRECT_POS) {
        locked = true;
        cards.forEach((c) => (c.disabled = true));
        card.classList.add("picked");
        status.textContent = "Верно: третьим ушла Москва · № 401";
        status.classList.add("ok");
        form.classList.remove("hidden");
        input.focus({ preventScroll: true });
      } else {
        card.classList.remove("shake");
        void card.offsetWidth;
        card.classList.add("shake");
        status.textContent = "Это не третий рейс по счёту. Восстанови порядок.";
        status.classList.remove("ok");
      }
    }

    cards.forEach((c) => c.addEventListener("click", () => pick(c)));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (v === expectedDigits[1]) {
        feedback.textContent = "Верно. Очерёдность восстановлена.";
        feedback.className = "feedback success";
        input.disabled = true;
        form.querySelector("button[type=submit]").disabled = true;
        solveClue(1);
      } else {
        feedback.textContent = "Не сходится. Посмотри на номер рейса в Москву.";
        feedback.className = "feedback";
        input.select();
      }
    });

    return {
      restoreSolved() {
        locked = true;
        const right = cards.find((c) => c.dataset.pos === CORRECT_POS);
        if (right) right.classList.add("picked");
        cards.forEach((c) => (c.disabled = true));
        status.textContent = "Третьим ушла Москва · № 401";
        status.classList.add("ok");
        form.classList.remove("hidden");
        input.value = expectedDigits[1];
        input.disabled = true;
        form.querySelector("button[type=submit]").disabled = true;
        feedback.textContent = "Улика подтверждена.";
        feedback.className = "feedback success";
      }
    };
  }

  /* ===========================================================
     УЛИКА 03 — приборная панель (тумблеры + лампы + штурвал)
     ===========================================================
     Решение: Радио=1, Шасси=1, Связь=0, Ток=1 →
     лампы: Зелёная=1, Жёлтая=1, Красная=0 →
     штурвал = число горящих тумблеров = 3.
     */
  function initPanel() {
    const board = document.getElementById("panelBoard");
    const status = document.getElementById("panelStatus");
    const form = document.getElementById("panelForm");
    const input = document.getElementById("answer-2");
    const feedback = document.getElementById("feedback-2");
    const toggles = [...board.querySelectorAll(".toggle")];
    const lamps = [...board.querySelectorAll(".lamp")];
    const dial = document.getElementById("panelDial");
    const dialReadout = document.getElementById("dialReadout");

    // тумблеры: R=Радио, H=Шасси, T=Ток, S=Связь
    const sw = { R: 0, H: 0, T: 0, S: 0 };
    // штурвал-селектор: 0=Зелёная(Z), 1=Жёлтая(Y), 2=Красная(K), 3=Синяя(C)
    let dialVal = 0;
    let locked = false;

    // ТУМБЛЕРЫ УКАЗЫВАЮТ НА РАЗНОЕ ЧИСЛО ЦВЕТОВ:
    //   Радио  → Зелёная, Жёлтая, Синяя   (3 цепи)
    //   Шасси  → Красная, Жёлтая           (2 цепи)
    //   Ток    → Зелёная, Красная          (2 цепи)
    //   Связь  → Синяя                      (1 цепь)
    // ШТУРВАЛ ДОБАВЛЯЕТ +1 К ЦВЕТУ, НА КОТОРЫЙ УКАЗЫВАЕТ.
    // ЛОГИКА ЧЁТНОСТИ: нечётное число указателей → горит, чётное → гаснет.
    // Цель: З+Ж+С горят, К молчит. Единственный dial=3 (два набора тумблеров).
    function lampStates() {
      const z = sw.R + sw.T;
      const y = sw.R + sw.H;
      const k = sw.H + sw.T;
      const c = sw.R + sw.S;
      const counts = { Z: z, Y: y, K: k, C: c };
      const dialColor = ["Z", "Y", "K", "C"][dialVal];
      counts[dialColor] += 1;
      return { Z: counts.Z % 2, Y: counts.Y % 2, K: counts.K % 2, C: counts.C % 2 };
    }

    function render() {
      toggles.forEach((t) => {
        const on = sw[t.dataset.sw] === 1;
        t.classList.toggle("on", on);
        t.setAttribute("aria-pressed", on ? "true" : "false");
      });
      const ls = lampStates();
      lamps.forEach((l) => {
        l.classList.toggle("lit", ls[l.dataset.lamp] === 1);
      });
      dial.style.setProperty("--dial-pos", String(dialVal));
      dialReadout.textContent = String(dialVal);
    }

    // Цель: зелёная, жёлтая, синяя горят; красная погашена.
    function satisfied() {
      const ls = lampStates();
      return ls.Z === 1 && ls.Y === 1 && ls.C === 1 && ls.K === 0;
    }

    function check() {
      if (locked) return;
      if (satisfied()) {
        locked = true;
        toggles.forEach((t) => (t.disabled = true));
        dial.disabled = true;
        board.classList.add("solved");
        status.textContent = `Лампы сошлись. Штурвал на отметке ${dialVal}.`;
        status.classList.add("ok");
        form.classList.remove("hidden");
        input.focus({ preventScroll: true });
      } else {
        const ls = lampStates();
        const litL = ls.Z + ls.Y + ls.K + ls.C;
        status.textContent = `Горит ламп: ${litL} · штурвал: ${dialVal}. Сверься с радиограммой из архива.`;
        status.classList.remove("ok");
      }
    }

    toggles.forEach((t) =>
      t.addEventListener("click", () => {
        if (locked) return;
        const k = t.dataset.sw;
        sw[k] = sw[k] ? 0 : 1;
        render();
        check();
      })
    );

    // штурвал: клик циклически перебирает 0→1→2→3→0
    dial.addEventListener("click", () => {
      if (locked) return;
      dialVal = (dialVal + 1) % 4;
      render();
      check();
    });

    render();
    check();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (v === expectedDigits[2]) {
        feedback.textContent = "Верно. Панель настроена.";
        feedback.className = "feedback success";
        input.disabled = true;
        form.querySelector("button[type=submit]").disabled = true;
        solveClue(2);
      } else {
        feedback.textContent = "Не сходится. Посмотри, на какую отметку встал штурвал.";
        feedback.className = "feedback";
        input.select();
      }
    });

    return {
      restoreSolved() {
        sw.R = 0; sw.H = 1; sw.T = 1; sw.S = 0;
        dialVal = 3;
        locked = true;
        render();
        toggles.forEach((t) => (t.disabled = true));
        dial.disabled = true;
        board.classList.add("solved");
        status.textContent = "Лампы сошлись. Штурвал на отметке 3.";
        status.classList.add("ok");
        form.classList.remove("hidden");
        input.value = expectedDigits[2];
        input.disabled = true;
        form.querySelector("button[type=submit]").disabled = true;
        feedback.textContent = "Улика подтверждена.";
        feedback.className = "feedback success";
      }
    };
  }

  /* ===========================================================
     УЛИКА 04 — компас (снос ветром)
     =========================================================== */
  function initCompass() {
    const svg = document.getElementById("compass");
    const arrow = document.getElementById("driftArrow");
    const readout = document.getElementById("compassReadout");
    const marks = document.getElementById("compassMarks");
    const form = document.getElementById("compassForm");
    const input = document.getElementById("answer-3");
    const feedback = document.getElementById("feedback-3");
    const ns = "http://www.w3.org/2000/svg";
    const TARGET = 45; // градусов от Севера к Востоку

    // деления каждые 30°
    for (let a = 0; a < 360; a += 30) {
      const rad = ((a - 90) * Math.PI) / 180;
      const x1 = 100 + Math.cos(rad) * 92;
      const y1 = 100 + Math.sin(rad) * 92;
      const x2 = 100 + Math.cos(rad) * 84;
      const y2 = 100 + Math.sin(rad) * 84;
      const l = document.createElementNS(ns, "line");
      l.setAttribute("x1", x1);
      l.setAttribute("y1", y1);
      l.setAttribute("x2", x2);
      l.setAttribute("y2", y2);
      l.setAttribute("class", "compass-tick");
      marks.appendChild(l);
    }

    let angle = 0; // текущая выставка стрелки (град. от Севера)
    let dragging = false;
    let locked = false;

    function setArrow(a) {
      angle = ((a % 360) + 360) % 360;
      arrow.setAttribute("transform", `rotate(${angle} 100 100)`);
      readout.textContent = `${Math.round(angle)}°`;
    }

    function angleFromPointer(clientX, clientY) {
      const r = svg.getBoundingClientRect();
      const dx = clientX - (r.left + r.width / 2);
      const dy = clientY - (r.top + r.height / 2);
      // 0° = вверх (Север)
      let a = (Math.atan2(dx, -dy) * 180) / Math.PI;
      return a;
    }

    function down(clientX, clientY) {
      if (locked) return;
      dragging = true;
      setArrow(angleFromPointer(clientX, clientY));
    }
    function move(clientX, clientY) {
      if (!dragging || locked) return;
      setArrow(angleFromPointer(clientX, clientY));
      let diff = Math.abs(angle - TARGET);
      if (diff > 180) diff = 360 - diff;
      if (diff < 6) {
        locked = true;
        setArrow(TARGET);
        readout.textContent = "45°";
        svg.style.pointerEvents = "none";
        form.classList.remove("hidden");
        input.focus({ preventScroll: true });
      }
    }
    function up() {
      dragging = false;
    }

    svg.addEventListener("pointerdown", (e) => {
      svg.setPointerCapture(e.pointerId);
      down(e.clientX, e.clientY);
    });
    svg.addEventListener("pointermove", (e) => move(e.clientX, e.clientY));
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);

    setArrow(0);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (v === expectedDigits[3]) {
        feedback.textContent = "Верно. Курс определён.";
        feedback.className = "feedback success";
        input.disabled = true;
        form.querySelector("button[type=submit]").disabled = true;
        solveClue(3);
      } else {
        feedback.textContent = "Не та цифра. Перечти угол сноса.";
        feedback.className = "feedback";
        input.select();
      }
    });

    return {
      restoreSolved() {
        locked = true;
        setArrow(TARGET);
        svg.style.pointerEvents = "none";
        form.classList.remove("hidden");
        input.value = expectedDigits[3];
        input.disabled = true;
        form.querySelector("button[type=submit]").disabled = true;
        feedback.textContent = "Улика подтверждена.";
        feedback.className = "feedback success";
      }
    };
  }

  /* ---------- кнопки подсказок ---------- */
  document.querySelectorAll(".hint-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.hint;
      const list = hints[key];
      if (!list) return;
      const idx = Math.min(hintIndex[key], list.length - 1);
      const textEl = document.querySelector(`#hint-${key}`);
      if (textEl) {
        textEl.textContent = list[idx];
        textEl.classList.add("visible");
      }
      hintIndex[key] = idx + 1;
      if (hintIndex[key] >= list.length) {
        btn.textContent = "Подсказок больше нет";
        btn.disabled = true;
      } else {
        btn.textContent = "Ещё подсказка";
      }
    });
  });

  /* ---------- навигация ---------- */
  document.querySelector("#startButton").addEventListener("click", () => {
    hero.classList.add("hidden");
    showSection(investigation);
    window.setTimeout(() => cloud.resize(), 300);
  });

  document.querySelector("#haveCipherButton").addEventListener("click", () => {
    checkpoint.classList.add("hidden");
    showSection(decoder);
  });

  document.querySelector("#cipherForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.querySelector("#cipherInput");
    const feedback = document.querySelector("#cipherFeedback");
    const normalized = input.value.trim().toLocaleUpperCase("ru-RU").replace(/Ё/g, "Е");

    if (normalized === "НЕБО") {
      feedback.textContent = "Признание принято. Небо обнаружено.";
      feedback.className = "feedback success";
      state.cipherSolved = true;
      persist();
      window.setTimeout(() => {
        decoder.classList.add("hidden");
        showSection(finale);
      }, 650);
    } else {
      feedback.textContent = "Такого слова в протоколе нет. Загляни в «Подсказку».";
      feedback.className = "feedback";
      decoder.classList.remove("shake");
      void decoder.offsetWidth;
      decoder.classList.add("shake");
      input.select();
    }
  });

  /* ---------- сброс ---------- */
  const resetBtn = document.querySelector("#resetProgress");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (_) {}
      location.reload();
    });
  }

  /* ---------- инициализация механик ---------- */
  const cloud = initCloud();
  const journal = initJournal();
  const panel = initPanel();
  const compass = initCompass();

  /* ---------- восстановление прогресса ---------- */
  function restore() {
    const data = loadSaved();
    if (!data) return;
    const n = Math.max(0, Math.min(4, data.solved | 0));

    for (let i = 0; i < n; i += 1) {
      const clue = clues[i];
      clue.dataset.solved = "1";
      clue.classList.remove("active");
      digitSlots[i].textContent = expectedDigits[i];
      digitSlots[i].classList.add("revealed");
      // визуальное «решённое» состояние каждой механики
      if (i === 0) cloud.restoreSolved();
      if (i === 1) journal.restoreSolved();
      if (i === 2) panel.restoreSolved();
      if (i === 3) compass.restoreSolved();
    }
    state.solved = n;
    progressLabel.textContent = `${n} / 4`;
    progressFill.style.width = `${n * 25}%`;

    if (data.cipher) {
      state.cipherSolved = true;
      hero.classList.add("hidden");
      reveal(investigation);
      checkpoint.classList.add("hidden");
      decoder.classList.add("hidden");
      reveal(finale);
      return;
    }
    if (n >= 4) {
      hero.classList.add("hidden");
      reveal(investigation);
      reveal(checkpoint);
      return;
    }
    if (n > 0) {
      hero.classList.add("hidden");
      reveal(investigation);
      clues[n].classList.add("active");
      if (n === 0) window.setTimeout(() => cloud.resize(), 50);
    }
  }

  makeStars();
  restore();
})();
