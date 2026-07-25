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
  const digitSlots = [...document.querySelectorAll(".digit-slot")];
  const clues = [...document.querySelectorAll(".clue")];
  const checkpoint = document.querySelector("#checkpoint");
  const decoder = document.querySelector("#decoder");
  const finale = document.querySelector("#finale");

  /* ---------- подсказки ---------- */
  const hints = {
    0: [
      "Покрути облако частиц и найди тот ракурс, с которого проступает цифра.",
      "Цифру размазывает любой наклон. Нужен вид строго «в лицо» облаку — без поворота влево/вправо и без наклона вверх/вниз.",
      "Это семёрка с перекладиной посередине. Ответ: 7."
    ],
    1: [
      "«Между Казанью и Сочи ровно два рейса» — значит они на противоположных концах очереди (позиции 1 и 4).",
      "Казань раньше Самары, Самара раньше Москвы. Сочи — последняя. Порядок: Казань → Самара → Москва → Сочи.",
      "Третий рейс — Москва №401. Последняя цифра: 1. Ответ: 1."
    ],
    2: [
      "Тумблеры замыкают цепи ламп: Радио — зелёную, жёлтую и синюю; Шасси — красную и жёлтую; Ток — зелёную и красную; Связь — синюю.",
      "Цвета складываются по чётности: две цепи на одной лампе — гасят её, три — зажигают (чёт гасит, нечёт зажигает). Штурвал — пятый голос: куда укажет стрелка, тот цвет и присоединяется к счёту. В радиограмме: молодой лист — зелёный, спелый мёд — жёлтый, небо над головою — синий, открытый огонь — красный (он должен спать).",
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

  // Навигация между уликами (возврат к уже решённым с зафиксированным ответом).
  // cloud = initCloud() определяется ниже; к моменту вызова goTo (по клику) уже готов.
  function goTo(index) {
    clues.forEach((c, i) => c.classList.toggle("active", i === index));
    clues[index].scrollIntoView({ behavior: "smooth", block: "start" });
    if (index === 0) window.setTimeout(() => cloud.resize(), 50);
    updateNav();
  }
  function updateNav() {
    clues.forEach((clue, i) => {
      const next = clue.querySelector(".nav-next");
      if (!next) return;
      const hasNext = i < clues.length - 1 && clues[i + 1].dataset.solved === "1";
      next.style.visibility = hasNext ? "" : "hidden";
    });
    // цифры-навигация: доступны решённые + текущая
    const currentActive = clues.findIndex((c) => c.classList.contains("active"));
    digitSlots.forEach((slot, i) => {
      const solved = clues[i].dataset.solved === "1";
      const accessible = solved || i === currentActive;
      slot.classList.toggle("accessible", accessible);
      slot.classList.toggle("current", i === currentActive);
      slot.disabled = !accessible;
    });
  }

  function updateProgress(index, digit) {
    digitSlots[index].querySelector("span").textContent = digit;
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
    updateNav();
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
    const ctx = canvas.getContext("2d");
    const form = document.getElementById("cloudForm");
    const input = document.getElementById("answer-0");
    const feedback = document.getElementById("feedback-0");

    // точки, образующие цифру 7 с перекладиной на плоскости XY + случайная глубина Z
    function buildPoints() {
      const p = [];
      // помощник: точки вдоль отрезка (x1,y1)-(x2,y2), n точек + утолщение (3 параллельных ряда)
      function stroke(x1, y1, x2, y2, n, thickness) {
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        // перпендикуляр для утолщения
        const nx = -dy / len, ny = dx / len;
        const offs = [-thickness, 0, thickness];
        for (const off of offs) {
          for (let i = 0; i < n; i += 1) {
            const t = n === 1 ? 0.5 : i / (n - 1);
            const px = x1 + dx * t + nx * off;
            const py = y1 + dy * t + ny * off;
            p.push([px, py, (Math.random() * 2 - 1) * 0.9]);
          }
        }
      }
      // верхний горизонтальный штрих: слева вверх направо
      stroke(-0.32, 0.44, 0.34, 0.44, 12, 0.035);
      // основная диагональ: из правого конца верхней перекладины вниз влево
      stroke(0.34, 0.44, -0.30, -0.44, 16, 0.035);
      // средняя перекладина (короткий горизонтальный штрих поперёк диагонали на y≈0)
      // точка диагонали при y=0: t=(0.44)/(0.88)=0.5 → x≈0.02; штрих симметричен
      stroke(-0.13, 0.02, 0.17, 0.02, 7, 0.035);
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
      const w = canvas.parentElement.clientWidth || 280;
      const h = Math.max(220, Math.min(300, Math.round(w * 0.82)));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // если облако уже собрано — перерисовать финальный кадр (иначе canvas.width сбросит контент)
      if (locked) drawFrame();
    }

    function drawFrame() {
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
    }

    function render() {
      if (locked) return;
      rotX += velX;
      rotY += velY;
      velX *= 0.9;
      velY *= 0.9;
      drawFrame();

      // мягкая подсказка без фиксации: облако крутится всегда, форма доступна сразу
      const normY = normAngle(rotY);
      const normX = normAngle(rotX);
      const aligned = Math.abs(normY) < 0.2 && Math.abs(normX) < 0.2 && !dragging;
      if (aligned) {
        holdTimer += 1;
        readout.textContent = holdTimer > 12 ? "Цифра хорошо видна" : "Свет сходится…";
      } else {
        holdTimer = 0;
        readout.textContent = dragging ? "Вращай облако…" : "Вращай облако пальцем";
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
    // форма ввода доступна сразу — пользователь сам решает, когда разглядел цифру
    form.classList.remove("hidden");
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
        resize();
        drawFrame();
        readout.textContent = "Ракурс найден";
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
     ===========================================================
     data-pos = настоящая позиция в очереди вылета (0..3)
     порядок: Казань(0) → Самара(1) → Москва(2) → Сочи(3)
     Механика: тапать рейсы в порядке вылета; проверка только когда
     расставлены все 4. Неверно → сброс. Нельзя «протыкать наугад».
     */
  function initJournal() {
    const board = document.getElementById("journalBoard");
    const status = document.getElementById("journalStatus");
    const form = document.getElementById("journalForm");
    const input = document.getElementById("answer-1");
    const feedback = document.getElementById("feedback-1");
    const cards = [...board.querySelectorAll(".flight-card")];
    let order = [];   // массив data-pos в порядке кликов
    let locked = false;

    function reset(msg) {
      const placed = cards.filter((c) => c.disabled);
      order = [];
      cards.forEach((c) => {
        c.disabled = false;
        c.classList.remove("picked");
        delete c.dataset.order;
      });
      placed.forEach((c) => {
        c.classList.remove("shake");
        void c.offsetWidth;
        c.classList.add("shake");
      });
      status.textContent = msg;
      status.classList.remove("ok");
    }

    function pick(card) {
      if (locked || card.disabled) return;
      order.push(card.dataset.pos);
      card.dataset.order = String(order.length);
      card.classList.add("picked");
      card.disabled = true;
      status.textContent = `Расставлено: ${order.length} из 4`;
      if (order.length === 4) check();
    }

    function check() {
      // правильный порядок кликов = по возрастанию data-pos (0,1,2,3)
      const correct = order.every((pos, i) => Number(pos) === i);
      if (correct) {
        locked = true;
        cards.forEach((c) => (c.disabled = true));
        status.textContent = "Верно: очерёдность восстановлена · Москва №401 ушла третьей";
        status.classList.add("ok");
        form.classList.remove("hidden");
      } else {
        reset("Неверный порядок вылета. Восстанови очерёдность по показаниям и начни заново.");
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
        order = ["0", "1", "2", "3"];
        cards.forEach((c) => {
          c.dataset.order = String(Number(c.dataset.pos) + 1);
          c.classList.add("picked");
          c.disabled = true;
        });
        status.textContent = "Очерёдность восстановлена · Москва №401 ушла третьей";
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
        // автофокус убран — клавиатура на iOS не выезжает автоматически
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
    }
    function up() {
      dragging = false;
      if (locked) return;
      // фиксация только по отпусканию — нельзя «прокрутить наугад» через цель
      let diff = Math.abs(angle - TARGET);
      if (diff > 180) diff = 360 - diff;
      if (diff < 6) {
        locked = true;
        setArrow(TARGET);
        readout.textContent = "45°";
        svg.style.pointerEvents = "none";
        form.classList.remove("hidden");
        // автофокус убран — клавиатура на iOS не выезжает автоматически
      }
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

  /* ---------- подсказки: квадратики + модал ---------- */
  // построить модал один раз
  const hintModal = document.createElement("div");
  hintModal.className = "hint-modal hidden";
  hintModal.innerHTML = '<div class="hint-modal-card" role="dialog" aria-modal="true"><div class="hint-modal-dots" id="hintModalDots"></div><p class="hint-modal-text" id="hintModalText"></p><div class="hint-modal-nav"><button type="button" class="hint-modal-prev" id="hintModalPrev">← назад</button><button type="button" class="hint-modal-close" id="hintModalClose">закрыть</button></div></div>';
  document.body.appendChild(hintModal);
  const hintModalText = hintModal.querySelector("#hintModalText");
  const hintModalDots = hintModal.querySelector("#hintModalDots");
  const hintModalPrev = hintModal.querySelector("#hintModalPrev");
  const hintModalClose = hintModal.querySelector("#hintModalClose");
  let hintModalCtx = null; // { key, list, unlocked, current }

  function renderHintModal() {
    if (!hintModalCtx) return;
    const { list, unlocked, current } = hintModalCtx;
    hintModalText.textContent = list[current];
    // точки: пронумерованные квадратики 1..list.length, доступны current<=unlocked, активный=current
    hintModalDots.innerHTML = "";
    list.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "hint-dot";
      dot.textContent = i + 1;
      if (i === current) dot.classList.add("active");
      if (i > unlocked) dot.classList.add("locked");
      dot.addEventListener("click", () => {
        if (i > hintModalCtx.unlocked) return;
        hintModalCtx.current = i;
        renderHintModal();
      });
      hintModalDots.appendChild(dot);
    });
    hintModalPrev.style.visibility = current > 0 ? "" : "hidden";
  }
  function openHintModal(key) {
    const list = hints[key];
    if (!list) return;
    hintModalCtx = { key, list, unlocked: hintIndex[key], current: Math.min(hintIndex[key], list.length - 1) };
    renderHintModal();
    hintModal.classList.remove("hidden");
  }
  hintModalClose.addEventListener("click", () => { hintModal.classList.add("hidden"); });
  hintModalPrev.addEventListener("click", () => {
    if (!hintModalCtx || hintModalCtx.current <= 0) return;
    hintModalCtx.current -= 1;
    renderHintModal();
  });
  hintModal.addEventListener("click", (e) => { if (e.target === hintModal) hintModal.classList.add("hidden"); });

  // построить квадратики подсказок в каждой секции с data-hint
  document.querySelectorAll("[data-hint]").forEach((btn) => {
    // btn — старая кнопка .hint-button; заменим её на контейнер квадратиков
    const key = btn.dataset.hint;
    const list = hints[key];
    if (!list) return;
    const wrap = document.createElement("div");
    wrap.className = "hint-pips";
    list.forEach((_, i) => {
      const pip = document.createElement("button");
      pip.type = "button";
      pip.className = "hint-pip";
      pip.textContent = i + 1;
      pip.title = `Подсказка ${i + 1}`;
      pip.addEventListener("click", () => {
        // открыть уровень i, если он уже разблокирован — иначе разблокировать следующий по очереди
        if (i > hintIndex[key]) return;
        if (i === hintIndex[key]) hintIndex[key] = Math.min(hintIndex[key] + 1, list.length);
        openHintModalAt(key, i);
      });
      wrap.appendChild(pip);
    });
    btn.replaceWith(wrap);
  });
  function openHintModalAt(key, idx) {
    const list = hints[key];
    if (!list) return;
    hintModalCtx = { key, list, unlocked: hintIndex[key], current: idx };
    renderHintModal();
    hintModal.classList.remove("hidden");
  }

  /* ---------- навигация ---------- */
  document.querySelector("#startButton").addEventListener("click", () => {
    hero.classList.add("hidden");
    showSection(investigation);
    window.setTimeout(() => cloud.resize(), 300);
    updateNav();
  });

  document.querySelector("#haveCipherButton").addEventListener("click", () => {
    checkpoint.classList.add("hidden");
    clues.forEach((c) => c.classList.remove("active"));
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
        clues.forEach((c) => c.classList.remove("active"));
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

  /* ---------- навигация между уликами (возврат к решённым) ---------- */
  clues.forEach((clue, i) => {
    const nav = document.createElement("div");
    nav.className = "clue-nav";
    const prev = document.createElement("button");
    prev.className = "nav-button nav-prev";
    prev.type = "button";
    if (i > 0) {
      prev.textContent = `← Улика 0${i}`;
      prev.addEventListener("click", () => goTo(i - 1));
    } else {
      prev.style.visibility = "hidden";
    }
    const next = document.createElement("button");
    next.className = "nav-button nav-next";
    next.type = "button";
    if (i < clues.length - 1) {
      next.textContent = `Улика 0${i + 2} →`;
      next.addEventListener("click", () => goTo(i + 1));
    }
    next.style.visibility = "hidden";
    nav.appendChild(prev);
    nav.appendChild(next);
    clue.appendChild(nav);
  });

  /* ---------- навигация через цифры прогресса ---------- */
  digitSlots.forEach((slot) => {
    slot.addEventListener("click", () => {
      const target = Number(slot.dataset.clueJump);
      if (Number.isNaN(target)) return;
      const solved = clues[target].dataset.solved === "1";
      const currentActive = clues.findIndex((c) => c.classList.contains("active"));
      if (solved || target === currentActive) goTo(target);
    });
  });
  // при старте (клик по #startButton) первая улика активна → цифра 0 доступна
  updateNav();

  /* ---------- восстановление прогресса ---------- */
  function restore() {
    const data = loadSaved();
    if (!data) return;
    const n = Math.max(0, Math.min(4, data.solved | 0));

    for (let i = 0; i < n; i += 1) {
      const clue = clues[i];
      clue.dataset.solved = "1";
      clue.classList.remove("active");
      digitSlots[i].querySelector("span").textContent = expectedDigits[i];
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
    updateNav();

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
