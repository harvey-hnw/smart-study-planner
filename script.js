const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const GRID_START_HOUR = 8;
const GRID_END_HOUR = 20;
const SLOT_MINUTES = 15; // render at 15-min resolution so blocks are continuous
const STORAGE_KEY = "smart-study-planner.courses";
let courses = loadCourses();

function loadCourses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
}

function saveCourses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
}

function toMinutes(timeValue) {
  const [h, m] = timeValue.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatRange(course) {
  return `${course.day} ${formatTime(course.startMin)}-${formatTime(course.endMin)}`;
}

function rangesOverlap(a, b) {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

function coursesClash(a, b) {
  return a.day === b.day && rangesOverlap(a, b);
}

function addCourse() {
  const nameInput = document.getElementById("courseName");
  const dayInput = document.getElementById("courseDay");
  const startInput = document.getElementById("startTime");
  const endInput = document.getElementById("endTime");

  const name = nameInput.value.trim();
  const day = dayInput.value;
  const startTime = startInput.value;
  const endTime = endInput.value;

  if (!name || !day || !startTime || !endTime) {
    alert("Please fill in course name, day, start, and end time.");
    return;
  }

  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);

  if (endMin <= startMin) {
    alert("End time must be after start time.");
    return;
  }

  courses.push({ name, day, startMin, endMin });
  saveCourses();
  nameInput.value = "";
  render();
}

function deleteCourse(index) {
  courses.splice(index, 1);
  saveCourses();
  render();
}

function clearAllCourses() {
  if (courses.length === 0) return;
  const ok = confirm("Clear all courses?");
  if (!ok) return;
  courses = [];
  saveCourses();
  render();
}

function hasClashAt(index) {
  for (let i = 0; i < courses.length; i++) {
    if (i === index) continue;
    if (coursesClash(courses[index], courses[i])) return true;
  }
  return false;
}

function renderCourses() {
  const list = document.getElementById("courseList");
  list.innerHTML = "";

  if (courses.length === 0) {
    const empty = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = "No courses yet. Add your first class above.";
    empty.appendChild(label);
    list.appendChild(empty);
    return;
  }

  courses.forEach((course, index) => {
    const li = document.createElement("li");
    const clash = hasClashAt(index);

    const label = document.createElement("span");
    label.textContent = `${course.name} (${formatRange(course)})`;
    if (clash) {
      li.classList.add("clash");
      label.textContent += " - clash";
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Delete";
    btn.onclick = () => deleteCourse(index);

    li.appendChild(label);
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function renderWeeklyGrid() {
  const grid = document.getElementById("weeklyGrid");
  grid.innerHTML = "";

  const hours = GRID_END_HOUR - GRID_START_HOUR;
  const totalSlots = (hours * 60) / SLOT_MINUTES;
  const startGlobalMin = GRID_START_HOUR * 60;

  // row 1 is the header; rows 2.. are 15-min slots
  grid.style.gridTemplateRows = `auto repeat(${totalSlots}, 22px)`;

  // Header row
  const timeHead = document.createElement("div");
  timeHead.className = "cell-head";
  timeHead.style.gridColumn = "1";
  timeHead.style.gridRow = "1";
  timeHead.textContent = "Time";
  grid.appendChild(timeHead);

  DAYS.forEach((day, idx) => {
    const cell = document.createElement("div");
    cell.className = "cell-head";
    cell.style.gridColumn = String(2 + idx);
    cell.style.gridRow = "1";
    cell.textContent = day;
    grid.appendChild(cell);
  });

  // Slot background cells + hourly labels
  for (let s = 0; s < totalSlots; s++) {
    const absMin = startGlobalMin + s * SLOT_MINUTES;
    const hour = Math.floor(absMin / 60);
    const hourIndex = hour - GRID_START_HOUR;
    const slotInHour = s - hourIndex * (60 / SLOT_MINUTES);

    // Only show the hour label once per hour (at the first slot of that hour)
    const isFirstSlotOfHour = slotInHour === 0;
    if (isFirstSlotOfHour) {
      const hourCell = document.createElement("div");
      hourCell.className = "time-col";
      hourCell.style.gridColumn = "1";
      hourCell.style.gridRow = `${2 + s} / ${2 + s + 60 / SLOT_MINUTES}`;
      hourCell.textContent = `${String(hour).padStart(2, "0")}:00`;
      grid.appendChild(hourCell);
    }

    DAYS.forEach((_day, dayIdx) => {
      const cell = document.createElement("div");
      cell.className = "slot-cell";
      cell.style.gridColumn = String(2 + dayIdx);
      cell.style.gridRow = String(2 + s);
      grid.appendChild(cell);
    });
  }

  // Course pills spanning their full duration
  courses.forEach((course, index) => {
    const dayIdx = DAYS.indexOf(course.day);
    if (dayIdx === -1) return;

    // convert minutes to slot indices (snap to slot boundaries)
    const startSlot = Math.floor((course.startMin - startGlobalMin) / SLOT_MINUTES);
    const endSlot = Math.ceil((course.endMin - startGlobalMin) / SLOT_MINUTES);

    const clampedStart = Math.max(0, Math.min(totalSlots, startSlot));
    const clampedEnd = Math.max(0, Math.min(totalSlots, endSlot));
    if (clampedEnd <= clampedStart) return;

    const pill = document.createElement("div");
    pill.className = `pill ${hasClashAt(index) ? "clash-pill" : ""}`;
    pill.style.gridColumn = String(2 + dayIdx);
    pill.style.gridRow = `${2 + clampedStart} / ${2 + clampedEnd}`;
    pill.textContent = `${course.name}`;

    grid.appendChild(pill);
  });
}

function render() {
  renderCourses();
  renderWeeklyGrid();
}

document.getElementById("addCourseBtn").addEventListener("click", addCourse);
document.getElementById("clearAllBtn").addEventListener("click", clearAllCourses);
render();
