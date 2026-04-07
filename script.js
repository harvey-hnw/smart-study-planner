/**
 * Smart Study Planner - Logic Refactor
 * Implements centralized state management and overlap detection.
 */

const CONFIG = {
  DAYS: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  START_HOUR: 8,
  END_HOUR: 20,
  RES_MINS: 15, // 15-minute intervals
  STORAGE_KEY: "unsw_study_planner_data"
};

let courses = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || [];

// --- Logic Utilities ---

const toMins = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const formatTime = (m) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
};

const checkOverlap = (a, b) => {
  return a.day === b.day && a.startMin < b.endMin && b.startMin < a.endMin;
};

const hasClash = (idx) => {
  return courses.some((c, i) => i !== idx && checkOverlap(courses[idx], c));
};

// --- Actions ---

function addCourse() {
  const name = document.getElementById("courseName").value.trim();
  const day = document.getElementById("courseDay").value;
  const start = toMins(document.getElementById("startTime").value);
  const end = toMins(document.getElementById("endTime").value);

  if (!name || isNaN(start) || isNaN(end)) return alert("Please fill all fields");
  if (end <= start) return alert("End time must be after start time");

  courses.push({ name, day, startMin: start, endMin: end });
  syncAndRender();
  document.getElementById("courseName").value = "";
}

function syncAndRender() {
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(courses));
  render();
}

function exportCSV() {
  if (courses.length === 0) return;
  const head = "Course,Day,Start,End,Status\n";
  const body = courses.map((c, i) => {
    const status = hasClash(i) ? "CLASH" : "OK";
    return `${c.name},${c.day},${formatTime(c.startMin)},${formatTime(c.endMin)},${status}`;
  }).join("\n");
  
  const blob = new Blob([head + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my_study_schedule.csv';
  a.click();
}

// --- UI Rendering ---

function render() {
  const list = document.getElementById("courseList");
  const grid = document.getElementById("weeklyGrid");
  
  // Render List
  list.innerHTML = courses.length ? "" : "<li style='color:var(--text-muted)'>No classes added.</li>";
  courses.forEach((c, i) => {
    const li = document.createElement("li");
    li.className = `card ${hasClash(i) ? 'clash' : ''}`;
    li.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; padding:0.5rem";
    li.innerHTML = `
      <div style="font-size:0.85rem"><strong>${c.name}</strong><br>${c.day} ${formatTime(c.startMin)}-${formatTime(c.endMin)}</div>
      <button onclick="deleteCourse(${i})" style="color:var(--danger); padding:4px">✕</button>
    `;
    list.appendChild(li);
  });

  // Render Grid
  grid.innerHTML = "";
  const totalSlots = ((CONFIG.END_HOUR - CONFIG.START_HOUR) * 60) / CONFIG.RES_MINS;
  grid.style.gridTemplateRows = `auto repeat(${totalSlots}, 20px)`;

  // Headers
  grid.innerHTML += `<div class="cell-head">Time</div>`;
  CONFIG.DAYS.forEach(d => grid.innerHTML += `<div class="cell-head">${d}</div>`);

  // Time labels & empty slots
  for (let i = 0; i < totalSlots; i++) {
    const mins = CONFIG.START_HOUR * 60 + i * CONFIG.RES_MINS;
    if (mins % 60 === 0) {
      const label = document.createElement("div");
      label.className = "time-col";
      label.style.gridRow = `${i + 2} / span 4`;
      label.textContent = formatTime(mins);
      grid.appendChild(label);
    }
    // Background slots
    CONFIG.DAYS.forEach((_, dIdx) => {
      const slot = document.createElement("div");
      slot.className = "slot-cell";
      slot.style.gridColumn = dIdx + 2;
      slot.style.gridRow = i + 2;
      grid.appendChild(slot);
    });
  }

  // Pills
  courses.forEach((c, i) => {
    const dIdx = CONFIG.DAYS.indexOf(c.day);
    if (dIdx === -1) return;
    
    const startSlot = (c.startMin - CONFIG.START_HOUR * 60) / CONFIG.RES_MINS;
    const endSlot = (c.endMin - CONFIG.START_HOUR * 60) / CONFIG.RES_MINS;

    const pill = document.createElement("div");
    pill.className = `pill ${hasClash(i) ? 'clash-pill' : ''}`;
    pill.style.gridColumn = dIdx + 2;
    pill.style.gridRow = `${Math.floor(startSlot) + 2} / ${Math.floor(endSlot) + 2}`;
    pill.textContent = c.name;
    grid.appendChild(pill);
  });
}

window.deleteCourse = (i) => { courses.splice(i, 1); syncAndRender(); };
document.getElementById("addCourseBtn").addEventListener("click", addCourse);
document.getElementById("downloadCsv").addEventListener("click", exportCSV);
document.getElementById("clearAllBtn").addEventListener("click", () => { if(confirm("Clear schedule?")) { courses=[]; syncAndRender(); } });

render();