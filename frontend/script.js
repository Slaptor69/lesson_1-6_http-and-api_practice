const API_URL = "http://localhost:3000/applications"

const applicationList = document.querySelector("#application-list")
const emptyState = document.querySelector("#empty-state")
const requestStatus = document.querySelector("#request-status")
const reloadButton = document.querySelector("#reload-button")

const applicationForm = document.querySelector("#application-form")
const submitButton = document.querySelector("#submit-button")
const submitStatus = document.querySelector("#submit-status")

// Готовая вспомогательная функция переключает состояния списка.
// Во время практики вызывайте ее с одним из значений:
// loading, success, empty или error.
function setListState(state, message) {
  requestStatus.dataset.state = state
  requestStatus.textContent = message

  const hasApplications = state === "success"
  const hasEmptyResult = state === "empty"

  applicationList.hidden = !hasApplications
  emptyState.hidden = !hasEmptyResult
}

// Карточка уже подготовлена, чтобы практика не превратилась в верстку.
// Обратите внимание: значения API попадают в DOM через textContent.
function createApplicationCard(application) {
  const card = document.createElement("article")
  card.className = "application-card"

  const heading = document.createElement("div")
  heading.className = "application-card__heading"

  const name = document.createElement("h3")
  name.textContent = application.name

  const id = document.createElement("span")
  id.className = "application-card__id"
  id.textContent = `#${application.id}`

  const topic = document.createElement("p")
  topic.className = "application-card__topic"
  topic.textContent = application.topic

  const email = document.createElement("a")
  email.className = "application-card__email"
  email.href = `mailto:${application.email}`
  email.textContent = application.email

  heading.append(name, id)
  card.append(heading, topic, email)

  return card
}

function renderApplications(applications) {
  applicationList.replaceChildren()

  if (applications.length === 0) {
    setListState("empty", "API вернул пустой массив")
    return
  }

  applications.forEach((application) => {
    applicationList.append(createApplicationCard(application))
  })

  setListState("success", `Получено заявок: ${applications.length}`)
}

async function loadApplications() {
  setListState("loading", "Загружаем заявки…")
  reloadButton.disabled = true

  try {
    const response = await fetch(API_URL)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const applications = await response.json()
    console.log("Response:", response)
    console.log("Applications:", applications)
    renderApplications(applications)
  } catch (error) {
    console.error("Не удалось загрузить заявки", error)

    setListState("error", "Не удалось загрузить заявки. Проверьте API и повторите запрос.")
  } finally {
    reloadButton.disabled = false
  }
}

applicationForm.addEventListener("submit", async (event) => {
  event.preventDefault()
  if (submitButton.disabled) return

  const formData = new FormData(applicationForm)
  const application = {
    name: formData.get("name"),
    email: formData.get("email"),
    topic: formData.get("topic"),
    createdAt: new Date().toISOString(),
  }

  submitButton.disabled = true
  submitStatus.textContent = "Отправляем заявку…"

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(application),
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const createdApplication = await response.json()
    console.log("Создана заявка:", createdApplication)
    applicationForm.reset()
    submitStatus.textContent = `Заявка #${createdApplication.id} сохранена.`
    await loadApplications()
  } catch (error) {
    console.error("Не удалось отправить заявку", error)
    submitStatus.textContent = "Не удалось отправить заявку. Проверьте API и Network."
  } finally {
    submitButton.disabled = false
  }
})

reloadButton.addEventListener("click", loadApplications)

// Первый запрос выполняется сразу после загрузки страницы.
loadApplications()

