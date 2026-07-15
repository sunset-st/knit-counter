const STORAGE_KEY = "knitCounterProjects";

function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

let projects = loadProjects();
let currentId = null;

const app = document.getElementById("app");
const topTitle = document.getElementById("topTitle");

function findProject(id) {
  return projects.find((p) => p.id === id);
}

function renderList() {
  currentId = null;
  topTitle.textContent = "뜨개 단수 카운터";
  const tpl = document.getElementById("project-list-template");
  app.innerHTML = "";
  app.appendChild(tpl.content.cloneNode(true));

  const items = document.getElementById("projectItems");
  const itemTpl = document.getElementById("project-item-template");

  if (projects.length === 0) {
    const hint = document.createElement("p");
    hint.className = "empty-hint";
    hint.textContent = "진행 중인 프로젝트가 없어요. 새 프로젝트를 추가해보세요.";
    items.appendChild(hint);
  }

  projects.forEach((p) => {
    const node = itemTpl.content.cloneNode(true);
    node.querySelector(".project-name").textContent = p.name;
    node.querySelector(".project-row").textContent = `${p.row}단`;
    node.querySelector(".project-open").addEventListener("click", () => renderCounter(p.id));
    node.querySelector(".project-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(`"${p.name}" 프로젝트를 삭제할까요?`)) {
        projects = projects.filter((x) => x.id !== p.id);
        saveProjects(projects);
        renderList();
      }
    });
    items.appendChild(node);
  });

  document.getElementById("addProjectBtn").addEventListener("click", () => {
    const name = prompt("프로젝트 이름을 입력하세요");
    if (!name) return;
    const newProject = { id: Date.now().toString(), name: name.trim(), row: 0, repeat: 0 };
    projects.push(newProject);
    saveProjects(projects);
    renderCounter(newProject.id);
  });
}

function updateRepeatNote(project) {
  const note = document.getElementById("repeatNote");
  if (!project.repeat || project.repeat <= 0) {
    note.textContent = "";
    note.classList.remove("alert");
    return;
  }
  const remainder = project.row % project.repeat;
  if (project.row > 0 && remainder === 0) {
    note.textContent = `${project.repeat}단마다 알림! 지금이 그 단이에요.`;
    note.classList.add("alert");
  } else {
    const remaining = project.repeat - remainder;
    note.textContent = `다음 알림까지 ${remaining}단 남음 (${project.repeat}단마다)`;
    note.classList.remove("alert");
  }
}

function renderCounter(id) {
  currentId = id;
  const project = findProject(id);
  if (!project) return renderList();

  topTitle.textContent = "뜨개 단수 카운터";
  const tpl = document.getElementById("counter-template");
  app.innerHTML = "";
  app.appendChild(tpl.content.cloneNode(true));

  document.getElementById("counterName").textContent = project.name;
  const display = document.getElementById("counterDisplay");
  display.textContent = project.row;
  updateRepeatNote(project);

  document.getElementById("backBtn").addEventListener("click", renderList);

  document.getElementById("plusBtn").addEventListener("click", () => {
    project.row += 1;
    saveProjects(projects);
    display.textContent = project.row;
    updateRepeatNote(project);
  });

  document.getElementById("minusBtn").addEventListener("click", () => {
    if (project.row > 0) project.row -= 1;
    saveProjects(projects);
    display.textContent = project.row;
    updateRepeatNote(project);
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("현재 단수를 0으로 초기화할까요?")) {
      project.row = 0;
      saveProjects(projects);
      display.textContent = project.row;
      updateRepeatNote(project);
    }
  });

  document.getElementById("editBtn").addEventListener("click", () => renderEdit(id));
}

function renderEdit(id) {
  const project = findProject(id);
  if (!project) return renderList();

  const tpl = document.getElementById("edit-template");
  app.innerHTML = "";
  app.appendChild(tpl.content.cloneNode(true));

  document.getElementById("editName").value = project.name;
  document.getElementById("editRepeat").value = project.repeat || 0;

  document.getElementById("editCancel").addEventListener("click", () => renderCounter(id));

  document.getElementById("editSave").addEventListener("click", () => {
    const name = document.getElementById("editName").value.trim();
    const repeat = parseInt(document.getElementById("editRepeat").value, 10) || 0;
    if (name) project.name = name;
    project.repeat = repeat;
    saveProjects(projects);
    renderCounter(id);
  });
}

renderList();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
