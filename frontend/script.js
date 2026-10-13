const API_URL = "http://localhost:3000/applications"

const applicationList = document.querySelector("#application-list")
const emptyState = document.querySelector("#empty-state")
const requestStatus = document.querySelector("#request-status")
const reloadButton = document.querySelector("#reload-button")
const topicFilter = document.querySelector("#topic-filter")
const actionStatus = document.querySelector("#action-status")

const applicationForm = document.querySelector("#application-form")
const submitButton = document.querySelector("#submit-button")
const submitStatus = document.querySelector("#submit-status")
const formTitle = document.querySelector("#form-title")
const formMethod = document.querySelector("#form-method")
const cancelEditButton = document.querySelector("#cancel-edit-button")

let editingId = null
let isMutating = false
let loadController = null

function updateControls() {
  applicationForm.querySelectorAll("input, select, button").forEach((control) => {
    control.disabled = isMutating
  })
  applicationList.querySelectorAll("button").forEach((button) => {
    button.disabled = isMutating
  })
  reloadButton.disabled = isMutating || loadController !== null
  topicFilter.disabled = isMutating
}

function setSubmitStatus(state, message) {
  submitStatus.dataset.state = state
  submitStatus.textContent = message
}

function resetFormMode() {
  editingId = null
  applicationForm.reset()
  formTitle.textContent = "Создать заявку"
  formMethod.textContent = "POST"
  submitButton.textContent = "Отправить в API"
  cancelEditButton.hidden = true
}

function editApplication(application) {
  if (isMutating) return

  editingId = application.id
  applicationForm.elements.namedItem("name").value = application.name
  applicationForm.elements.namedItem("email").value = application.email
  applicationForm.elements.namedItem("topic").value = application.topic
  formTitle.textContent = `Редактировать заявку #${editingId}`
  formMethod.textContent = "PATCH"
  submitButton.textContent = "Сохранить изменения"
  cancelEditButton.hidden = false
  setSubmitStatus("idle", "Измените данные и сохраните или отмените редактирование.")
  applicationForm.elements.namedItem("name").focus()
}

async function deleteApplication(application) {
  if (isMutating) return

  isMutating = true
  updateControls()
  actionStatus.hidden = false
  actionStatus.dataset.state = "loading"
  actionStatus.textContent = `Удаляем заявку #${application.id}…`

  try {
    const response = await fetch(`${API_URL}/${encodeURIComponent(application.id)}`, {
      method: "DELETE",
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    if (editingId === application.id) {
      resetFormMode()
      setSubmitStatus("idle", "Удалённая заявка больше не редактируется. Можно создать новую.")
    }
    actionStatus.dataset.state = "success"
    actionStatus.textContent = `Заявка #${application.id} удалена.`
    await loadApplications()
  } catch (error) {
    console.error("Не удалось удалить заявку", error)
    actionStatus.dataset.state = "error"
    actionStatus.textContent = "Не удалось удалить заявку. Проверьте API и повторите попытку."
  } finally {
    isMutating = false
    updateControls()
  }
}

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
  card.dataset.id = application.id

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

  const actions = document.createElement("div")
  actions.className = "application-card__actions"

  const editButton = document.createElement("button")
  editButton.type = "button"
  editButton.className = "button button--secondary"
  editButton.textContent = "Редактировать"
  editButton.addEventListener("click", () => editApplication(application))

  const deleteButton = document.createElement("button")
  deleteButton.type = "button"
  deleteButton.className = "button button--danger"
  deleteButton.textContent = "Удалить"
  deleteButton.addEventListener("click", () => deleteApplication(application))

  actions.append(editButton, deleteButton)
  card.append(actions)

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
  updateControls()
}

async function loadApplications() {
  // При быстрой смене фильтра отменяем запрос, ответ которого уже устарел.
  loadController?.abort()
  const controller = new AbortController()
  loadController = controller
  setListState("loading", "Загружаем заявки…")
  updateControls()

  try {
    const url = new URL(API_URL)
    if (topicFilter.value) {
      url.searchParams.set("topic", topicFilter.value)
    }
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const applications = await response.json()
    console.log("Response:", response)
    console.log("Applications:", applications)
    if (controller.signal.aborted) return
    renderApplications(applications)
  } catch (error) {
    if (controller.signal.aborted) return
    console.error("Не удалось загрузить заявки", error)

    setListState("error", "Не удалось загрузить заявки. Проверьте API и повторите запрос.")
  } finally {
    if (loadController === controller) {
      loadController = null
      updateControls()
    }
  }
}

applicationForm.addEventListener("submit", async (event) => {
  event.preventDefault()
  if (isMutating) return

  // Считываем значения до блокировки полей: disabled-поля не входят в FormData.
  const formData = new FormData(applicationForm)
  const application = {
    name: formData.get("name"),
    email: formData.get("email"),
    topic: formData.get("topic"),
  }
  const isEditing = editingId !== null
  const url = isEditing ? `${API_URL}/${encodeURIComponent(editingId)}` : API_URL
  if (!isEditing) {
    application.createdAt = new Date().toISOString()
  }

  isMutating = true
  updateControls()
  setSubmitStatus("loading", isEditing ? "Сохраняем изменения…" : "Отправляем заявку…")

  try {
    const response = await fetch(url, {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(application),
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const savedApplication = await response.json()
    console.log(isEditing ? "Обновлена заявка:" : "Создана заявка:", savedApplication)
    resetFormMode()
    setSubmitStatus("success", `Заявка #${savedApplication.id} ${isEditing ? "обновлена" : "сохранена"}.`)
    await loadApplications()
  } catch (error) {
    console.error(isEditing ? "Не удалось изменить заявку" : "Не удалось отправить заявку", error)
    setSubmitStatus("error", "Не удалось сохранить заявку. Проверьте API и Network, затем повторите попытку.")
  } finally {
    isMutating = false
    updateControls()
  }
})

reloadButton.addEventListener("click", loadApplications)
topicFilter.addEventListener("change", loadApplications)
cancelEditButton.addEventListener("click", () => {
  if (isMutating) return
  resetFormMode()
  setSubmitStatus("idle", "Редактирование отменено. Можно создать новую заявку.")
})

// Первый запрос выполняется сразу после загрузки страницы.
loadApplications()

