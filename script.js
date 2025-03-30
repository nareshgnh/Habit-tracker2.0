document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Loaded - Initializing Tracker v6 (Modal & UI Polish)");

  // --- Get DOM Elements ---
  const loadingOverlay = document.getElementById("loading-overlay");
  // Sidebar
  const openAddHabitModalBtn = document.getElementById(
    "open-add-habit-modal-btn"
  ); // Changed
  const globalConfirmationMessage = document.getElementById(
    "global-confirmation-message"
  ); // Use this for feedback
  const calPrevMonthBtn = document.getElementById("cal-prev-month");
  const calNextMonthBtn = document.getElementById("cal-next-month");
  const calMonthYearEl = document.getElementById("cal-month-year");
  const calGridBody = document.getElementById("cal-grid-body");
  const progressForDateEl = document.getElementById("progress-for-date");
  const progressStatsEl = document.getElementById("progress-stats");
  const progressBarInner = document.getElementById("progress-bar-inner");
  // Main Content
  const selectedDateHeader = document.getElementById("selected-date-header");
  const manageHabitsButton = document.getElementById("manage-habits-button");
  const doneManagingButton = document.getElementById("done-managing-button");
  const todoHabitList = document.getElementById("todo-habit-list");
  const completedHabitList = document.getElementById("completed-habit-list");
  const noTodoMsg = document.getElementById("no-todo-msg");
  const noCompletedMsg = document.getElementById("no-completed-msg");
  const noHabitsMsg = document.getElementById("no-habits-msg");
  const mainContentElement = document.querySelector(".main-content");
  // Modal Elements
  const addHabitModal = document.getElementById("add-habit-modal");
  const addHabitForm = document.getElementById("add-habit-form");
  const modalHabitNameInput = document.getElementById("modal-habit-name");
  const modalStartDateInput = document.getElementById("modal-start-date");
  const modalDurationInput = document.getElementById("modal-duration");
  const modalCloseBtn = addHabitModal.querySelector(".modal-close-btn");
  const modalCancelBtn = addHabitModal.querySelector(".modal-cancel-btn");
  const modalOverlay = addHabitModal.querySelector(".modal-overlay");

  // --- Application State ---
  let habits = []; // { id, name, startDate, endDate, completedDates }
  let selectedDate = new Date();
  let calendarDate = new Date();
  let isManageMode = false;
  const STORAGE_KEY = "habitsTrackerDataV6"; // New key for potentially cleaner start

  // --- Utility Functions ---
  const formatDateLocal_YYYYMMDD = (date) => {
    if (!(date instanceof Date) || isNaN(date)) date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const createDateFrom_YYYYMMDD = (dateString) => {
    try {
      const parts = dateString.split("-");
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (
        isNaN(year) ||
        isNaN(month) ||
        isNaN(day) ||
        year < 1900 ||
        year > 3000
      ) {
        throw new Error("Invalid date components");
      }
      return new Date(year, month, day); // Local midnight
    } catch (error) {
      console.error("Error creating date from string:", dateString, error);
      return new Date();
    }
  };

  const displayGlobalConfirmation = (message) => {
    globalConfirmationMessage.textContent = message;
    globalConfirmationMessage.classList.add("visible");
    setTimeout(() => {
      globalConfirmationMessage.classList.remove("visible");
    }, 3000); // Show for 3 seconds
  };

  // --- Data Persistence --- (Keep load/save functions as before, using STORAGE_KEY)
  const loadHabitsFromStorage = () => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        let loadedHabits = JSON.parse(storedData);
        if (!Array.isArray(loadedHabits)) loadedHabits = [];
        const validHabits = [];
        const defaultStartDate = "1970-01-01";
        const defaultEndDate = "9999-12-31";
        loadedHabits.forEach((h) => {
          if (
            h &&
            typeof h.id === "number" &&
            typeof h.name === "string" &&
            Array.isArray(h.completedDates)
          ) {
            const habitToAdd = {
              id: h.id,
              name: h.name,
              startDate: h.startDate || defaultStartDate,
              endDate: h.endDate || defaultEndDate,
              completedDates: h.completedDates,
            };
            if (
              typeof habitToAdd.startDate !== "string" ||
              habitToAdd.startDate.length !== 10
            )
              habitToAdd.startDate = defaultStartDate;
            if (
              typeof habitToAdd.endDate !== "string" ||
              habitToAdd.endDate.length !== 10
            )
              habitToAdd.endDate = defaultEndDate;
            validHabits.push(habitToAdd);
          }
        });
        habits = validHabits;
        console.log(
          `Loaded ${habits.length} habits from localStorage (v6 structure).`
        );
      } else {
        habits = [];
        console.log("No habits found in localStorage.");
      }
    } catch (error) {
      console.error("Error loading habits:", error);
      habits = [];
      alert("Could not load saved habits.");
    }
  };

  const saveHabitsToStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch (error) {
      console.error("Error saving habits:", error);
      alert("Could not save habit changes.");
    }
  };

  // --- Modal Handling ---
  const openModal = () => {
    // Reset form fields before opening
    addHabitForm.reset(); // Resets form elements to default values
    modalStartDateInput.value = formatDateLocal_YYYYMMDD(new Date()); // Default start date to today
    modalDurationInput.value = 30; // Default duration
    // Open modal
    addHabitModal.classList.add("modal-open");
    modalHabitNameInput.focus(); // Focus the first field
    console.log("Modal opened");
  };

  const closeModal = () => {
    addHabitModal.classList.remove("modal-open");
    console.log("Modal closed");
  };

  // --- Core Logic ---
  const addNewHabitFromModal = () => {
    const name = modalHabitNameInput.value.trim();
    const startDateValue = modalStartDateInput.value;
    const durationDays = parseInt(modalDurationInput.value, 10);

    if (!name || !startDateValue || isNaN(durationDays) || durationDays <= 0) {
      alert(
        "Please fill in all fields correctly (Name, Start Date, Duration >= 1)."
      );
      return false; // Indicate failure
    }

    try {
      const startDateObj = createDateFrom_YYYYMMDD(startDateValue);
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(startDateObj.getDate() + durationDays - 1);
      const endDateValue = formatDateLocal_YYYYMMDD(endDateObj);

      const newHabit = {
        id: Date.now(),
        name: name,
        startDate: startDateValue,
        endDate: endDateValue,
        completedDates: [],
      };

      habits.push(newHabit);
      saveHabitsToStorage();
      displayGlobalConfirmation(`Habit "${name.slice(0, 20)}..." added!`);
      renderHabitLists();
      renderProgress();
      console.log("Added new habit from modal:", newHabit);
      return true; // Indicate success
    } catch (error) {
      console.error("Error processing new habit:", error);
      alert("There was an error saving the habit. Please try again.");
      return false; // Indicate failure
    }
  };

  const deleteHabit = (habitId) => {
    // (Keep the same as before)
    const habitIndex = habits.findIndex((h) => h.id === habitId);
    if (habitIndex === -1) return;
    const habitName = habits[habitIndex].name;
    if (confirm(`Delete "${habitName}"? This cannot be undone.`)) {
      habits.splice(habitIndex, 1);
      saveHabitsToStorage();
      displayGlobalConfirmation(
        `Habit "${habitName.slice(0, 20)}..." deleted.`
      ); // Confirmation on delete
      renderHabitLists();
      renderProgress();
      console.log("Deleted habit:", habitId);
    }
  };

  const toggleHabitCompletion = (habitId, dateString_YYYYMMDD) => {
    // (Keep the same as before)
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const completedIndex = habit.completedDates.indexOf(dateString_YYYYMMDD);
    if (completedIndex > -1) {
      habit.completedDates.splice(completedIndex, 1);
    } else {
      habit.completedDates.push(dateString_YYYYMMDD);
      habit.completedDates.sort();
    }
    saveHabitsToStorage();
    renderHabitLists();
    renderProgress();
  };

  const changeSelectedDate = (newDate) => {
    // (Keep the same as before)
    if (
      formatDateLocal_YYYYMMDD(newDate) ===
      formatDateLocal_YYYYMMDD(selectedDate)
    )
      return;
    selectedDate = newDate;
    console.log(
      "Selected date changed to:",
      formatDateLocal_YYYYMMDD(selectedDate)
    );
    renderHabitLists();
    renderProgress();
    updateCalendarSelection();
  };

  const toggleManageMode = () => {
    // (Keep the same as before)
    isManageMode = !isManageMode;
    manageHabitsButton.classList.toggle("hidden", isManageMode);
    doneManagingButton.classList.toggle("hidden", !isManageMode);
    mainContentElement.classList.toggle("manage-mode", isManageMode);
    renderHabitLists();
  };

  // --- Rendering Functions --- (Keep renderHabitLists, renderCalendar, updateCalendarSelection, renderProgress mostly the same as v5)

  const renderHabitLists = () => {
    todoHabitList.innerHTML = "";
    completedHabitList.innerHTML = "";
    const selectedDateStr = formatDateLocal_YYYYMMDD(selectedDate);
    let activeTodoCount = 0;
    let activeCompletedCount = 0;
    let activeHabitExists = false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    selectedDateHeader.textContent =
      selectedDate.getTime() === today.getTime()
        ? "Today"
        : selectedDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          }); // Longer date format

    const activeHabitsForDay = habits.filter(
      (habit) =>
        selectedDateStr >= habit.startDate && selectedDateStr <= habit.endDate
    );
    activeHabitExists = activeHabitsForDay.length > 0;

    const hasAnyHabits = habits.length > 0;
    noHabitsMsg.classList.toggle("hidden", hasAnyHabits);
    manageHabitsButton.classList.toggle(
      "hidden",
      !hasAnyHabits || isManageMode
    );
    doneManagingButton.classList.toggle("hidden", !isManageMode);
    if (!hasAnyHabits && isManageMode) toggleManageMode();

    if (!activeHabitExists && hasAnyHabits) {
      noTodoMsg.textContent = "No habits scheduled for this day.";
      noTodoMsg.classList.remove("hidden");
      noCompletedMsg.classList.add("hidden");
    } else if (!hasAnyHabits) {
      noTodoMsg.classList.add("hidden");
      noCompletedMsg.classList.add("hidden");
    } else {
      noTodoMsg.textContent = "All done for this day!"; // Reset default
    }

    if (!activeHabitExists) {
      // If no habits active, nothing more to list
      mainContentElement.classList.toggle("manage-mode", isManageMode); // Still apply class if needed
      return;
    }

    activeHabitsForDay.forEach((habit) => {
      const li = document.createElement("li");
      li.className = "habit-item";
      li.dataset.habitId = habit.id;
      const isCompleted = habit.completedDates.includes(selectedDateStr);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = isCompleted;
      checkbox.id = `habit-${habit.id}-${selectedDateStr}`;
      checkbox.addEventListener("change", () =>
        toggleHabitCompletion(habit.id, selectedDateStr)
      );

      const label = document.createElement("label");
      label.htmlFor = checkbox.id;
      label.textContent = habit.name;

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "habit-delete-button";
      deleteBtn.innerHTML = "×";
      deleteBtn.title = `Delete "${habit.name}"`;
      deleteBtn.addEventListener("click", () => deleteHabit(habit.id));

      li.appendChild(checkbox);
      li.appendChild(label);
      li.appendChild(deleteBtn);

      if (isCompleted) {
        completedHabitList.appendChild(li);
        activeCompletedCount++;
      } else {
        todoHabitList.appendChild(li);
        activeTodoCount++;
      }
    });

    noTodoMsg.classList.toggle(
      "hidden",
      activeTodoCount > 0 || !activeHabitExists
    );
    noCompletedMsg.classList.toggle(
      "hidden",
      activeCompletedCount > 0 || !activeHabitExists
    );
    mainContentElement.classList.toggle("manage-mode", isManageMode);
  };

  const renderCalendar = () => {
    // No changes needed from v5
    calGridBody.innerHTML = "";
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    calMonthYearEl.textContent = calendarDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayWeekday = firstDayOfMonth.getDay();
    const totalDaysInMonth = lastDayOfMonth.getDate();
    for (let i = 0; i < firstDayWeekday; i++) {
      const cell = document.createElement("div");
      cell.className = "day-cell disabled";
      calGridBody.appendChild(cell);
    }
    const todayStr_YYYYMMDD = formatDateLocal_YYYYMMDD(new Date());
    const selectedDateStr_YYYYMMDD = formatDateLocal_YYYYMMDD(selectedDate);
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const cell = document.createElement("div");
      cell.className = "day-cell";
      cell.textContent = day;
      const cellDate = new Date(year, month, day);
      const cellDateStr_YYYYMMDD = formatDateLocal_YYYYMMDD(cellDate);
      cell.dataset.date = cellDateStr_YYYYMMDD;
      if (cellDateStr_YYYYMMDD === todayStr_YYYYMMDD)
        cell.classList.add("today");
      if (cellDateStr_YYYYMMDD === selectedDateStr_YYYYMMDD)
        cell.classList.add("selected");
      cell.addEventListener("click", handleCalendarDayClick);
      calGridBody.appendChild(cell);
    }
  };

  const updateCalendarSelection = () => {
    // No changes needed from v5
    const selectedDateStr_YYYYMMDD = formatDateLocal_YYYYMMDD(selectedDate);
    const allCells = calGridBody.querySelectorAll(".day-cell[data-date]");
    allCells.forEach((cell) => {
      cell.classList.toggle(
        "selected",
        cell.dataset.date === selectedDateStr_YYYYMMDD
      );
    });
    if (
      calendarDate.getFullYear() !== selectedDate.getFullYear() ||
      calendarDate.getMonth() !== selectedDate.getMonth()
    ) {
      calendarDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1
      );
      renderCalendar();
    }
  };

  const renderProgress = () => {
    // No changes needed from v5
    const selectedDateStr = formatDateLocal_YYYYMMDD(selectedDate);
    let completedCount = 0;
    const activeHabitsForDay = habits.filter(
      (h) => selectedDateStr >= h.startDate && selectedDateStr <= h.endDate
    );
    const totalActiveHabits = activeHabitsForDay.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    progressForDateEl.textContent =
      selectedDate.getTime() === today.getTime()
        ? "Today"
        : selectedDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
    if (totalActiveHabits === 0) {
      progressStatsEl.textContent = "No active habits";
      progressBarInner.style.width = "0%";
      return;
    }
    activeHabitsForDay.forEach((h) => {
      if (h.completedDates.includes(selectedDateStr)) completedCount++;
    });
    const percentage = Math.round((completedCount / totalActiveHabits) * 100);
    progressStatsEl.textContent = `${completedCount} / ${totalActiveHabits} Completed`;
    progressBarInner.style.width = `${percentage}%`;
  };

  // --- Event Handlers ---
  const handleCalendarDayClick = (event) => {
    // No changes needed from v5
    const target = event.target.closest(".day-cell");
    if (
      target &&
      target.dataset.date &&
      !target.classList.contains("disabled")
    ) {
      changeSelectedDate(createDateFrom_YYYYMMDD(target.dataset.date));
    }
  };
  const handlePrevMonth = () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  };
  const handleNextMonth = () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  };
  const handleModalFormSubmit = (event) => {
    event.preventDefault(); // Stop default form submission
    const success = addNewHabitFromModal();
    if (success) {
      closeModal(); // Close modal only if habit was added successfully
    }
  };

  // --- Initialization ---
  const initializeApp = () => {
    console.log("Initializing App v6...");
    try {
      selectedDate.setHours(0, 0, 0, 0);
      calendarDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1
      );

      // --- Add Event Listeners ---
      openAddHabitModalBtn.addEventListener("click", openModal);
      modalCloseBtn.addEventListener("click", closeModal);
      modalCancelBtn.addEventListener("click", closeModal);
      modalOverlay.addEventListener("click", closeModal); // Click outside to close
      addHabitForm.addEventListener("submit", handleModalFormSubmit); // Handle form submission

      // Keyboard accessibility for modal
      document.addEventListener("keydown", (e) => {
        if (
          e.key === "Escape" &&
          addHabitModal.classList.contains("modal-open")
        ) {
          closeModal();
        }
      });

      calPrevMonthBtn.addEventListener("click", handlePrevMonth);
      calNextMonthBtn.addEventListener("click", handleNextMonth);
      manageHabitsButton.addEventListener("click", toggleManageMode);
      doneManagingButton.addEventListener("click", toggleManageMode);

      loadHabitsFromStorage();
      renderCalendar();
      renderHabitLists();
      renderProgress();

      loadingOverlay.classList.add("hidden");
      console.log("Initialization Complete.");
    } catch (error) {
      console.error("FATAL ERROR during Initialization:", error);
      loadingOverlay.innerHTML = `<div style="text-align:center; color: var(--clr-danger);">Initialization Failed!<br>Check console (F12).</div>`;
    }
  };

  initializeApp();
}); // End DOMContentLoaded
