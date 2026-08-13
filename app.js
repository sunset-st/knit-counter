import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();
const db = getFirestore(firebaseApp);

const STORAGE_KEY = "knitCounterProjects";

function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function cacheProjects(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

let projects = loadProjects();
let currentId = null;
let currentUser = null;
let unsubscribeCloud = null;

const app = document.getElementById("app");
const topTitle = document.getElementById("topTitle");
const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", () => signOut(auth));

function syncToCloud() {
  cacheProjects(projects);
  if (!currentUser) return;
  setDoc(doc(db, "users", currentUser.uid), {
    projects,
    updatedAt: serverTimestamp(),
  }).catch(() => {});
}

function findProject(id) {
  return projects.find((p) => p.id === id);
}

function renderLogin() {
  currentId = null;
  logoutBtn.hidden = true;
  topTitle.textContent = "뜨개 단수 카운터";
  const tpl = document.getElementById("login-template");
  app.innerHTML = "";
  app.appendChild(tpl.content.cloneNode(true));
  document.getElementById("googleLoginBtn").addEventListener("click", () => {
    signInWithPopup(auth, provider).catch((err) => {
      if (err.code !== "auth/popup-closed-by-user") {
        alert("로그인에 실패했어요. 다시 시도해주세요.");
      }
    });
  });
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
        syncToCloud();
        renderList();
      }
    });
    items.appendChild(node);
  });

  document.getElementById("addProjectBtn").addEventListener("click", () => {
    const name = prompt("프로젝트 이름을 입력하세요");
    if (!name) return;
    const newProject = { id: Date.now().toString(), name: name.trim(), row: 0, repeat: 0, target: 0 };
    projects.push(newProject);
    syncToCloud();
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

function updateTargetNote(project) {
  const note = document.getElementById("targetNote");
  if (!project.target || project.target <= 0) {
    note.textContent = "";
    note.classList.remove("alert");
    return;
  }
  if (project.row >= project.target) {
    note.textContent = `목표 ${project.target}단 도달! 여기서부터 패턴이 바뀌어요.`;
    note.classList.add("alert");
  } else {
    const remaining = project.target - project.row;
    note.textContent = `목표까지 ${remaining}단 남음 (목표 ${project.target}단)`;
    note.classList.remove("alert");
  }
}

function addHistory(project, action) {
  project.history = project.history || [];
  project.history.unshift({ action, time: Date.now() });
  project.history = project.history.slice(0, 3);
}

function renderHistory(project) {
  const list = document.getElementById("historyList");
  list.innerHTML = "";
  const history = project.history || [];
  if (history.length === 0) {
    const li = document.createElement("li");
    li.className = "history-empty";
    li.textContent = "아직 기록이 없어요.";
    list.appendChild(li);
    return;
  }
  history.forEach((h) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = h.action;
    const time = document.createElement("span");
    time.className = "history-time";
    time.textContent = new Date(h.time).toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    li.appendChild(label);
    li.appendChild(time);
    list.appendChild(li);
  });
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
  updateTargetNote(project);
  renderHistory(project);

  document.getElementById("backBtn").addEventListener("click", renderList);

  document.getElementById("plusBtn").addEventListener("click", () => {
    project.row += 1;
    addHistory(project, "+1");
    syncToCloud();
    display.textContent = project.row;
    updateRepeatNote(project);
    updateTargetNote(project);
    renderHistory(project);
  });

  document.getElementById("minusBtn").addEventListener("click", () => {
    if (project.row > 0) project.row -= 1;
    addHistory(project, "-1");
    syncToCloud();
    display.textContent = project.row;
    updateRepeatNote(project);
    updateTargetNote(project);
    renderHistory(project);
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("현재 단수를 0으로 초기화할까요?")) {
      project.row = 0;
      addHistory(project, "초기화");
      syncToCloud();
      display.textContent = project.row;
      updateRepeatNote(project);
      updateTargetNote(project);
      renderHistory(project);
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
  document.getElementById("editTarget").value = project.target || 0;

  document.getElementById("editCancel").addEventListener("click", () => renderCounter(id));

  document.getElementById("editSave").addEventListener("click", () => {
    const name = document.getElementById("editName").value.trim();
    const repeat = parseInt(document.getElementById("editRepeat").value, 10) || 0;
    const target = parseInt(document.getElementById("editTarget").value, 10) || 0;
    if (name) project.name = name;
    project.repeat = repeat;
    project.target = target;
    syncToCloud();
    renderCounter(id);
  });
}

async function initCloudSync(uid) {
  const userDocRef = doc(db, "users", uid);
  const snap = await getDoc(userDocRef);
  if (snap.exists()) {
    projects = snap.data().projects || [];
    cacheProjects(projects);
  } else {
    await setDoc(userDocRef, { projects, updatedAt: serverTimestamp() });
  }

  if (unsubscribeCloud) unsubscribeCloud();
  unsubscribeCloud = onSnapshot(userDocRef, (docSnap) => {
    if (!docSnap.exists()) return;
    const remoteProjects = docSnap.data().projects || [];
    if (JSON.stringify(remoteProjects) === JSON.stringify(projects)) return;
    projects = remoteProjects;
    cacheProjects(projects);
    if (currentId && findProject(currentId)) {
      renderCounter(currentId);
    } else {
      renderList();
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    logoutBtn.hidden = false;
    await initCloudSync(user.uid);
    renderList();
  } else {
    currentUser = null;
    if (unsubscribeCloud) {
      unsubscribeCloud();
      unsubscribeCloud = null;
    }
    renderLogin();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
