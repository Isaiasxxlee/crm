export function createPlans(root, onUnauthorized) {
  const content = root.querySelector("[data-plans-content]");
  const message = root.querySelector("[data-plans-status]");
  const retry = root.querySelector("[data-plans-retry]");
  let controller;

  const reasons = {
    client_limit_reached: "Limite de clientes atingido. Escolha um plano com maior capacidade.",
    subscription_required: "Sua empresa ainda não possui uma assinatura. Escolha um plano disponível.",
    subscription_inactive: "A assinatura não está ativa. Solicite a regularização ao responsável pelo sistema.",
    subscription_not_started: "A assinatura ainda não iniciou.",
    plan_inactive: "Este plano está inativo. Escolha outro plano disponível.",
    plan_capacity_exceeded: "Este plano não comporta a quantidade atual de clientes.",
    plan_change_forbidden: "Somente proprietários e administradores da empresa alteram o plano.",
    plan_not_found: "Este plano não está disponível. Atualize a página.",
  };
  const statuses = { ACTIVE: "Ativa", PENDING: "Pendente", SUSPENDED: "Suspensa", CANCELLED: "Cancelada", EXPIRED: "Expirada" };
  const periods = { MONTHLY: "mês", QUARTERLY: "trimestre", SEMIANNUAL: "semestre", YEARLY: "ano" };

  function reset() {
    controller?.abort();
    content.replaceChildren();
    message.textContent = "";
    retry.hidden = true;
    root.removeAttribute("aria-busy");
  }

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  async function request(url, signal, body) {
    const response = await fetch(url, {
      method: body ? "PUT" : "GET", credentials: "same-origin", cache: "no-store", signal,
      headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 401) {
      onUnauthorized();
      throw new Error("Entre novamente para consultar os planos.");
    }
    const result = await response.json();
    signal.throwIfAborted();
    if (!response.ok) throw new Error(reasons[result.error] || "Não foi possível carregar os planos. Tente novamente.");
    return result.data;
  }

  async function load(signal) {
    const [plans, current] = await Promise.all([
      request("/api/plans", signal), request("/api/subscription", signal),
    ]);
    signal.throwIfAborted();
    render(plans, current);
  }

  async function run(action, success = "") {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    root.setAttribute("aria-busy", "true");
    message.textContent = "Carregando planos…";
    retry.hidden = true;
    const buttons = Array.from(content.querySelectorAll("button"));
    const previous = buttons.map((button) => button.disabled);
    buttons.forEach((button) => { button.disabled = true; });
    try {
      await action(current.signal);
      if (!current.signal.aborted) message.textContent = success;
    } catch (error) {
      if (!current.signal.aborted) {
        message.textContent = error.message;
        retry.hidden = false;
        retry.onclick = () => run(action, success);
      }
    } finally {
      if (!current.signal.aborted) {
        root.removeAttribute("aria-busy");
        buttons.forEach((button, index) => { button.disabled = previous[index]; });
      }
    }
  }

  function render(plans, current) {
    const overview = node("section", "", "dash-card plan-overview");
    overview.append(node("h4", `Plano atual: ${current.plan?.name || "Não definido"}`));
    overview.append(node("p", `Assinatura: ${statuses[current.effectiveStatus] || "Não definida"}`));
    const { currentClients, maxClients, percentage, reason } = current.usage;
    const usage = node("p", maxClients === null
      ? `${currentClients} clientes${current.plan ? " · Sem limite superior" : ""}`
      : `${currentClients} de ${maxClients} clientes`);
    usage.id = "plan-usage-label";
    overview.append(usage);
    if (percentage !== null && maxClients !== null) {
      const progress = node("progress");
      progress.max = 100;
      progress.value = Math.min(100, percentage);
      progress.setAttribute("aria-labelledby", usage.id);
      overview.append(progress, node("p", `${percentage}% utilizado`));
    }
    overview.append(node("p", "A contagem considera todos os contatos cadastrados no CRM.", "tagline"));
    if (reason) overview.append(node("p", reasons[reason]));
    if (!current.canManage) overview.append(node("p", reasons.plan_change_forbidden));
    const grid = node("div", "", "plan-grid");
    for (const plan of plans) {
      const selected = current.subscription?.planId === plan.id;
      const card = node("article", "", "dash-card plan-card");
      card.dataset.planId = plan.id;
      if (selected) card.classList.add("is-current");
      card.append(node("h4", plan.name));
      card.append(node("p", plan.maxClients === null ? `${plan.minClients}+ clientes · Sem limite superior`
        : plan.minClients === 0 ? `Até ${plan.maxClients} clientes` : `${plan.minClients} a ${plan.maxClients} clientes`, "plan-capacity"));
      const period = periods[plan.billingPeriod] || `${plan.customPeriodDays} dias`;
      const price = plan.price === null ? "Preço a definir"
        : `${new Intl.NumberFormat("pt-BR", { style: "currency", currency: plan.currency }).format(Number(plan.price))} / ${period}`;
      card.append(node("p", price, "plan-price"), node("p", plan.description));
      const choose = node("button", selected ? "Plano atual" : "Escolher plano", selected ? "btn btn-secondary" : "btn btn-blue");
      choose.type = "button";
      choose.disabled = selected || !plan.canSelect;
      choose.setAttribute("aria-label", `${selected ? "Plano atual" : "Escolher plano"}: ${plan.name}`);
      choose.addEventListener("click", () => run(async (signal) => {
        await request("/api/subscription", signal, { planId: plan.id });
        await load(signal);
      }, `Plano alterado para ${plan.name}.`));
      card.append(choose);
      if (plan.selectionReason && !selected) card.append(node("p", reasons[plan.selectionReason], "tagline"));
      grid.append(card);
    }
    if (!plans.length) grid.append(node("p", "Nenhum plano disponível no momento."));
    content.replaceChildren(overview, grid);
  }

  function open() {
    reset();
    run(load);
  }

  return { open, reset };
}
