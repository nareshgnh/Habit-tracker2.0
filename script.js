document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Loaded - Initializing Tracker v4.1 (Date Fix)");

  // --- Get DOM Elements ---
  // (Keep all element selections from the previous version)
  const loadingOverlay = document.getElementById("loading-overlay");
  const newHabitNameInput = document.getElementById("new-habit-name");
  const addHabitButton = document.getElementById("add-habit-button");
  const addHabitConfirm = document.getElementById("add-habit-confirm");
  const calPrevMonthBtn = document.getElementById("cal-prev-month");
  const calNextMonthBtn = document.getElementById("cal-next-month");
  const calMonthYearEl = document.getElementById("cal-month-year");
  const calGridBody = document.getElementById("cal-grid-body");
  const progressForDateEl = document.getElementById("progress-for-date");
  const progressStatsEl = document.getElementById("progress-stats");
  const progressBarInner = document.getElementById("progress-bar-inner");
  const selectedDateHeader = document.getElementById("selected-date-header");
  const manageHabitsButton = document.getElementById("manage-habits-button");
  const doneManagingButton = document.getElementById("done-managing-button");
  const todoHabitList = document.getElementById("todo-habit-list");
  const completedHabitList = document.getElementById("completed-habit-list");
  const noTodoMsg = document.getElementById("no-todo-msg");
  const noCompletedMsg = document.getElementById("no-completed-msg");
  const noHabitsMsg = document.getElementById("no-habits-msg");
  const mainContentElement = document.querySelector(".main-content");

  // --- Application State ---
  let habits = [];
  let selectedDate = new Date(); // Keep as Date object for easy manipulation
  let calendarDate = new Date(); // For the calendar view month/year
  let isManageMode = false;
  const STORAGE_KEY = "habitsTrackerDataV4"; // Keep consistent key

  // --- Utility Functions ---
  const formatDateLocal_YYYYMMDD = (date) => {
    // *** CHANGED: Format to LOCAL YYYY-MM-DD ***
    // This avoids UTC conversion issues for comparisons within the app's logic.
    if (!(date instanceof Date) || isNaN(date)) date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // month is 0-indexed
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const createDateFrom_YYYYMMDD = (dateString) => {
    // *** ADDED: Reliable way to create a Date object from YYYY-MM-DD ***
    // Assumes the string represents a date in the local timezone.
    // Creates the date at midnight local time.
    try {
      const parts = dateString.split("-");
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
      const day = parseInt(parts[2], 10);
      // Check if parts are valid numbers before creating date
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        throw new Error("Invalid date parts");
      }
      return new Date(year, month, day); // Creates date at local midnight
    } catch (error) {
      console.error("Error creating date from string:", dateString, error);
      return new Date(); // Fallback to today
    }
  };

  const displayConfirmation = (message) => {
    // (Keep the same as before)
    addHabitConfirm.textContent = message;
    addHabitConfirm.classList.add("visible");
    setTimeout(() => {
      addHabitConfirm.classList.remove("visible");
    }, 2500);
  };

  // --- Data Persistence ---
  const loadHabitsFromStorage = () => {
    // (Keep the same as before)
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        habits = JSON.parse(storedData);
        if (!Array.isArray(habits)) habits = [];
        habits = habits.filter(
          (h) =>
            h &&
            typeof h.id === "number" &&
            typeof h.name === "string" &&
            Array.isArray(h.completedDates)
        );
        console.log(`Loaded ${habits.length} habits from localStorage.`);
      } else {
        habits = [];
        console.log("No habits found in localStorage.");
      }
    } catch (error) {
      console.error("Error loading habits from localStorage:", error);
      habits = [];
      alert("Could not load saved habits. Data might be corrupted.");
    }
  };

  const saveHabitsToStorage = () => {
    // (Keep the same as before)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
      // console.log(`Saved ${habits.length} habits to localStorage.`); // Less verbose
    } catch (error) {
      console.error("Error saving habits to localStorage:", error);
      alert("Could not save habit changes. Storage might be full or disabled.");
    }
  };

  // --- Core Logic ---
  const addNewHabit = () => {
    // (Keep the same as before - relies on render functions)
    const name = newHabitNameInput.value.trim();
    if (!name) {
      alert("Please enter a habit name.");
      return;
    }
    const newHabit = { id: Date.now(), name: name, completedDates: [] };
    habits.push(newHabit);
    saveHabitsToStorage();
    newHabitNameInput.value = "";
    displayConfirmation(`Habit "${name.slice(0, 20)}..." added!`);
    renderHabitLists();
    renderProgress();
    console.log("Added new habit:", newHabit);
  };

  const deleteHabit = (habitId) => {
    // (Keep the same as before - relies on render functions)
    const habitIndex = habits.findIndex((h) => h.id === habitId);
    if (habitIndex === -1) return;
    const habitName = habits[habitIndex].name;
    if (
      confirm(
        `Are you sure you want to delete the habit "${habitName}"? This cannot be undone.`
      )
    ) {
      habits.splice(habitIndex, 1);
      saveHabitsToStorage();
      renderHabitLists();
      renderProgress();
      console.log("Deleted habit:", habitId);
    }
  };

  const toggleHabitCompletion = (habitId, dateString_YYYYMMDD) => {
    // Uses the LOCAL YYYY-MM-DD string for completion tracking now
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const completedIndex = habit.completedDates.indexOf(dateString_YYYYMMDD);
    if (completedIndex > -1) {
      habit.completedDates.splice(completedIndex, 1);
      console.log(
        `Habit ${habitId} marked incomplete for ${dateString_YYYYMMDD}`
      );
    } else {
      habit.completedDates.push(dateString_YYYYMMDD);
      habit.completedDates.sort();
      console.log(
        `Habit ${habitId} marked complete for ${dateString_YYYYMMDD}`
      );
    }
    saveHabitsToStorage();
    renderHabitLists(); // Re-render lists to move the item
    renderProgress(); // Update progress bar
  };

  const changeSelectedDate = (newDate) => {
    // Uses the new LOCAL formatting for comparison
    if (
      formatDateLocal_YYYYMMDD(newDate) ===
      formatDateLocal_YYYYMMDD(selectedDate)
    )
      return;

    selectedDate = newDate; // selectedDate remains a Date object
    console.log(
      "Selected date changed to:",
      formatDateLocal_YYYYMMDD(selectedDate)
    );

    // Update the UI parts dependent on the selected date
    renderHabitLists();
    renderProgress();

    // Update calendar selection. Re-render full calendar only if the month changed.
    const currentVisibleMonth = calendarDate.getMonth();
    const newSelectedMonth = selectedDate.getMonth();

    if (
      currentVisibleMonth === newSelectedMonth &&
      calendarDate.getFullYear() === selectedDate.getFullYear()
    ) {
      // Same month view, just update the selected day styling
      updateCalendarSelection();
    } else {
      // Different month requires rebuilding the calendar view
      calendarDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1
      );
      renderCalendar(); // This will handle marking the new selectedDate within the new view
    }
  };

  const toggleManageMode = () => {
    // (Keep the same as before)
    isManageMode = !isManageMode;
    console.log("Manage mode toggled:", isManageMode);
    manageHabitsButton.classList.toggle("hidden", isManageMode);
    doneManagingButton.classList.toggle("hidden", !isManageMode);
    mainContentElement.classList.toggle("manage-mode", isManageMode);
    renderHabitLists(); // Re-render needed to show/hide delete buttons
  };

  // --- Rendering Functions ---

  const renderHabitLists = () => {
    todoHabitList.innerHTML = "";
    completedHabitList.innerHTML = "";
    const dateStr_YYYYMMDD = formatDateLocal_YYYYMMDD(selectedDate); // Use local format string
    let todoCount = 0;
    let completedCount = 0;

    // Update Header using the Date object
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0); // Ensure comparison is date-only
    if (selectedDate.getTime() === today.getTime()) {
      selectedDateHeader.textContent = "Today";
    } else {
      selectedDateHeader.textContent = selectedDate.toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric", year: "numeric" }
      );
    }

    // Show/Hide general messages and manage button
    const hasHabits = habits.length > 0;
    noHabitsMsg.classList.toggle("hidden", hasHabits);
    manageHabitsButton.classList.toggle("hidden", !hasHabits || isManageMode);
    doneManagingButton.classList.toggle("hidden", !isManageMode);
    if (!hasHabits && isManageMode) toggleManageMode(); // Exit manage mode if no habits

    if (!hasHabits) {
      noTodoMsg.classList.add("hidden");
      noCompletedMsg.classList.add("hidden");
      return; // Nothing more to render
    }

    // Populate lists
    habits.forEach((habit) => {
      const li = document.createElement("li");
      li.className = "habit-item";
      li.dataset.habitId = habit.id;

      // Check completion using the local date string format
      const isCompleted = habit.completedDates.includes(dateStr_YYYYMMDD);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = isCompleted;
      checkbox.id = `habit-${habit.id}-${dateStr_YYYYMMDD}`;
      // Pass the local format string to the handler
      checkbox.addEventListener("change", () =>
        toggleHabitCompletion(habit.id, dateStr_YYYYMMDD)
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
        completedCount++;
      } else {
        todoHabitList.appendChild(li);
        todoCount++;
      }
    });

    noTodoMsg.classList.toggle("hidden", todoCount > 0);
    noCompletedMsg.classList.toggle("hidden", completedCount > 0);
    mainContentElement.classList.toggle("manage-mode", isManageMode);
  };

  const renderCalendar = () => {
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

    // Get today's date string in LOCAL format for comparison
    const today = new Date();
    const todayStr_YYYYMMDD = formatDateLocal_YYYYMMDD(today);
    // Get selected date string in LOCAL format for comparison
    const selectedDateStr_YYYYMMDD = formatDateLocal_YYYYMMDD(selectedDate);

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const cell = document.createElement("div");
      cell.className = "day-cell";
      cell.textContent = day;

      const cellDate = new Date(year, month, day);
      // Store the LOCAL date string on the element
      const cellDateStr_YYYYMMDD = formatDateLocal_YYYYMMDD(cellDate);
      cell.dataset.date = cellDateStr_YYYYMMDD;

      // Compare using LOCAL date strings
      if (cellDateStr_YYYYMMDD === todayStr_YYYYMMDD)
        cell.classList.add("today");
      if (cellDateStr_YYYYMMDD === selectedDateStr_YYYYMMDD)
        cell.classList.add("selected");

      cell.addEventListener("click", handleCalendarDayClick);
      calGridBody.appendChild(cell);
    }
  };

  const updateCalendarSelection = () => {
    // Updates selection based on the current selectedDate's LOCAL string format
    const selectedDateStr_YYYYMMDD = formatDateLocal_YYYYMMDD(selectedDate);
    const allCells = calGridBody.querySelectorAll(".day-cell[data-date]");
    allCells.forEach((cell) => {
      cell.classList.toggle(
        "selected",
        cell.dataset.date === selectedDateStr_YYYYMMDD
      );
    });
  };

  const renderProgress = () => {
    // Use local date format for checking completions
    const dateStr_YYYYMMDD = formatDateLocal_YYYYMMDD(selectedDate);
    let completedCount = 0;
    const totalHabits = habits.length;

    // Update Progress Header Date (using Date object for formatting)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0); // Ensure comparison is date-only
    if (selectedDate.getTime() === today.getTime()) {
      progressForDateEl.textContent = "Today";
    } else {
      progressForDateEl.textContent = selectedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }

    if (totalHabits === 0) {
      progressStatsEl.textContent = "No habits yet";
      progressBarInner.style.width = "0%";
      return;
    }

    // Check completions using the LOCAL date string
    habits.forEach((habit) => {
      if (habit.completedDates.includes(dateStr_YYYYMMDD)) {
        completedCount++;
      }
    });

    const percentage = Math.round((completedCount / totalHabits) * 100);
    progressStatsEl.textContent = `${completedCount} / ${totalHabits} Completed`;
    progressBarInner.style.width = `${percentage}%`;
  };

  // --- Event Handlers ---
  const handleCalendarDayClick = (event) => {
    const target = event.target.closest(".day-cell");
    // Use the new reliable date creation utility
    if (
      target &&
      target.dataset.date &&
      !target.classList.contains("disabled")
    ) {
      const newSelectedDate = createDateFrom_YYYYMMDD(target.dataset.date);
      changeSelectedDate(newSelectedDate);
    }
  };

  const handlePrevMonth = () => {
    // (Keep the same as before)
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  };

  const handleNextMonth = () => {
    // (Keep the same as before)
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  };

  // --- Initialization ---
  const initializeApp = () => {
    console.log("Initializing App...");
    try {
      // Set initial dates (normalized to start of LOCAL day)
      selectedDate.setHours(0, 0, 0, 0);
      calendarDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1
      );

      addHabitButton.addEventListener("click", addNewHabit);
      newHabitNameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") addNewHabit();
      });
      calPrevMonthBtn.addEventListener("click", handlePrevMonth);
      calNextMonthBtn.addEventListener("click", handleNextMonth);
      manageHabitsButton.addEventListener("click", toggleManageMode);
      doneManagingButton.addEventListener("click", toggleManageMode);

      loadHabitsFromStorage();
      renderCalendar(); // Will now use local date comparisons
      renderHabitLists();
      renderProgress();

      loadingOverlay.classList.add("hidden");
      console.log("Initialization Complete.");
    } catch (error) {
      console.error("FATAL ERROR during Initialization:", error);
      loadingOverlay.textContent = `Error initializing. Check console (F12). Message: ${error.message}`;
      loadingOverlay.style.color = "red";
    }
  };

  initializeApp();
}); // End DOMContentLoaded
