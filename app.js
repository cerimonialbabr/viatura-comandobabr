const state = {
  reservations: [],
  users: [],
  ranks: [],
  sectors: [],
  missions: [],
  currentDate: new Date(),
  selectedReservationId: null
};

const monthNames = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

window.addEventListener("DOMContentLoaded", initialize);

async function initialize() {
  bindNavigation();
  bindActions();

  if (!CONFIG.API_URL || CONFIG.API_URL.includes("COLE_AQUI")) {
    alert("Configure a URL do Web App no arquivo config.js.");
    return;
  }

  try {
    await Promise.all([loadConfiguration(), loadUsers(), loadReservations()]);
    fillAllSelects();
    renderCalendar();
  } catch (error) {
    alert("Não foi possível carregar o sistema. " + error.message);
  }
}

function bindNavigation() {
  document.querySelectorAll(".nav-button").forEach(button => {
    button.addEventListener("click", () => openPage(button.dataset.page));
  });
}

function bindActions() {
  document.getElementById("previous-month").addEventListener("click", () => {
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById("next-month").addEventListener("click", () => {
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    renderCalendar();
  });

  document.getElementById("reservation-form").addEventListener("submit", submitReservation);
  document.getElementById("user-form").addEventListener("submit", submitUser);
  document.getElementById("search-my-reservations").addEventListener("click", renderMyReservations);
  document.getElementById("close-modal").addEventListener("click", closeModal);
  document.getElementById("cancel-reservation").addEventListener("click", cancelSelectedReservation);
  document.getElementById("modal-backdrop").addEventListener("click", event => {
    if (event.target.id === "modal-backdrop") closeModal();
  });
}

function openPage(pageName) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.querySelectorAll(".nav-button").forEach(button => button.classList.remove("active"));

  document.getElementById(`page-${pageName}`).classList.add("active");
  document.querySelector(`[data-page="${pageName}"]`).classList.add("active");

  if (pageName === "calendar") renderCalendar();
  if (pageName === "mine") renderMyReservations();
}

async function apiGet(action, params = {}) {
  const url = new URL(CONFIG.API_URL);
  url.searchParams.set("action", action);
  url.searchParams.set("_", Date.now());
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url.toString(), { method: "GET", redirect: "follow" });
  if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
  const data = await response.json();
  if (data.sucesso === false) throw new Error(data.mensagem || "Falha na operação.");
  return data;
}

async function apiPost(action, payload) {
  const body = new URLSearchParams();
  body.set("action", action);
  body.set("payload", JSON.stringify(payload));

  const response = await fetch(CONFIG.API_URL, {
    method: "POST",
    body,
    redirect: "follow"
  });

  if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
  const data = await response.json();
  if (data.sucesso === false) throw new Error(data.mensagem || "Falha na operação.");
  return data;
}

async function loadConfiguration() {
  const data = await apiGet("getConfiguracao");
  state.ranks = data.postos || [];
  state.sectors = data.setores || [];
  state.missions = data.missoes || [];
}

async function loadUsers() {
  const data = await apiGet("getUsuarios");
  state.users = data.usuarios || [];
}

async function loadReservations() {
  const data = await apiGet("getReservas");
  state.reservations = data.reservas || [];
}

function fillAllSelects() {
  fillSelect("reservation-user", state.users.map(user => ({ value: user.militar, label: user.militar })), "Selecione o militar");
  fillSelect("my-user", state.users.map(user => ({ value: user.militar, label: user.militar })), "Selecione o militar");
  fillSelect("reservation-sector", state.sectors.map(value => ({ value, label: value })), "Selecione o setor");
  fillSelect("user-sector", state.sectors.map(value => ({ value, label: value })), "Selecione o setor");
  fillSelect("reservation-mission", state.missions.map(value => ({ value, label: value })), "Selecione o tipo de missão");
  fillSelect("user-rank", state.ranks.map(value => ({ value, label: value })), "Selecione o posto ou graduação");
}

function fillSelect(id, items, placeholder) {
  const select = document.getElementById(id);
  const previousValue = select.value;
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`;

  items.forEach(item => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    select.appendChild(option);
  });

  if (items.some(item => item.value === previousValue)) select.value = previousValue;
}

function renderCalendar() {
  const calendar = document.getElementById("calendar");
  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  document.getElementById("calendar-title").textContent = `${monthNames[month]} de ${year}`;

  calendar.innerHTML = "";
  ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].forEach(name => {
    const header = document.createElement("div");
    header.className = "weekday";
    header.textContent = name;
    calendar.appendChild(header);
  });

  const first = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - first.getDay());
  const today = toIsoDate(new Date());

  for (let index = 0; index < 42; index++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const isoDate = toIsoDate(date);

    const cell = document.createElement("div");
    cell.className = "calendar-day";
    if (date.getMonth() !== month) cell.classList.add("outside");
    if (isoDate === today) cell.classList.add("today");

    const number = document.createElement("div");
    number.className = "day-number";
    number.textContent = date.getDate();
    cell.appendChild(number);

    state.reservations
      .filter(reservation => reservation.status === "CONFIRMADO" && reservation.data === isoDate)
      .forEach(reservation => {
        const eventButton = document.createElement("button");
        eventButton.type = "button";
        eventButton.className = "calendar-event";
        eventButton.textContent = `${reservation.horaInicio} ${reservation.militar}`;
        eventButton.addEventListener("click", () => openReservationModal(reservation.id));
        cell.appendChild(eventButton);
      });

    calendar.appendChild(cell);
  }
}

async function submitReservation(event) {
  event.preventDefault();
  const message = document.getElementById("reservation-message");
  setMessage(message, "", "");

  const payload = {
    militar: document.getElementById("reservation-user").value,
    setor: document.getElementById("reservation-sector").value,
    tipoMissao: document.getElementById("reservation-mission").value,
    data: document.getElementById("reservation-date").value,
    horaInicio: document.getElementById("reservation-start").value,
    horaFim: document.getElementById("reservation-end").value,
    observacoes: document.getElementById("reservation-notes").value.trim()
  };

  if (payload.horaFim <= payload.horaInicio) {
    setMessage(message, "O horário de término deve ser posterior ao início.", "error");
    return;
  }

  try {
    const result = await apiPost("criarReserva", payload);
    setMessage(message, result.mensagem, "success");
    document.getElementById("reservation-form").reset();
    await loadReservations();
    renderCalendar();
    setTimeout(() => openPage("calendar"), 700);
  } catch (error) {
    setMessage(message, error.message, "error");
  }
}

async function submitUser(event) {
  event.preventDefault();
  const message = document.getElementById("user-message");
  setMessage(message, "", "");

  const payload = {
    posto: document.getElementById("user-rank").value,
    nomeGuerra: document.getElementById("user-war-name").value.trim(),
    nomeCompleto: document.getElementById("user-full-name").value.trim(),
    setor: document.getElementById("user-sector").value
  };

  try {
    const result = await apiPost("cadastrarUsuario", payload);
    setMessage(message, result.mensagem, "success");
    document.getElementById("user-form").reset();
    await loadUsers();
    fillAllSelects();
  } catch (error) {
    setMessage(message, error.message, "error");
  }
}

function renderMyReservations() {
  const container = document.getElementById("my-reservations");
  const military = document.getElementById("my-user").value;

  if (!military) {
    container.innerHTML = "<p class=\"help\">Selecione um militar para consultar as reservas.</p>";
    return;
  }

  const items = state.reservations
    .filter(reservation => reservation.militar === military)
    .sort((a, b) => `${b.data} ${b.horaInicio}`.localeCompare(`${a.data} ${a.horaInicio}`));

  if (!items.length) {
    container.innerHTML = "<p>Nenhuma reserva encontrada.</p>";
    return;
  }

  container.innerHTML = items.map(reservation => `
    <article class="reservation-item ${reservation.status === "CANCELADO" ? "cancelled" : ""}">
      <h3>${formatDateBr(reservation.data)} — ${escapeHtml(reservation.horaInicio)} às ${escapeHtml(reservation.horaFim)}</h3>
      <p><strong>Setor:</strong> ${escapeHtml(reservation.setor)}</p>
      <p><strong>Missão:</strong> ${escapeHtml(reservation.tipoMissao)}</p>
      <p><strong>Status:</strong> ${escapeHtml(reservation.status)}</p>
      <p><strong>Observações:</strong> ${escapeHtml(reservation.observacoes || "Sem observações")}</p>
      ${reservation.status === "CONFIRMADO" ? `<button type="button" class="button secondary" onclick="openReservationModal('${reservation.id}')">Ver detalhes</button>` : ""}
    </article>
  `).join("");
}

function openReservationModal(id) {
  const reservation = state.reservations.find(item => item.id === id);
  if (!reservation) return;

  state.selectedReservationId = id;
  document.getElementById("modal-content").innerHTML = `
    <p><strong>Militar:</strong> ${escapeHtml(reservation.militar)}</p>
    <p><strong>Setor:</strong> ${escapeHtml(reservation.setor)}</p>
    <p><strong>Tipo de missão:</strong> ${escapeHtml(reservation.tipoMissao)}</p>
    <p><strong>Data:</strong> ${formatDateBr(reservation.data)}</p>
    <p><strong>Horário:</strong> ${escapeHtml(reservation.horaInicio)} às ${escapeHtml(reservation.horaFim)}</p>
    <p><strong>Observações:</strong> ${escapeHtml(reservation.observacoes || "Sem observações")}</p>
  `;
  document.getElementById("cancel-reservation").style.display = reservation.status === "CONFIRMADO" ? "block" : "none";
  document.getElementById("modal-backdrop").classList.remove("hidden");
}

function closeModal() {
  state.selectedReservationId = null;
  document.getElementById("modal-backdrop").classList.add("hidden");
}

async function cancelSelectedReservation() {
  if (!state.selectedReservationId) return;
  if (!confirm("Confirma o cancelamento desta reserva?")) return;

  try {
    const result = await apiPost("cancelarReserva", { id: state.selectedReservationId });
    alert(result.mensagem);
    closeModal();
    await loadReservations();
    renderCalendar();
    renderMyReservations();
  } catch (error) {
    alert(error.message);
  }
}

function setMessage(element, text, type) {
  element.textContent = text;
  element.className = `message ${type || ""}`;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateBr(isoDate) {
  const parts = String(isoDate).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : isoDate;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
