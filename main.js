const storageKey = "money-divisor-state-v1";

const state = {
  participants: ["Marta", "Luis", "Ana"],
  expenses: [],
};

const elements = {
  participantForm: document.getElementById("participantForm"),
  participantName: document.getElementById("participantName"),
  participantChips: document.getElementById("participantChips"),
  participantCount: document.getElementById("participantCount"),
  expenseCount: document.getElementById("expenseCount"),
  expenseForm: document.getElementById("expenseForm"),
  expenseSubmit: document.querySelector("#expenseForm button[type='submit']"),
  expenseTitle: document.getElementById("expenseTitle"),
  expenseAmount: document.getElementById("expenseAmount"),
  expensePayer: document.getElementById("expensePayer"),
  expenseParticipants: document.getElementById("expenseParticipants"),
  selectAll: document.getElementById("selectAll"),
  selectNone: document.getElementById("selectNone"),
  exportJson: document.getElementById("exportJson"),
  importJson: document.getElementById("importJson"),
  jsonFileInput: document.getElementById("jsonFileInput"),
  expenseTableBody: document.getElementById("expenseTableBody"),
  settlementBody: document.getElementById("settlementBody"),
  debtMatrixTable: document.getElementById("debtMatrixTable"),
  participantChipTemplate: document.getElementById("participantChipTemplate"),
  participantCheckboxTemplate: document.getElementById("participantCheckboxTemplate"),
  expenseRowTemplate: document.getElementById("expenseRowTemplate"),
};

function currency(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function createParticipantOption(template, name, checked = true) {
  const fragment = template.content.cloneNode(true);
  const label = fragment.querySelector("label");
  const input = fragment.querySelector("input");
  const text = fragment.querySelector("span");

  input.value = name;
  input.checked = checked;
  text.textContent = name;
  return label;
}

function getSelectedExpenseParticipants(container) {
  return Array.from(container.querySelectorAll("input:checked")).map((input) => input.value);
}

function setAllExpenseParticipants(container, checked) {
  container.querySelectorAll("input").forEach((input) => {
    input.checked = checked;
  });
}

function addParticipant(stateValue, name) {
  const normalized = name.trim();
  if (!normalized) {
    return false;
  }

  if (stateValue.participants.some((participant) => participant.toLowerCase() === normalized.toLowerCase())) {
    return false;
  }

  stateValue.participants.push(normalized);
  return true;
}

function removeParticipant(stateValue, index) {
  const removed = stateValue.participants[index];
  if (!removed) {
    return;
  }

  stateValue.participants.splice(index, 1);
  stateValue.expenses = stateValue.expenses.map((expense) => ({
    ...expense,
    participants: expense.participants.filter((participant) => participant !== removed),
    payer: expense.payer === removed && stateValue.participants[0] ? stateValue.participants[0] : expense.payer,
  }));
}

function renderParticipantControls(stateValue, elementsValue, onRemoveParticipant) {
  elementsValue.participantChips.innerHTML = "";
  elementsValue.expenseParticipants.innerHTML = "";
  elementsValue.expensePayer.innerHTML = "";

  if (stateValue.participants.length === 0) {
    const emptyChip = document.createElement("div");
    emptyChip.className = "empty-state";
    emptyChip.textContent = "Anade al menos una persona para empezar.";
    elementsValue.participantChips.appendChild(emptyChip);

    const option = document.createElement("option");
    option.textContent = "Sin participantes";
    elementsValue.expensePayer.appendChild(option);
    elementsValue.expensePayer.disabled = true;
    elementsValue.expenseSubmit.disabled = true;
    return;
  }

  elementsValue.expensePayer.disabled = false;
  elementsValue.expenseSubmit.disabled = false;

  stateValue.participants.forEach((name, index) => {
    const chip = elementsValue.participantChipTemplate.content.firstElementChild.cloneNode(true);
    chip.textContent = name;
    chip.addEventListener("click", () => onRemoveParticipant(index));
    elementsValue.participantChips.appendChild(chip);

    const payerOption = document.createElement("option");
    payerOption.value = name;
    payerOption.textContent = name;
    elementsValue.expensePayer.appendChild(payerOption);

    const checkbox = createParticipantOption(elementsValue.participantCheckboxTemplate, name, true);
    elementsValue.expenseParticipants.appendChild(checkbox);
  });

  elementsValue.expensePayer.value = stateValue.participants[0];
}

function addExpense(stateValue, expense) {
  stateValue.expenses.push({
    id: crypto.randomUUID(),
    title: expense.title,
    amount: expense.amount,
    payer: expense.payer,
    participants: expense.participants,
  });
}

function removeExpense(stateValue, id) {
  stateValue.expenses = stateValue.expenses.filter((expense) => expense.id !== id);
}

function renderExpenseTable(stateValue, elementsValue, onRemoveExpense) {
  elementsValue.expenseTableBody.innerHTML = "";

  if (stateValue.expenses.length === 0) {
    elementsValue.expenseTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">Aun no hay gastos. Anade el primero arriba.</td>
      </tr>
    `;
    return;
  }

  stateValue.expenses.forEach((expense) => {
    const row = elementsValue.expenseRowTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector(".expense-title-cell").textContent = expense.title;
    row.querySelector(".expense-payer-cell").textContent = expense.payer;
    row.querySelector(".expense-amount-cell").textContent = currency(expense.amount);

    const participantsCell = row.querySelector(".expense-participants-cell");
    expense.participants.forEach((participant) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = participant;
      participantsCell.appendChild(tag);
    });

    if (expense.participants.length === 0) {
      participantsCell.textContent = "Se reparte entre todos";
    }

    const splitText =
      expense.participants.length === 1
        ? "Dedicado a una persona"
        : expense.participants.length === stateValue.participants.length
          ? "Reparto comun"
          : `${expense.participants.length} personas`;

    row.querySelector(".expense-split-cell").textContent = splitText;
    row.querySelector(".expense-delete-btn").addEventListener("click", () => onRemoveExpense(expense.id));

    elementsValue.expenseTableBody.appendChild(row);
  });
}

function normalizeParticipants(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((name) => String(name).trim())
    .filter((name) => name.length > 0)
    .filter((name, index, array) => array.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index);
}

function normalizeExpenses(input, participants) {
  if (!Array.isArray(input)) {
    return [];
  }

  const allowed = new Set(participants);

  return input
    .map((expense) => {
      const title = String(expense?.title ?? "").trim();
      const amount = Number(expense?.amount);
      const payer = String(expense?.payer ?? "").trim();
      const participantsList = Array.isArray(expense?.participants)
        ? expense.participants.filter((name) => allowed.has(name))
        : [];

      if (!title || !Number.isFinite(amount) || amount <= 0 || !allowed.has(payer)) {
        return null;
      }

      return {
        id: expense?.id ? String(expense.id) : crypto.randomUUID(),
        title,
        amount,
        payer,
        participants: participantsList,
      };
    })
    .filter(Boolean);
}

function exportStateToJson(stateValue) {
  const payload = {
    exportedAt: new Date().toISOString(),
    participants: stateValue.participants,
    expenses: stateValue.expenses,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `money-divisor-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importStateFromJson(file, stateValue) {
  const text = await file.text();
  const parsed = JSON.parse(text);

  const participants = normalizeParticipants(parsed?.participants);
  const expenses = normalizeExpenses(parsed?.expenses, participants);

  stateValue.participants = participants;
  stateValue.expenses = expenses;
}

function buildBalances(stateValue) {
  const balances = new Map(
    stateValue.participants.map((participant) => [
      participant,
      {
        paid: 0,
        owes: 0,
      },
    ])
  );

  stateValue.expenses.forEach((expense) => {
    const shares = expense.participants.length > 0 ? expense.participants : stateValue.participants;
    const shareAmount = expense.amount / shares.length;

    if (!balances.has(expense.payer)) {
      balances.set(expense.payer, { paid: 0, owes: 0 });
    }
    balances.get(expense.payer).paid += expense.amount;

    shares.forEach((participant) => {
      if (!balances.has(participant)) {
        balances.set(participant, { paid: 0, owes: 0 });
      }
      balances.get(participant).owes += shareAmount;
    });
  });

  const rows = Array.from(balances.entries()).map(([participant, values]) => ({
    participant,
    paid: values.paid,
    owes: values.owes,
    balance: values.paid - values.owes,
  }));

  return rows.sort((left, right) => left.participant.localeCompare(right.participant));
}

function buildDebtMatrix(stateValue) {
  const matrix = new Map();

  stateValue.participants.forEach((rowName) => {
    matrix.set(rowName, new Map(stateValue.participants.map((colName) => [colName, 0])));
  });

  stateValue.expenses.forEach((expense) => {
    const participants = expense.participants.length > 0 ? expense.participants : [...stateValue.participants];
    const shareAmount = expense.amount / participants.length;

    participants.forEach((participant) => {
      if (participant === expense.payer) {
        return;
      }

      matrix.get(participant).set(expense.payer, matrix.get(participant).get(expense.payer) + shareAmount);
    });
  });

  return matrix;
}

function buildSettlements(balances) {
  const debtors = balances
    .filter((entry) => entry.balance < -0.01)
    .map((entry) => ({ name: entry.participant, amount: Math.abs(entry.balance) }));
  const creditors = balances
    .filter((entry) => entry.balance > 0.01)
    .map((entry) => ({ name: entry.participant, amount: entry.balance }));

  const transfers = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);

    transfers.push({ from: debtor.name, to: creditor.name, amount });

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount <= 0.01) {
      debtorIndex += 1;
    }
    if (creditor.amount <= 0.01) {
      creditorIndex += 1;
    }
  }

  return transfers;
}

function renderDebtMatrix(stateValue, elementsValue, debtMatrix) {
  const headerRow = document.createElement("tr");
  headerRow.innerHTML = `<th></th>${stateValue.participants.map((name) => `<th>${name}</th>`).join("")}`;
  elementsValue.debtMatrixTable.innerHTML = "";
  elementsValue.debtMatrixTable.appendChild(document.createElement("thead"));
  elementsValue.debtMatrixTable.tHead.appendChild(headerRow);

  const body = document.createElement("tbody");
  stateValue.participants.forEach((rowName) => {
    const row = document.createElement("tr");
    const cells = [
      `<th scope="row">${rowName}</th>`,
      ...stateValue.participants.map((colName) => {
        const value = debtMatrix.get(rowName)?.get(colName) ?? 0;
        if (rowName === colName) {
          return `<td class="amount-neutral">-</td>`;
        }
        return `<td class="${value > 0 ? "amount-positive" : "amount-neutral"}">${value > 0 ? currency(value) : ""}</td>`;
      }),
    ];

    row.innerHTML = cells.join("");
    body.appendChild(row);
  });

  elementsValue.debtMatrixTable.appendChild(body);
}

function renderSettlements(elementsValue, settlements) {
  elementsValue.settlementBody.innerHTML = "";

  if (settlements.length === 0) {
    elementsValue.settlementBody.innerHTML = `
      <tr>
        <td colspan="3" class="empty-state">No hay deudas pendientes.</td>
      </tr>
    `;
    return;
  }

  settlements.forEach((settlement) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${settlement.from}</td>
      <td>${settlement.to}</td>
      <td class="amount-positive">${currency(settlement.amount)}</td>
    `;
    elementsValue.settlementBody.appendChild(row);
  });
}

function updateSummary(stateValue, elementsValue) {
  elementsValue.participantCount.textContent = String(stateValue.participants.length);
  elementsValue.expenseCount.textContent = String(stateValue.expenses.length);
}

function loadState() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.participants) && parsed.participants.length > 0) {
      state.participants = parsed.participants;
    }
    if (Array.isArray(parsed.expenses)) {
      state.expenses = parsed.expenses;
    }
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function persistAndRender() {
  saveState();
  render();
}

function handleRemoveParticipant(index) {
  removeParticipant(state, index);
  persistAndRender();
}

function handleRemoveExpense(id) {
  removeExpense(state, id);
  persistAndRender();
}

function render() {
  renderParticipantControls(state, elements, handleRemoveParticipant);

  const balances = buildBalances(state);
  const debtMatrix = buildDebtMatrix(state);
  const settlements = buildSettlements(balances);

  renderExpenseTable(state, elements, handleRemoveExpense);
  renderDebtMatrix(state, elements, debtMatrix, currency);
  renderSettlements(elements, settlements, currency);
  updateSummary(state, elements);
}

elements.participantForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const didAdd = addParticipant(state, elements.participantName.value);
  if (!didAdd) {
    return;
  }

  elements.participantName.value = "";
  elements.participantName.focus();
  persistAndRender();
});

elements.expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (state.participants.length === 0) {
    return;
  }

  const title = elements.expenseTitle.value.trim();
  const amount = Number(elements.expenseAmount.value);
  const payer = elements.expensePayer.value;
  let participants = getSelectedExpenseParticipants(elements.expenseParticipants);

  if (!title || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  if (participants.length === 0) {
    participants = [...state.participants];
  }

  addExpense(state, { title, amount, payer, participants });

  elements.expenseTitle.value = "";
  elements.expenseAmount.value = "";
  setAllExpenseParticipants(elements.expenseParticipants, true);
  elements.expenseTitle.focus();
  persistAndRender();
});

elements.selectAll.addEventListener("click", () => {
  setAllExpenseParticipants(elements.expenseParticipants, true);
});

elements.selectNone.addEventListener("click", () => {
  setAllExpenseParticipants(elements.expenseParticipants, false);
});

elements.exportJson.addEventListener("click", () => {
  exportStateToJson(state);
});

elements.importJson.addEventListener("click", () => {
  elements.jsonFileInput.click();
});

elements.jsonFileInput.addEventListener("change", async (event) => {
  const [file] = Array.from(event.target.files ?? []);
  if (!file) {
    return;
  }

  try {
    await importStateFromJson(file, state);
    persistAndRender();
  } catch {
    window.alert("El archivo JSON no es valido.");
  } finally {
    elements.jsonFileInput.value = "";
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setAllExpenseParticipants(elements.expenseParticipants, true);
  }
});

loadState();
render();
