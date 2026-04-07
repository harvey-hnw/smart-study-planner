let courses = [];

const DAY_RE =
  /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i;

/** @returns {{ day: string, startMin: number, endMin: number } | null} */
function parseSchedule(timeStr) {
  const raw = timeStr.trim();
  const dm = raw.match(DAY_RE);
  const day = dm ? dm[1].slice(0, 3).toLowerCase() : null;
  const rest = dm ? raw.slice(dm[0].length).trim() : raw;

  const rm = rest.match(
    /(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?/
  );
  if (!rm || !day) return null;

  let h1 = parseInt(rm[1], 10);
  const m1 = rm[2] ? parseInt(rm[2], 10) : 0;
  let h2 = parseInt(rm[3], 10);
  const m2 = rm[4] ? parseInt(rm[4], 10) : 0;

  let startMin = h1 * 60 + m1;
  let endMin = h2 * 60 + m2;

  if (endMin <= startMin) {
    if (h2 <= 12) {
      h2 += 12;
      endMin = h2 * 60 + m2;
    } else {
      endMin += 24 * 60;
    }
  }

  return { day, startMin, endMin };
}

function rangesOverlap(a, b) {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

function schedulesClash(t1, t2) {
  if (t1 === t2) return true;
  const p1 = parseSchedule(t1);
  const p2 = parseSchedule(t2);
  if (p1 && p2 && p1.day === p2.day) {
    return rangesOverlap(
      { startMin: p1.startMin, endMin: p1.endMin },
      { startMin: p2.startMin, endMin: p2.endMin }
    );
  }
  return false;
}

function addCourse() {
  const name = document.getElementById("courseName").value.trim();
  const time = document.getElementById("courseTime").value.trim();

  if (!name || !time) return;

  courses.push({ name, time });
  document.getElementById("courseName").value = "";
  document.getElementById("courseTime").value = "";

  renderCourses();
}

function renderCourses() {
  const list = document.getElementById("courseList");
  list.innerHTML = "";

  courses.forEach((course, index) => {
    const li = document.createElement("li");
    const clash = checkClash(course, index);

    const label = document.createElement("span");
    label.textContent = `${course.name} (${course.time})`;
    if (clash) {
      li.classList.add("clash");
      label.textContent += " — clash";
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Delete";
    btn.onclick = () => {
      courses.splice(index, 1);
      renderCourses();
    };

    li.appendChild(label);
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function checkClash(course, index) {
  for (let i = 0; i < courses.length; i++) {
    if (i === index) continue;
    if (schedulesClash(course.time, courses[i].time)) return true;
  }
  return false;
}
