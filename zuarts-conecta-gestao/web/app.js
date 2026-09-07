const views = {
  auth: document.getElementById("auth-view"),
  app: document.getElementById("app-view"),
};

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
        views.auth.hidden = false;
        views.app.hidden = true;
        return;
      }
      document.getElementById("me-name").textContent = data.user.name;
      document.getElementById("me-email").textContent = data.user.email;
      document.getElementById("me-company").textContent = data.company ? data.company.name : "—";
      document.getElementById("me-role").textContent = data.role || "—";
      views.auth.hidden = true;
      views.app.hidden = false;
    })
    .catch(() => {
      views.auth.hidden = false;
      views.app.hidden = true;
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
  document.getElementById("sign-in-form").hidden = true;
  document.getElementById("sign-up-form").hidden = false;
  setMessage("auth", "");
});

document.getElementById("to-sign-in").addEventListener("click", (event) => {
  event.preventDefault();
  document.getElementById("sign-in-form").hidden = false;
  document.getElementById("sign-up-form").hidden = true;
  setMessage("auth", "");
});

refreshMe();
