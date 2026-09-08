const authView = document.getElementById("auth-view");
const appView = document.getElementById("app-view");
const messages = {
  auth: document.getElementById("auth-message"),
  app: document.getElementById("app-message"),
};

function inputValue(id) {
  return document.getElementById(id).value;
}

function setMessage(scope, text) {
  messages[scope].textContent = text;
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

function refreshMe() {
  jsonRequest("/api/me", "GET")
    .then(({ status, data }) => {
      if (status !== 200) {
        authView.hidden = false;
        appView.hidden = true;
        return;
      }
      document.getElementById("me-name").textContent = data.user.name;
      document.getElementById("me-email").textContent = data.user.email;
      document.getElementById("me-company").textContent = data.company ? data.company.name : "—";
      document.getElementById("me-role").textContent = data.role || "—";
      authView.hidden = true;
      appView.hidden = false;
    })
    .catch(() => {
      authView.hidden = false;
      appView.hidden = true;
    });
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

document.getElementById("sign-out").addEventListener("click", () => {
  jsonRequest("/api/auth/sign-out", "POST", {})
    .then(refreshMe)
    .catch((err) => setMessage("app", err.message));
});

document.getElementById("to-sign-up").addEventListener("click", (event) => {
  event.preventDefault();
  document.getElementById("sign-up-card").scrollIntoView({ behavior: "smooth", block: "center" });
  const nameInput = document.getElementById("sign-up-name");
  if (nameInput) {
    window.setTimeout(() => nameInput.focus({ preventScroll: true }), 450);
  }
});

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