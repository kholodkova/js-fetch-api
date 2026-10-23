const summary = document.querySelector("#summary");
const cancelButton = document.querySelector("#cancel");
const usersSection = document.querySelector("#users");
const controller = new AbortController();

const params = new URLSearchParams(window.location.search);
const idsParam = params.get("ids") ?? "1,2,3";
const delayParam = params.get("delay") ?? "0";

function parseIds(value) {
  const parts = value.split(",");

  if (parts.length < 1 || parts.length > 5) {
    throw new Error("Укажите от одного до пяти идентификаторов.");
  }

  if (parts.some((part) => !/^\d+$/.test(part))) {
    throw new Error("Идентификаторы должны быть положительными целыми числами без пустых элементов.");
  }

  const ids = parts.map(Number);

  if (ids.some((id) => id <= 0)) {
    throw new Error("Идентификаторы должны быть больше нуля.");
  }

  return ids;
}

function parseDelay(value) {
  if (!/^\d+$/.test(value)) {
    throw new Error("Задержка должна быть целым числом от 0 до 5000.");
  }

  const delay = Number(value);

  if (delay > 5000) {
    throw new Error("Задержка должна быть целым числом от 0 до 5000.");
  }

  return delay;
}

async function fetchUser(id, delay) {
  const url = `https://dummyjson.com/users/${id}?delay=${delay}`;
  const response = await fetch(url, { signal: controller.signal });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

function createSuccessCard(id, user) {
  const article = document.createElement("article");
  article.dataset.id = String(id);
  article.dataset.state = "success";

  const name = document.createElement("h2");
  name.className = "name";
  name.textContent = `${user.firstName} ${user.lastName}`;

  const email = document.createElement("a");
  email.className = "email";
  email.href = `mailto:${user.email}`;
  email.textContent = user.email;

  const city = document.createElement("span");
  city.className = "city";
  city.textContent = user.address.city;

  const company = document.createElement("span");
  company.className = "company";
  company.textContent = user.company.name;

  article.append(name, email, city, company);
  return article;
}

function createErrorCard(id, error) {
  const article = document.createElement("article");
  article.dataset.id = String(id);
  article.dataset.state = "error";

  const message = document.createElement("span");
  message.className = "message";
  message.textContent = error.message;

  article.append(message);
  return article;
}

function createAbortedCard(id) {
  const article = document.createElement("article");
  article.dataset.id = String(id);
  article.dataset.state = "aborted";

  const message = document.createElement("span");
  message.className = "message";
  message.textContent = "Запрос отменён";

  article.append(message);
  return article;
}

async function loadUsers(ids, delay) {
  const requests = ids.map((id) => fetchUser(id, delay));
  const results = await Promise.allSettled(requests);
  let successCount = 0;
  let errorCount = 0;
  let abortedCount = 0;

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      successCount += 1;
      const card = createSuccessCard(ids[index], result.value);
      usersSection.append(card);
    } else if (result.reason.name === "AbortError") {
      abortedCount += 1;
      const card = createAbortedCard(ids[index]);
      usersSection.append(card);
    } else {
      errorCount += 1;
      const card = createErrorCard(ids[index], result.reason);
      usersSection.append(card);
    }
  });

  if (abortedCount > 0) {
    summary.dataset.state = "aborted";
    summary.textContent = `Запросы отменены. Загружено: ${successCount}; отменено: ${abortedCount}; ошибок: ${errorCount}`;
  } else if (successCount === results.length) {
    summary.dataset.state = "success";
  } else if (successCount > 0) {
    summary.dataset.state = "partial";
  } else {
    summary.dataset.state = "error";
  }

  if (abortedCount === 0) {
    summary.textContent = `Загружено: ${successCount}; ошибок: ${errorCount}`;
  }

  cancelButton.disabled = true;
}

cancelButton.addEventListener("click", () => {
  controller.abort();
});

try {
  const ids = parseIds(idsParam);
  const delay = parseDelay(delayParam);

  loadUsers(ids, delay);
} catch (error) {
  summary.dataset.state = "error";
  summary.textContent = `Некорректные параметры: ${error.message}`;
  cancelButton.disabled = true;
}
