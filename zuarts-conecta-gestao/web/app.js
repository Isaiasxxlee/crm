const publicPage = document.getElementById("public-page");
const dashboardView = document.getElementById("dashboard-view");
const authView = document.getElementById("auth-view");
const sessionView = document.getElementById("session-view");
const sessionMessage = document.getElementById("session-message");
const sessionRetry = document.getElementById("session-retry");

const VERIFY_CALLBACK_URL = `${window.location.origin}/?email-verified=1`;

const authCards = {
  "sign-in": document.getElementById("sign-in-card"),
  "sign-up": document.getElementById("sign-up-card"),
  verify: document.getElementById("verify-card"),
};

const messages = {
  "sign-in": document.getElementById("sign-in-message"),
  "sign-up": document.getElementById("sign-up-message"),
  verify: document.getElementById("verify-message"),
};

function inputValue(id) {
  return document.getElementById(id).value;
}

function setMessage(scope, text) {
  if (messages[scope]) {
    messages[scope].textContent = text || "";
  }
}

function showAuthCard(cardId) {
  const isSignUp = cardId === "sign-up";
  document.getElementById("auth-heading").textContent = isSignUp ? "CRIAR SUA CONTA" : "ZUARTS SISTEMA DE GESTÃO";
  document.getElementById("auth-company").hidden = isSignUp;
  const tagline = document.getElementById("auth-tagline");
  tagline.textContent = isSignUp
    ? "Preencha seus dados para começar a usar o ZUARTS."
    : "Tudo o que o seu negócio precisa,\nem um só lugar.";
  Object.entries(authCards).forEach(([id, el]) => {
    if (el) el.hidden = id !== cardId;
  });
}

const pendingRequests = new Map();
const retryDeadlines = new Map();

function jsonRequest(url, method, body) {
  if (pendingRequests.has(url)) return pendingRequests.get(url);
  const remaining = Math.ceil(((retryDeadlines.get(url) || 0) - Date.now()) / 1000);
  if (remaining > 0) {
    return Promise.reject(new Error(`Muitas tentativas. Aguarde ${remaining} segundos e tente novamente.`));
  }
  const init = { method, credentials: "include", headers: {} };
  if (body) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const request = fetch(url, init).then(async (res) => {
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (res.status === 429) {
      const seconds = Number(res.headers.get("x-retry-after") || res.headers.get("retry-after"));
      if (Number.isFinite(seconds) && seconds > 0) {
        retryDeadlines.set(url, Date.now() + seconds * 1000);
        data.message = `Muitas tentativas. Aguarde ${seconds} segundos e tente novamente.`;
      } else {
        data.message = "Muitas tentativas. Aguarde antes de tentar novamente.";
      }
    }
    return { status: res.status, data };
  }).finally(() => pendingRequests.delete(url));
  pendingRequests.set(url, request);
  return request;
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "--";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function setAuthState(state) {
  document.body.dataset.authState = state;
  publicPage.hidden = state !== "anonymous";
  dashboardView.hidden = state !== "authenticated";
  sessionView.hidden = state !== "loading" && state !== "error";
  sessionRetry.hidden = state !== "error";
  sessionMessage.textContent = state === "error"
    ? "Não foi possível verificar a sessão. Verifique sua conexão e tente novamente."
    : "Verificando sessão…";
}

let pendingAuthCard = null;

function showPublic(cardId) {
  setAuthState("anonymous");
  authView.hidden = false;
  showAuthCard(cardId || pendingAuthCard || "sign-in");
  pendingAuthCard = null;
}

(function readVerificationRedirect() {
  const params = new URLSearchParams(window.location.search);
  const verified = params.get("email-verified");
  const error = params.get("error");
  if (!verified && !error) return;
  pendingAuthCard = "sign-in";
  if (error) {
    setMessage("sign-in", "Link de confirmação inválido ou expirado.");
    document.getElementById("resend-line").hidden = false;
  }
  params.delete("email-verified");
  params.delete("error");
  const query = params.toString();
  window.history.replaceState({}, "", window.location.pathname + (query ? `?${query}` : ""));
})();

const PENDING_COMPANY_KEY = "zuarts-pending-company";

function showDashboard(data) {
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
  setAuthState("authenticated");
}

function refreshMe() {
  setAuthState("loading");
  return jsonRequest("/api/me", "GET")
    .then(({ status, data }) => {
      if (status === 401) {
        showPublic();
        return;
      }
      if (status === 200 && data?.user?.id) {
        if (!data.company) {
          let pendingCompany = "";
          try {
            pendingCompany = localStorage.getItem(PENDING_COMPANY_KEY) || "";
            localStorage.removeItem(PENDING_COMPANY_KEY);
          } catch {
            // Local storage indisponível: a empresa é criada com o nome padrão.
          }
          jsonRequest("/api/company", "POST", { name: pendingCompany })
            .then(({ data: companyData }) => showDashboard({ ...data, company: companyData.company, role: companyData.role }))
            .catch(() => showDashboard(data));
          return;
        }
        showDashboard(data);
        return;
      }
      setAuthState("error");
    })
    .catch(() => setAuthState("error"));
}

sessionRetry.addEventListener("click", refreshMe);

function errorText(data) {
  if (data && data.message) return data.message;
  if (data && data.data && data.data.message) return data.data.message;
  return "Erro inesperado";
}

let lastSignInEmail = "";

document.getElementById("sign-in-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.pending === "true" || !form.reportValidity()) return;
  form.dataset.pending = "true";
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  const email = inputValue("sign-in-email");
  const body = { email, password: inputValue("sign-in-password") };
  lastSignInEmail = email;
  document.getElementById("resend-line").hidden = true;
  setMessage("sign-in", "…");
  jsonRequest("/api/auth/sign-in/email", "POST", body)
    .then(({ status, data }) => {
      if (status === 200) {
        setMessage("sign-in", "");
        return refreshMe();
      }
      if (data && data.code === "EMAIL_NOT_VERIFIED") {
        setMessage("sign-in", "E-mail ainda não confirmado.");
        document.getElementById("resend-line").hidden = false;
        return;
      }
      setMessage("sign-in", errorText(data));
    })
    .catch((err) => setMessage("sign-in", err.message))
    .finally(() => {
      form.dataset.pending = "false";
      button.disabled = false;
    });
});

document.getElementById("resend-verification").addEventListener("click", () => {
  if (!lastSignInEmail) return;
  setMessage("sign-in", "Enviando…");
  jsonRequest("/api/auth/send-verification-email", "POST", { email: lastSignInEmail, callbackURL: VERIFY_CALLBACK_URL })
    .then(({ status, data }) => {
      setMessage("sign-in", status === 200 ? "E-mail de confirmação reenviado." : errorText(data));
    })
    .catch((err) => setMessage("sign-in", err.message));
});

document.getElementById("sign-up-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.pending === "true" || !form.reportValidity()) return;
  form.dataset.pending = "true";
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  const email = inputValue("sign-up-email");
  const body = {
    name: inputValue("sign-up-name"),
    email,
    password: inputValue("sign-up-password"),
    callbackURL: VERIFY_CALLBACK_URL,
  };
  const companyName = inputValue("sign-up-company");
  setMessage("sign-up", "…");
  jsonRequest("/api/auth/sign-up/email", "POST", body)
    .then(({ status, data }) => {
      if (status !== 200) {
        setMessage("sign-up", errorText(data));
        return;
      }
      lastSignInEmail = email;
      try {
        localStorage.setItem(PENDING_COMPANY_KEY, companyName || "");
      } catch {
        // Local storage indisponível: a empresa é criada com o nome padrão no primeiro login.
      }
      document.getElementById("verify-email").textContent = email;
      showAuthCard("verify");
    })
    .catch((err) => setMessage("sign-up", err.message))
    .finally(() => {
      form.dataset.pending = "false";
      button.disabled = false;
    });
});

document.getElementById("to-sign-up").addEventListener("click", (event) => {
  event.preventDefault();
  setMessage("sign-in", "");
  showAuthCard("sign-up");
});

document.getElementById("to-sign-in").addEventListener("click", (event) => {
  event.preventDefault();
  setMessage("sign-up", "");
  showAuthCard("sign-in");
});

document.getElementById("verify-resend").addEventListener("click", () => {
  if (!lastSignInEmail) return;
  setMessage("verify", "Enviando…");
  jsonRequest("/api/auth/send-verification-email", "POST", { email: lastSignInEmail, callbackURL: VERIFY_CALLBACK_URL })
    .then(({ status, data }) => {
      setMessage("verify", status === 200 ? "E-mail de confirmação reenviado." : errorText(data));
    })
    .catch((err) => setMessage("verify", err.message));
});

document.getElementById("verify-already-confirmed").addEventListener("click", (event) => {
  event.preventDefault();
  showAuthCard("sign-in");
});

document.getElementById("verify-back-to-sign-in").addEventListener("click", (event) => {
  event.preventDefault();
  showAuthCard("sign-in");
});

document.getElementById("dashboard-sign-out").addEventListener("click", () => {
  jsonRequest("/api/auth/sign-out", "POST", {})
    .then(refreshMe)
    .catch(() => refreshMe());
});

const MODULE_LABELS = {
  dashboard: "Dashboard",
  servicos: "Serviços",
  gestao: "Gestão",
  saude: "Saúde",
  administracao: "Administração",
  crm: "CRM",
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

const navItems = Array.from(document.querySelectorAll("[data-module]"));
const moduleDashboard = document.getElementById("module-dashboard");
const moduleServices = document.getElementById("module-services");
const serviceGroups = Array.from(document.querySelectorAll("[data-service-group]"));
const moduleCrm = document.getElementById("module-crm");
const moduleGestao = document.getElementById("module-gestao");
const gestaoNavItems = Array.from(document.querySelectorAll(".area-nav-item[data-gestao-page]"));
const crmNavItems = Array.from(document.querySelectorAll(".crm-nav-item"));
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

  const isServiceGroup = ["saude", "administracao"].includes(id);
  dashHeaderTitle.classList.toggle("service-title", id === "crm" || id === "servicos" || id === "gestao" || isServiceGroup);
  moduleDashboard.hidden = id !== "dashboard";
  moduleServices.hidden = id !== "servicos" && !isServiceGroup;
  moduleCrm.hidden = id !== "crm";
  moduleGestao.hidden = id !== "gestao";
  modulePlaceholder.hidden = id === "dashboard" || id === "crm" || id === "gestao" || !moduleServices.hidden;

  if (!moduleServices.hidden) {
    document.getElementById("services-title").textContent = label;
    serviceGroups.forEach((group) => {
      group.hidden = isServiceGroup && group.dataset.serviceGroup !== id;
    });
  }
  if (id === "crm") {
    showCrmPage("dashboard");
  }
  if (id === "gestao") {
    showGestaoPage("dashboard");
  }
  if (!modulePlaceholder.hidden) {
    placeholderTitle.textContent = label;
    placeholderText.textContent = id === "planos" ? "Em breve." : "Módulo em desenvolvimento.";
  }

  if (dashContent) {
    dashContent.scrollTop = 0;
  }

  closeSidebarOnMobile();
}

function showGestaoPage(pageId) {
  const selected = gestaoNavItems.find((item) => item.dataset.gestaoPage === pageId) || gestaoNavItems[0];
  if (selected.dataset.gestaoPage === "servicos") {
    showModule("servicos");
    document.getElementById("services-title").focus({ preventScroll: true });
    return;
  }
  const isDashboard = selected.dataset.gestaoPage === "dashboard";
  document.getElementById("gestao-dashboard").hidden = !isDashboard;
  document.getElementById("gestao-placeholder").hidden = isDashboard;
  const title = document.getElementById("gestao-placeholder-title");
  title.textContent = `${selected.textContent} — área em preparação`;
  gestaoNavItems.forEach((item) => {
    if (item === selected) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
  const heading = isDashboard ? document.getElementById("gestao-dashboard-title") : title;
  heading.focus({ preventScroll: true });
  dashContent.scrollTop = 0;
}

document.querySelectorAll("[data-gestao-page]").forEach((item) => {
  item.addEventListener("click", () => showGestaoPage(item.dataset.gestaoPage));
});

function showCrmPage(pageId) {
  const selected = crmNavItems.find((item) => item.dataset.crmPage === pageId) || crmNavItems[0];
  const isDashboard = selected.dataset.crmPage === "dashboard";
  document.getElementById("crm-dashboard").hidden = !isDashboard;
  document.getElementById("crm-placeholder").hidden = isDashboard;
  document.getElementById("crm-placeholder-title").textContent = selected.textContent;
  crmNavItems.forEach((item) => {
    if (item === selected) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

document.querySelectorAll("[data-crm-page]").forEach((item) => {
  item.addEventListener("click", () => showCrmPage(item.dataset.crmPage));
});

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
