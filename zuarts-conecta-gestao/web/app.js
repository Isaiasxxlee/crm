const publicPage = document.getElementById("public-page");
const dashboardView = document.getElementById("dashboard-view");
const authView = document.getElementById("auth-view");
const messages = {
  auth: document.getElementById("auth-message"),
};

function inputValue(id) {
  return document.getElementById(id).value;
}

function setMessage(scope, text) {
  if (messages[scope]) {
    messages[scope].textContent = text;
  }
}

function jsonRequest(url, method, body) {
  const init = { method, credentials: "include", headers: {} };
  if (body) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return fetch(url, init).then(async (res) => {
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    return { status: res.status, data };
  });
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "--";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function showPublic() {
  publicPage.hidden = false;
  dashboardView.hidden = true;
  authView.hidden = false;
}

function showDashboard(data) {
  publicPage.hidden = true;
  dashboardView.hidden = false;

  const name = (data.user && (data.user.name || data.user.email)) || "Usuário";
  const firstName = name.split(" ")[0];
  const companyName = data.company ? data.company.name : "—";
  const role = data.role || "—";

  document.getElementById("header-user-name").textContent = name;
  document.getElementById("header-user-role").textContent = role;
  document.getElementById("user-avatar").textContent = initials(name);
  document.getElementById("banner-name").textContent = firstName;
  document.getElementById("banner-company").textContent = companyName;
  document.getElementById("sidebar-company").textContent = companyName;

  showModule(currentModule);
}

function refreshMe() {
  jsonRequest("/api/me", "GET")
    .then(({ status, data }) => {
      if (status !== 200) {
        showPublic();
        return;
      }
      showDashboard(data);
    })
    .catch(() => showPublic());
}

function errorText(data) {
  if (data && data.message) return data.message;
  if (data && data.data && data.data.message) return data.data.message;
  return "Erro inesperado";
}

document.getElementById("sign-in-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const body = { email: inputValue("sign-in-email"), password: inputValue("sign-in-password") };
  setMessage("auth", "…");
  jsonRequest("/api/auth/sign-in/email", "POST", body)
    .then(({ status, data }) => {
      if (status === 200) {
        refreshMe();
      } else {
        setMessage("auth", errorText(data));
      }
    })
    .catch((err) => setMessage("auth", err.message));
});

document.getElementById("sign-up-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const body = {
    name: inputValue("sign-up-name"),
    email: inputValue("sign-up-email"),
    password: inputValue("sign-up-password"),
  };
  const companyName = inputValue("sign-up-company");
  setMessage("auth", "…");
  jsonRequest("/api/auth/sign-up/email", "POST", body)
    .then(({ status, data }) => {
      if (status !== 200) {
        setMessage("auth", errorText(data));
        return;
      }
      jsonRequest("/api/company", "POST", { name: companyName })
        .then(refreshMe)
        .catch((err) => setMessage("auth", err.message));
    })
    .catch((err) => setMessage("auth", err.message));
});

document.getElementById("to-sign-up").addEventListener("click", (event) => {
  event.preventDefault();
  document.getElementById("sign-up-card").scrollIntoView({ behavior: "smooth", block: "center" });
  const nameInput = document.getElementById("sign-up-name");
  if (nameInput) {
    window.setTimeout(() => nameInput.focus({ preventScroll: true }), 450);
  }
});

document.getElementById("dashboard-sign-out").addEventListener("click", () => {
  jsonRequest("/api/auth/sign-out", "POST", {})
    .then(refreshMe)
    .catch(() => refreshMe());
});

const MODULE_LABELS = {
  dashboard: "Dashboard",
  agenda: "Agenda",
  clientes: "Clientes",
  atendimentos: "Atendimentos",
  vendas: "Vendas",
  financeiro: "Financeiro",
  marketing: "Marketing",
  planos: "Planos",
  relatorios: "Relatórios",
  estoque: "Estoque",
  configuracoes: "Configurações",
};

const navItems = Array.from(document.querySelectorAll(".nav-item"));
const moduleDashboard = document.getElementById("module-dashboard");
const modulePlaceholder = document.getElementById("module-placeholder");
const placeholderTitle = document.getElementById("placeholder-title");
const placeholderText = document.getElementById("placeholder-text");
const dashHeaderTitle = document.getElementById("dash-header-title");
const dashContent = document.getElementById("dash-content");

let currentModule = "dashboard";

function showModule(moduleId) {
  const id = MODULE_LABELS[moduleId] ? moduleId : "dashboard";
  currentModule = id;
  const label = MODULE_LABELS[id];

  dashHeaderTitle.textContent = label;

  navItems.forEach((item) => {
    const active = item.dataset.module === id;
    item.classList.toggle("is-active", active);
    if (active) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });

  if (id === "dashboard") {
    moduleDashboard.hidden = false;
    modulePlaceholder.hidden = true;
  } else {
    moduleDashboard.hidden = true;
    modulePlaceholder.hidden = false;
    placeholderTitle.textContent = label;
    placeholderText.textContent = id === "planos" ? "Em breve." : "Módulo em desenvolvimento.";
  }

  if (dashContent) {
    dashContent.scrollTop = 0;
  }

  closeSidebarOnMobile();
}

navItems.forEach((item) => {
  item.addEventListener("click", () => showModule(item.dataset.module));
});

document.querySelectorAll("[data-module-link]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showModule(link.dataset.moduleLink);
  });
});

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const menuToggle = document.getElementById("menu-toggle");
const sidebarClose = document.getElementById("sidebar-close");
const mobileQuery = window.matchMedia("(max-width: 1023px)");

function openSidebar() {
  sidebar.classList.add("is-open");
  sidebarOverlay.hidden = false;
  menuToggle.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  sidebar.classList.remove("is-open");
  sidebarOverlay.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
}

function closeSidebarOnMobile() {
  if (mobileQuery.matches) {
    closeSidebar();
  }
}

menuToggle.addEventListener("click", () => {
  if (sidebar.classList.contains("is-open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

sidebarClose.addEventListener("click", closeSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);

const userMenuBtn = document.getElementById("user-menu-btn");
const userDropdown = document.getElementById("user-dropdown");

userMenuBtn.addEventListener("click", () => {
  const willOpen = userDropdown.hidden;
  userDropdown.hidden = !willOpen;
  userMenuBtn.setAttribute("aria-expanded", String(willOpen));
});

document.addEventListener("click", (event) => {
  if (!userDropdown.hidden && !event.target.closest(".user-menu")) {
    userDropdown.hidden = true;
    userMenuBtn.setAttribute("aria-expanded", "false");
  }
});

const THEME_KEY = "zuarts-theme";
const themeToggle = document.getElementById("theme-toggle");

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }
  themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  themeToggle.setAttribute("aria-label", theme === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro");
}

themeToggle.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Local storage indisponível: a preferência não persiste, mas o tema muda normalmente.
  }
});

applyTheme(currentTheme());

const installButton = document.getElementById("install-app");
let deferredPrompt = null;

function isInstalled() {
  if (navigator.standalone === true) {
    return true;
  }
  if (typeof window.matchMedia === "function") {
    try {
      return window.matchMedia("(display-mode: standalone)").matches;
    } catch {
      return false;
    }
  }
  return false;
}

function syncInstallButton() {
  if (isInstalled()) {
    installButton.hidden = true;
  }
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  syncInstallButton();
  if (!isInstalled()) {
    installButton.hidden = false;
  }
});

installButton.addEventListener("click", async () => {
  if (!deferredPrompt) {
    return;
  }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

syncInstallButton();
refreshMe();
