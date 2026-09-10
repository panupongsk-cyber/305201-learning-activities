(function () {
  const BASE_MINUTES = 60;
  const GAME_SECONDS = 35 * 60;
  const STORAGE_PREFIX = "activity-state-305201-";
  const params = new URLSearchParams(window.location.search);
  const isInstructor = params.get("mode") !== "student";

  const topics = window.ACTIVITY_TOPICS || [];
  const topicById = Object.create(null);
  const topicBySlug = Object.create(null);
  topics.forEach((topic) => {
    topicById[topic.id] = topic;
    topicBySlug[topic.slug] = topic.id;
  });

  const byPath = () => {
    if (window.ACTIVITY_TOPIC_ID && topicById[window.ACTIVITY_TOPIC_ID]) {
      return window.ACTIVITY_TOPIC_ID;
    }
    const pathMatch = window.location.pathname.match(/(topic-\d{2}-[a-z0-9-]+)/);
    if (pathMatch && topicBySlug[pathMatch[1]]) {
      return topicBySlug[pathMatch[1]];
    }
    return null;
  };

  const save = (topicId, state) => {
    localStorage.setItem(`${STORAGE_PREFIX}${topicId}`, JSON.stringify(state));
  };

  const load = (topicId) => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${topicId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.version === 1) return parsed;
    } catch (e) {
      return null;
    }
    return null;
  };

  const newState = () => ({
    version: 1,
    timerSeconds: GAME_SECONDS,
    timerRunning: false,
    teams: [],
    teamScores: {},
    activeCardIndex: 0,
    logs: [],
    evidence: {
      board: "",
      decisions: "",
      reflection: "",
      exit1: "",
      exit2: "",
      exit3: "",
    },
  });

  const getState = (topicId) => {
    const loaded = load(topicId);
    return loaded || newState();
  };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const formatClock = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  function addChip(row, text, className = "chip chip--outline") {
    const chip = el("span", className, text);
    row.appendChild(chip);
  }

  function renderTopicHub(root) {
    const section = el("section", "container");
    const head = el("section", "hero");
    head.appendChild(el("h1", "title", "Learning Activities – วิชา 305201"));
    head.appendChild(el("p", "description", "เลือกหัวข้อเป็นคาบเรียนแบบเกม ไม่แบ่งตาม week และคงเวลา 60 นาที"));
    head.appendChild(el("p", "facilitator-note", "ผู้สอนเป็นผู้เปิดกิจกรรม ควบคุมจังหวะ และฉายหน้าจอหลักให้ทั้งชั้นเรียน"));
    head.appendChild(el("p", "duration-row", `รูปแบบคาบ: Check-in 5 + Mini-lesson 10 + Game 35 + Debrief 5 + Exit ticket 5 (รวม ${BASE_MINUTES} นาที)`));
    section.appendChild(head);

    const grid = el("section", "topics-grid");
    topics.forEach((topic) => {
      const card = el("article", "topic-card");
      const top = el("div", "topic-card__top");
      addChip(top, topic.module);
      addChip(top, `${topic.clos.length} CLO`, "pill");
      card.appendChild(top);
      card.appendChild(el("h2", "topic-title", `${topic.id}: ${topic.title}`));
      card.appendChild(el("p", "topic-focus", topic.focus));
      card.appendChild(el("p", "topic-scenario", topic.scenario));
      const chips = el("div", "chip-row");
      topic.clos.forEach((c) => addChip(chips, c));
      card.appendChild(chips);
      const go = el("a", "btn", "เปิดโหมดผู้สอน");
      go.href = `${topic.id}-${topic.slug}.html?mode=instructor`;
      card.appendChild(go);
      grid.appendChild(card);
    });

    section.appendChild(grid);
    root.appendChild(section);
  }

  function buildDefaultTeams(state, people, groupSize, teamCount, nameText) {
    const names = nameText
      .split(/\r?\n/)
      .map((n) => n.trim())
      .filter(Boolean);

    const count = Math.max(2, Number(teamCount) || 4);
    const actualGroupCount = count;
    const groupMap = [];
    for (let i = 0; i < actualGroupCount; i += 1) {
      groupMap.push({ name: `ทีมที่ ${i + 1}`, members: [] });
    }

    if (names.length) {
      const pool = shuffle(names);
      pool.forEach((name, idx) => {
        groupMap[idx % actualGroupCount].members.push(name);
      });
      return groupMap;
    }

    const total = Math.max(10, Number(people) || 80);
    const each = Math.max(2, actualGroupCount);
    for (let i = 1; i <= total; i += 1) {
      const teamIndex = (i - 1) % each;
      const teamLabel = groupMap[teamIndex].name;
      const idx = parseInt(teamLabel.replace(/[^0-9]/g, ""), 10) - 1;
      groupMap[idx].members.push(`นักเรียน-${String(i).padStart(2, "0")}`);
    }
    return groupMap;
  }

  function renderTopicPage(root, topic, state) {
    const topicRoot = el("section", "container");

    const head = el("section", "hero");
    const back = el("a", "back-link", "← กลับหน้าเลือกหัวข้อ");
    back.href = "./index.html";
    head.appendChild(back);
    head.appendChild(el("p", "subtitle", "Learning Activity เกมแบบ 60 นาที"));
    head.appendChild(el("h1", "title", `${topic.id}: ${topic.title}`));
    const meta = el("div", "meta-row");
    addChip(meta, topic.module, "pill");
    addChip(meta, `CLO: ${topic.clos.join(", ")}`, "pill");
    head.appendChild(meta);
    head.appendChild(el("p", "duration-row", "เวลา: 5/10/35/5/5 = 60 นาที"));
    head.appendChild(el("p", "focus", topic.focus));
    head.appendChild(el("p", "scenario", topic.scenario));
    head.appendChild(el("p", "game-title", `ภารกิจ: ${topic.gameTitle}`));
    head.appendChild(el(
      "p",
      "facilitator-note",
      isInstructor
        ? "โหมดผู้สอน: ใช้ปุ่มด้านล่างเพื่อเปิดกิจกรรมทีละช่วง แล้วให้ผู้เรียนร่วมคิดจากหน้าจอที่ฉาย"
        : "มุมมองสังเกต: หน้านี้แสดงเนื้อหาโดยไม่มีตัวควบคุม ผู้เรียนไม่จำเป็นต้องใช้งานเว็บไซต์"
    ));

    const facilitator = el("section", "facilitator-panel");
    facilitator.hidden = !isInstructor;
    facilitator.appendChild(el("h2", "section-title", "แผงควบคุมจังหวะการสอน"));
    facilitator.appendChild(el("p", "helper", "ผู้สอนเป็นผู้เปลี่ยนช่วงกิจกรรมจากหน้าจอนี้เพียงคนเดียว"));
    const phases = [
      { label: "1. Check-in และจัดกลุ่ม", description: "เปิดบริบท ชี้เป้าหมาย และจัดทีมก่อนเริ่มเกม" },
      { label: "2. เปิดเกม", description: "ฉาย Mission Card ให้ทีมอภิปรายและตัดสินใจ" },
      { label: "3. Debrief และหลักฐาน", description: "ชวนทั้งชั้นสะท้อนผลและบันทึกหลักฐานร่วมกัน" },
      { label: "4. Exit ticket", description: "เปิดคำถามปิดคาบและสรุปการเรียนรู้" },
    ];
    const phaseControls = el("div", "phase-controls");
    const phaseStatus = el("p", "phase-status");
    const phaseButtons = [];
    phases.forEach((phase, index) => {
      const button = el("button", "phase-button", phase.label);
      button.type = "button";
      button.dataset.phase = String(index);
      phaseButtons.push(button);
      phaseControls.appendChild(button);
    });
    facilitator.appendChild(phaseControls);
    facilitator.appendChild(phaseStatus);

    const two = el("section", "two-col");

    // Left side
    const left = el("section", "panel");

    const timerPanel = el("div", "timer-wrap");
    timerPanel.appendChild(el("h2", "section-title", "ตัวจับเวลาเกม"));
    const timerText = el("div", "timer-display", formatClock(state.timerSeconds));
    const timerBtns = el("div", "button-row");
    const btnStart = el("button", "btn", "เริ่ม");
    const btnPause = el("button", "btn btn-sub", "หยุด");
    const btnReset = el("button", "btn btn-sub", "รีเซ็ต");
    timerBtns.appendChild(btnStart);
    timerBtns.appendChild(btnPause);
    timerBtns.appendChild(btnReset);
    timerPanel.appendChild(timerText);
    timerPanel.appendChild(timerBtns);
    timerPanel.appendChild(el("p", "helper", "จับเวลาเฉพาะเกมช่วง 35 นาที"));

    const groupPanel = el("div", "group-wrap");
    groupPanel.appendChild(el("h2", "section-title", "การจัดกลุ่ม"));
    const cfg = el("div", "form-grid");

    const f1 = el("label", "field");
    f1.appendChild(el("span", "field-label", "จำนวนนักเรียน"));
    const inStudents = el("input", "input");
    inStudents.type = "number";
    inStudents.min = 20;
    inStudents.max = 120;
    inStudents.value = 80;
    f1.appendChild(inStudents);

    const f2 = el("label", "field");
    f2.appendChild(el("span", "field-label", "จำนวนต่อกลุ่ม"));
    const inSize = el("input", "input");
    inSize.type = "number";
    inSize.min = 3;
    inSize.max = 12;
    inSize.value = 4;
    f2.appendChild(inSize);

    const f3 = el("label", "field");
    f3.appendChild(el("span", "field-label", "จำนวนกลุ่ม"));
    const inGroup = el("input", "input");
    inGroup.type = "number";
    inGroup.min = 2;
    inGroup.max = 20;
    inGroup.value = 4;
    f3.appendChild(inGroup);

    const f4 = el("label", "field full");
    f4.appendChild(el("span", "field-label", "รายชื่อนักเรียน (บรรทัดละชื่อ, ไม่บังคับ)"));
    const inNames = el("textarea", "textarea");
    inNames.rows = 4;
    inNames.placeholder = "นักเรียน A\nนักเรียน B\n...";
    f4.appendChild(inNames);

    cfg.appendChild(f1);
    cfg.appendChild(f2);
    cfg.appendChild(f3);
    cfg.appendChild(f4);

    const btnGroup = el("button", "btn", "สุ่มจัดกลุ่ม");
    const teamList = el("div", "team-list");

    const renderTeamList = () => {
      teamList.innerHTML = "";
      state.teams.forEach((team, idx) => {
        teamList.appendChild(el("span", "chip chip--team", `${idx + 1}. ${team.name}`));
      });
      if (!state.teams.length) {
        teamList.appendChild(el("p", "helper", "ยังไม่จัดกลุ่ม"));
      }
    };

    btnGroup.addEventListener("click", () => {
      const people = inStudents.value || 80;
      const groupSize = inSize.value || 4;
      const groupCount = inGroup.value || 4;
      const names = inNames.value;
      state.teams = buildDefaultTeams(state, Number(people), Number(groupSize), Number(groupCount), names);
      state.teams = state.teams.map((team, i) => ({ ...team, name: team.name || `ทีมที่ ${i + 1}` }));
      state.teamScores = state.teams.reduce((acc, team) => {
        acc[team.name] = Number.isFinite(Number(state.teamScores[team.name])) ? Number(state.teamScores[team.name]) : 0;
        return acc;
      }, {});
      renderTeamList();
      renderTeamOptions();
      renderScoreBoard();
      save(topic.id, state);
    });

    groupPanel.appendChild(cfg);
    groupPanel.appendChild(btnGroup);
    groupPanel.appendChild(teamList);

    left.appendChild(timerPanel);
    left.appendChild(groupPanel);

    // Right side game
    const right = el("section", "panel");
    const game = el("div", "game-wrap");
    game.appendChild(el("h2", "section-title", "Mission Card"));
    const cardCounter = el("p", "helper", "ยังไม่เริ่ม");
    const cardBody = el("div", "card");
    const cardPrompt = el("p", "card-text", "กดปุ่มสุ่มเพื่อเปิดบัตรภารกิจ");
    const options = el("div", "button-row");
    const cardOutcome = el("p", "card-result");
    cardBody.appendChild(cardPrompt);
    cardBody.appendChild(options);
    cardBody.appendChild(cardOutcome);

    const teamPicker = el("select", "select");
    const renderTeamOptions = () => {
      teamPicker.innerHTML = "";
      state.teams.forEach((team) => {
        const o = el("option", "", team.name);
        o.value = team.name;
        o.textContent = team.name;
        teamPicker.appendChild(o);
      });
      if (!state.teams.length) {
        const o = el("option", "", "ทีมยังไม่จัด");
        o.value = "ทีมยังไม่จัด";
        teamPicker.appendChild(o);
      }
    };

    const scorePanel = el("div", "score-panel");
    scorePanel.appendChild(el("h3", "section-title", "คะแนนทีม"));
    const scoreList = el("ul", "score-list");

    const renderScoreBoard = () => {
      scoreList.innerHTML = "";
      if (!state.teams.length) {
        scoreList.appendChild(el("li", "helper", "ยังไม่มีข้อมูลคะแนน"));
        return;
      }
      state.teams.forEach((team) => {
        scoreList.appendChild(el("li", "", `${team.name}: ${state.teamScores[team.name] || 0} คะแนน`));
      });
    };

    const btnCard = el("button", "btn", "สุ่มบัตรถัดไป");

    const drawCard = () => {
      if (!topic.challengeCards || topic.challengeCards.length === 0) {
        return;
      }
      const idx = state.activeCardIndex % topic.challengeCards.length;
      const card = topic.challengeCards[idx];
      state.activeCardIndex = idx + 1;
      cardCounter.textContent = `บัตร ${idx + 1} / ${topic.challengeCards.length}`;
      cardPrompt.textContent = card.prompt;
      cardOutcome.textContent = "";
      options.innerHTML = "";
      card.options.forEach((opt) => {
        const button = el("button", "btn btn-sub", opt.text);
        button.addEventListener("click", () => {
          const selected = teamPicker.value || "ทีมที่ 1";
          state.teamScores[selected] = (state.teamScores[selected] || 0) + opt.score;
          state.logs.unshift({
            time: new Date().toLocaleTimeString("th-TH", { hour12: false }),
            team: selected,
            card: card.prompt,
            choice: opt.text,
            score: opt.score,
          });
          cardOutcome.textContent = `ผลลัพธ์: ${opt.result}`;
          renderScoreBoard();
          renderLog();
          save(topic.id, state);
        });
        options.appendChild(button);
      });
      save(topic.id, state);
    };

    btnCard.addEventListener("click", drawCard);

    game.appendChild(cardCounter);
    game.appendChild(cardBody);
    game.appendChild(teamPicker);
    game.appendChild(btnCard);
    scorePanel.appendChild(scoreList);
    game.appendChild(scorePanel);
    right.appendChild(game);

    const evidence = el("section", "panel");
    evidence.appendChild(el("h2", "section-title", "Evidence และ Exit Ticket"));

    const row1 = el("label", "field full");
    row1.appendChild(el("span", "field-label", "หลักฐานทีม"));
    const evidenceBoard = el("textarea", "textarea");
    evidenceBoard.rows = 4;
    evidenceBoard.value = state.evidence.board;
    row1.appendChild(evidenceBoard);

    const row2 = el("label", "field full");
    row2.appendChild(el("span", "field-label", "การตัดสินใจสำคัญ"));
    const evidenceDecision = el("textarea", "textarea");
    evidenceDecision.rows = 3;
    evidenceDecision.value = state.evidence.decisions;
    row2.appendChild(evidenceDecision);

    const row3 = el("label", "field full");
    row3.appendChild(el("span", "field-label", "Reflection ของทีม"));
    const evidenceReflection = el("textarea", "textarea");
    evidenceReflection.rows = 3;
    evidenceReflection.value = state.evidence.reflection;
    row3.appendChild(evidenceReflection);

    const q1 = el("textarea", "textarea");
    q1.rows = 2;
    q1.value = state.evidence.exit1;
    q1.placeholder = "1) สิ่งที่ได้เรียนรู้วันนี้คืออะไร";

    const q2 = el("textarea", "textarea");
    q2.rows = 2;
    q2.value = state.evidence.exit2;
    q2.placeholder = "2) อย่างต่อไปทีมจะปรับปรุงอย่างไร";

    const q3 = el("textarea", "textarea");
    q3.rows = 2;
    q3.value = state.evidence.exit3;
    q3.placeholder = "3) CLO ที่คุณรู้สึกว่าพัฒนามากที่สุด";

    const logTitle = el("h3", "section-title", "Action Log");
    const logView = el("pre", "log");

    const renderLog = () => {
      if (!state.logs.length) {
        logView.textContent = "ยังไม่มีการกระทำ";
        return;
      }
      logView.textContent = state.logs
        .slice(0, 20)
        .map((item) => `${item.time} | ${item.team} | ${item.card} | ${item.choice} (${item.score >= 0 ? "+" : ""}${item.score})`)
        .join("\n");
    };

    const btnSave = el("button", "btn", "บันทึกข้อมูล");
    const btnExport = el("button", "btn btn-sub", "Export JSON");

    const btnRow = el("div", "button-row");
    btnRow.appendChild(btnSave);
    btnRow.appendChild(btnExport);

    [evidenceBoard, evidenceDecision, evidenceReflection, q1, q2, q3].forEach((field) => {
      field.addEventListener("input", () => {
        state.evidence.board = evidenceBoard.value;
        state.evidence.decisions = evidenceDecision.value;
        state.evidence.reflection = evidenceReflection.value;
        state.evidence.exit1 = q1.value;
        state.evidence.exit2 = q2.value;
        state.evidence.exit3 = q3.value;
        save(topic.id, state);
      });
    });

    btnSave.addEventListener("click", () => {
      state.evidence.board = evidenceBoard.value;
      state.evidence.decisions = evidenceDecision.value;
      state.evidence.reflection = evidenceReflection.value;
      state.evidence.exit1 = q1.value;
      state.evidence.exit2 = q2.value;
      state.evidence.exit3 = q3.value;
      save(topic.id, state);
      btnSave.textContent = "บันทึกแล้ว";
      setTimeout(() => {
        btnSave.textContent = "บันทึกข้อมูล";
      }, 1000);
    });

    btnExport.addEventListener("click", () => {
      const payload = {
        course: "305201",
        topicId: topic.id,
        title: topic.title,
        clos: topic.clos,
        exportedAt: new Date().toISOString(),
        teams: state.teams,
        teamScores: state.teamScores,
        evidence: state.evidence,
        logs: state.logs,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${topic.id}-learning-activity.json`;
      link.click();
      URL.revokeObjectURL(url);
    });

    const btnStartTimer = (start) => {
      if (start) {
        state.timerRunning = true;
      } else {
        state.timerRunning = false;
      }
    };

    let tick = null;
    btnStart.addEventListener("click", () => {
      if (tick) return;
      btnStartTimer(true);
      tick = setInterval(() => {
        state.timerSeconds = Math.max(0, state.timerSeconds - 1);
        timerText.textContent = formatClock(state.timerSeconds);
        if (state.timerSeconds <= 0) {
          clearInterval(tick);
          tick = null;
          btnStartTimer(false);
          timerText.classList.add("time-over");
        }
        save(topic.id, state);
      }, 1000);
      save(topic.id, state);
    });

    btnPause.addEventListener("click", () => {
      if (!tick) return;
      clearInterval(tick);
      tick = null;
      btnStartTimer(false);
      save(topic.id, state);
    });

    btnReset.addEventListener("click", () => {
      if (tick) {
        clearInterval(tick);
        tick = null;
      }
      state.timerSeconds = GAME_SECONDS;
      timerText.classList.remove("time-over");
      timerText.textContent = formatClock(state.timerSeconds);
      btnStartTimer(false);
      save(topic.id, state);
    });

    two.appendChild(left);
    two.appendChild(right);

    evidence.appendChild(row1);
    evidence.appendChild(row2);
    evidence.appendChild(row3);
    evidence.appendChild(logTitle);
    evidence.appendChild(logView);
    const exitSection = el("section", "exit-section");
    exitSection.appendChild(el("h3", "section-title", "Exit ticket"));
    exitSection.appendChild(q1);
    exitSection.appendChild(q2);
    exitSection.appendChild(q3);
    exitSection.appendChild(btnRow);
    evidence.appendChild(exitSection);

    const setPhase = (nextPhase) => {
      const phase = Math.max(0, Math.min(phases.length - 1, nextPhase));
      right.hidden = phase < 1;
      evidence.hidden = phase < 2;
      exitSection.hidden = phase < 3;
      phaseStatus.textContent = phases[phase].description;
      phaseButtons.forEach((button, index) => {
        button.classList.toggle("is-active", index === phase);
        button.setAttribute("aria-pressed", String(index === phase));
      });
    };

    phaseButtons.forEach((button, index) => {
      button.addEventListener("click", () => setPhase(index));
    });

    topicRoot.appendChild(head);
    topicRoot.appendChild(facilitator);
    topicRoot.appendChild(two);
    topicRoot.appendChild(evidence);

    root.appendChild(topicRoot);

    renderTeamList();
    renderTeamOptions();
    renderScoreBoard();
    renderLog();
    drawCard();
    timerText.textContent = formatClock(state.timerSeconds);
    if (!state.teams.length && topic.id) {
      // ตั้งโครงทีมเบื้องต้นอัตโนมัติ
      state.teams = buildDefaultTeams(state, 80, 4, 4, "");
      state.teamScores = state.teams.reduce((acc, team) => {
        acc[team.name] = 0;
        return acc;
      }, {});
      renderTeamList();
      renderTeamOptions();
      renderScoreBoard();
    }
    setPhase(isInstructor ? 0 : phases.length - 1);
  }

  const init = () => {
    document.body.classList.add(isInstructor ? "instructor-mode" : "observer-mode");
    const root = document.getElementById("activity-root");
    if (!root) return;

    if (document.body.dataset.mode === "hub") {
      renderTopicHub(root);
      return;
    }

    const topicId = byPath();
    const topic = topicById[topicId];
    if (!topic) {
      root.appendChild(el("h1", "title", "ไม่พบข้อมูล Topic"));
      return;
    }

    const state = getState(topic.id);
    renderTopicPage(root, topic, state);
    save(topic.id, state);
  };

  document.addEventListener("DOMContentLoaded", init);
})();
