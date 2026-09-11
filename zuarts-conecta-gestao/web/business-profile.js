export function createBusinessProfile(root, onUnauthorized) {
  const content = root.querySelector("[data-profile-content]");
  const status = root.querySelector("[data-profile-status]");
  const retry = root.querySelector("[data-profile-retry]");
  let controller;
  let saved = null;
  let segments = [];
  let types = [];
  let specialties = [];
  let selected = { segmentId: "", businessTypeId: "", specialtyId: null };

  function reset() {
    controller?.abort();
    saved = null;
    segments = [];
    types = [];
    specialties = [];
    selected = { segmentId: "", businessTypeId: "", specialtyId: null };
    content.replaceChildren();
    status.textContent = "";
    retry.hidden = true;
    root.removeAttribute("aria-busy");
  }

  async function request(path, signal, body) {
    const response = await fetch(`/api/business-profile${path}`, {
      method: body ? "PUT" : "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
    if (response.status === 401) {
      onUnauthorized();
      throw new Error("Sua sessão expira. Entre novamente.");
    }
    const result = await response.json();
    signal.throwIfAborted();
    if (!response.ok) throw new Error(response.status === 403
      ? "Não existe uma empresa disponível para esta sessão."
      : "Não foi possível concluir. Verifique a conexão e tente novamente.");
    return result.data;
  }

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function button(text, action) {
    const node = element("button", text, "btn btn-blue");
    node.type = "button";
    node.addEventListener("click", action);
    return node;
  }

  function summary(profile) {
    const section = element("section", "", "dash-card profile-summary");
    section.append(element("h3", profile ? profile.businessType.name : "Seu perfil"));
    const list = element("dl");
    const values = [
      ["Segmento", profile?.businessType.segment.name || segments.find((item) => item.id === selected.segmentId)?.name || "Escolha um segmento"],
      ["Tipo", profile?.businessType.name || types.find((item) => item.id === selected.businessTypeId)?.name || "Escolha um tipo"],
      ["Especialidade", profile ? profile.specialty?.name || "Não definida" : specialties.find((item) => item.id === selected.specialtyId)?.name || (specialties.length ? "Não definida" : "Não se aplica")],
    ];
    for (const [label, value] of values) list.append(element("dt", label), element("dd", value));
    section.append(list);
    return section;
  }

  async function run(action) {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    status.textContent = "Carregando…";
    retry.hidden = true;
    root.setAttribute("aria-busy", "true");
    content.querySelectorAll("input, button").forEach((node) => { node.disabled = true; });
    try {
      await action(current.signal);
      if (!current.signal.aborted) status.textContent = "";
    } catch (error) {
      if (!current.signal.aborted) {
        status.textContent = error.message;
        retry.hidden = false;
        retry.onclick = () => run(action);
      }
    } finally {
      if (!current.signal.aborted) {
        root.removeAttribute("aria-busy");
        content.querySelectorAll("input, button").forEach((node) => { node.disabled = false; });
      }
    }
  }

  function choices(title, name, items, value, change) {
    const fieldset = element("fieldset", "", "dash-card profile-step");
    fieldset.append(element("legend", title));
    const grid = element("div", "", "profile-choices");
    for (const item of items) {
      const label = element("label", "", "profile-choice");
      const input = element("input");
      input.type = "radio";
      input.name = name;
      input.value = item.id ?? "";
      input.checked = item.id === value;
      input.addEventListener("change", () => change(item.id));
      label.append(input, element("span", item.name));
      grid.append(label);
    }
    fieldset.append(grid);
    if (!items.length) fieldset.append(element("p", "Nenhuma opção cadastrada. Escolha outro segmento."));
    return fieldset;
  }

  function focusStep(name) {
    content.querySelector(`input[name="${name}"]`)?.focus();
  }

  function renderEditor() {
    const form = element("form", "", "profile-editor");
    form.append(choices("1. Escolha o segmento", "segmentId", segments, selected.segmentId, (id) => {
      selected = { segmentId: id, businessTypeId: "", specialtyId: null };
      types = [];
      specialties = [];
      renderEditor();
      run(async (signal) => {
        types = await request(`/types?segmentId=${id}`, signal);
        renderEditor();
        focusStep("businessTypeId");
      });
    }));
    if (selected.segmentId) form.append(choices("2. Escolha o tipo de negócio", "businessTypeId", types, selected.businessTypeId, (id) => {
      selected.businessTypeId = id;
      selected.specialtyId = null;
      specialties = [];
      renderEditor();
      run(async (signal) => {
        specialties = await request(`/specialties?businessTypeId=${id}`, signal);
        renderEditor();
        if (specialties.length) focusStep("specialtyId");
        else content.querySelector('[type="submit"]')?.focus();
      });
    }));
    if (specialties.length) form.append(choices("3. Escolha a especialidade (opcional)", "specialtyId",
      [{ id: null, name: "Não definir especialidade" }, ...specialties], selected.specialtyId, (id) => {
        selected.specialtyId = id;
        const focused = document.activeElement?.value;
        renderEditor();
        Array.from(content.querySelectorAll('input[name="specialtyId"]')).find((input) => input.value === focused)?.focus();
      }));
    form.append(summary(null));
    const save = button("Salvar Perfil", () => {});
    save.type = "submit";
    form.append(save);
    if (saved) form.append(button("Cancelar", renderSaved));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!selected.segmentId || !selected.businessTypeId) {
        status.textContent = "Escolha o segmento e o tipo de negócio.";
        focusStep(selected.segmentId ? "businessTypeId" : "segmentId");
        return;
      }
      run(async (signal) => {
        saved = await request("", signal, selected);
        renderSaved();
      }).then(() => {
        if (saved && !content.querySelector("form")) status.textContent = "Perfil salvo.";
      });
    });
    content.replaceChildren(form);
  }

  function edit() {
    run(async (signal) => {
      segments = await request("/segments", signal);
      selected = saved
        ? { segmentId: saved.businessType.segmentId, businessTypeId: saved.businessTypeId, specialtyId: saved.specialtyId }
        : { segmentId: "", businessTypeId: "", specialtyId: null };
      types = selected.segmentId ? await request(`/types?segmentId=${selected.segmentId}`, signal) : [];
      specialties = selected.businessTypeId ? await request(`/specialties?businessTypeId=${selected.businessTypeId}`, signal) : [];
      renderEditor();
      focusStep("segmentId");
    });
  }

  function renderSaved() {
    content.replaceChildren(summary(saved), button("Editar Perfil", edit));
    content.querySelector("button")?.focus();
  }

  function open() {
    reset();
    run(async (signal) => {
      saved = await request("", signal);
      if (saved) renderSaved();
      else {
        segments = await request("/segments", signal);
        renderEditor();
        focusStep("segmentId");
      }
    });
  }

  return { open, reset };
}
