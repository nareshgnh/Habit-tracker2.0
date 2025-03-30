document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Loaded - Initializing Grid Habits v2");

  // --- Get DOM Elements ---
  const loadingOverlay = document.getElementById("loading-overlay");
  // Header
  const prevMonthBtn = document.getElementById("prev-month-btn");
  const nextMonthBtn = document.getElementById("next-month-btn");
  const monthYearDisplay = document.getElementById("month-year-display");
  const manageHabitsBtn = document.getElementById("manage-habits-btn");
  const addHabitBtn = document.getElementById("add-habit-btn");
  const doneManagingBtn = document.getElementById("done-managing-btn");
  const darkModeToggle = document.getElementById("dark-mode-toggle");
  const themeIconSun = document.getElementById("theme-icon-sun");
  const themeIconMoon = document.getElementById("theme-icon-moon");
  // Main Content
  const habitTableHead = document.getElementById("habit-table-head");
  const habitTableBody = document.getElementById("habit-table-body");
  const noHabitsMsg = document.getElementById("no-habits-msg");
  const habitTableWrapper = document.getElementById("habit-table-wrapper");
  // Confirmation
  const globalConfirmationMessage = document.getElementById(
    "global-confirmation-message"
  );
  const confirmationArea = document.getElementById("confirmation-area");
  // Add Habit Modal
  const addHabitModal = document.getElementById("add-habit-modal");
  const addHabitForm = document.getElementById("add-habit-form");
  const modalHabitNameInput = document.getElementById("modal-habit-name");
  const modalStartDateInput = document.getElementById("modal-start-date");
  const modalDurationInput = document.getElementById("modal-duration");
  const modalGoalInput = document.getElementById("modal-habit-goal"); // Added Goal Input
  const addModalCloseBtn = addHabitModal.querySelector(".modal-close-btn");
  const addModalCancelBtn = addHabitModal.querySelector(".modal-cancel-btn");
  const addModalOverlay = addHabitModal.querySelector(".modal-overlay");

  // --- Application State ---
  let habits = []; // { id, name, startDate, endDate, goal, completedDates }
  let currentMonthDate = new Date();
  let isManageMode = false;
  const STORAGE_KEY = "gridHabitsDataV2"; // New key for new structure
  const THEME_KEY = "gridHabitsTheme";

  // --- Utility Functions ---
  const formatDateLocal_YYYYMMDD = (date) => {
    /* ... as before ... */ if (!(date instanceof Date) || isNaN(date))
      date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const createDateFrom_YYYYMMDD = (dateString) => {
    /* ... as before ... */ try {
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
      return new Date(year, month, day);
    } catch (error) {
      console.error("Error creating date from string:", dateString, error);
      return new Date();
    }
  };
  const getDaysInMonth = (year, month) =>
    new Date(year, month + 1, 0).getDate();
  const displayGlobalConfirmation = (message) => {
    /* ... as before ... */ globalConfirmationMessage.textContent = message;
    globalConfirmationMessage.classList.add("visible");
    if (confirmationArea.timeoutId) clearTimeout(confirmationArea.timeoutId);
    confirmationArea.timeoutId = setTimeout(() => {
      globalConfirmationMessage.classList.remove("visible");
    }, 2500);
  };

  // --- Theme Handling ---
  const applyTheme = (theme) => {
    /* ... as before ... */ document.body.classList.remove(
      "light-mode",
      "dark-mode"
    );
    document.body.classList.add(theme);
    themeIconSun.classList.toggle("hidden", theme === "dark-mode");
    themeIconMoon.classList.toggle("hidden", theme === "light-mode");
    localStorage.setItem(THEME_KEY, theme);
    console.log(`Theme applied: ${theme}`);
  };
  const toggleTheme = () => {
    /* ... as before ... */ const currentTheme =
      document.body.classList.contains("dark-mode")
        ? "dark-mode"
        : "light-mode";
    const newTheme = currentTheme === "light-mode" ? "dark-mode" : "light-mode";
    applyTheme(newTheme);
  };
  const loadTheme = () => {
    /* ... as before ... */ const savedTheme = localStorage.getItem(THEME_KEY);
    const preferredTheme =
      savedTheme ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark-mode"
        : "light-mode");
    applyTheme(preferredTheme);
  };

  // --- Data Persistence ---
  const loadHabitsFromStorage = () => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        let loadedHabits = JSON.parse(storedData);
        if (!Array.isArray(loadedHabits)) loadedHabits = [];
        const validHabits = [];
        const dS = "1970-01-01",
          dE = "9999-12-31",
          dG = 30; // Default goal 30
        loadedHabits.forEach((h) => {
          if (
            h &&
            typeof h.id === "number" &&
            typeof h.name === "string" &&
            Array.isArray(h.completedDates)
          ) {
            // Ensure all required fields exist, including goal
            const habitToAdd = {
              id: h.id,
              name: h.name,
              startDate: h.startDate || dS,
              endDate: h.endDate || dE,
              goal: typeof h.goal === "number" && h.goal > 0 ? h.goal : dG, // Validate or default goal
              completedDates: h.completedDates,
            };
            if (
              typeof habitToAdd.startDate !== "string" ||
              habitToAdd.startDate.length !== 10
            )
              habitToAdd.startDate = dS;
            if (
              typeof habitToAdd.endDate !== "string" ||
              habitToAdd.endDate.length !== 10
            )
              habitToAdd.endDate = dE;
            validHabits.push(habitToAdd);
          }
        });
        habits = validHabits;
        console.log(`Loaded ${habits.length} habits (v2 structure).`);
      } else {
        habits = [];
        console.log("No habits found.");
      }
    } catch (error) {
      console.error("Error loading habits:", error);
      habits = [];
      alert("Could not load saved habits.");
    }
  };
  const saveHabitsToStorage = () => {
    /* ... as before, using STORAGE_KEY ... */ try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch (error) {
      console.error("Error saving habits:", error);
      alert("Could not save habit changes.");
    }
  };

  // --- Modal Handling ---
  const openModal = (modalElement) => {
    if (!modalElement) return;
    modalElement.classList.add("modal-open");
    if (modalElement.id === "add-habit-modal") {
      addHabitForm.reset();
      modalStartDateInput.value = formatDateLocal_YYYYMMDD(new Date());
      modalDurationInput.value = 365; // Default duration 1 year
      modalGoalInput.value = 30; // Default goal 30 days/month
      modalHabitNameInput.focus();
    }
    console.log(`Modal opened: ${modalElement.id}`);
  };
  const closeModal = (modalElement) => {
    /* ... as before ... */ if (!modalElement) return;
    modalElement.classList.remove("modal-open");
    console.log(`Modal closed: ${modalElement.id}`);
  };

  // --- Core Logic ---
  const addNewHabitFromModal = () => {
    const name = modalHabitNameInput.value.trim();
    const startDateValue = modalStartDateInput.value;
    const durationDays = parseInt(modalDurationInput.value, 10);
    const goalDays = parseInt(modalGoalInput.value, 10); // Get goal

    if (
      !name ||
      !startDateValue ||
      isNaN(durationDays) ||
      durationDays <= 0 ||
      isNaN(goalDays) ||
      goalDays <= 0
    ) {
      alert(
        "Please fill in all fields correctly (Name, Start Date, Duration >= 1, Goal >= 1)."
      );
      return false;
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
        goal: goalDays,
        completedDates: [],
      }; // Add goal
      habits.push(newHabit);
      saveHabitsToStorage();
      displayGlobalConfirmation(`Habit "${name.slice(0, 25)}..." added.`);
      renderTableBody(); // Re-render just the body is enough
      console.log("Added new habit from modal:", newHabit);
      return true;
    } catch (error) {
      console.error("Error processing new habit:", error);
      alert("Error saving habit.");
      return false;
    }
  };
  const deleteHabit = (habitId) => {
    /* ... as before ... */ const habitIndex = habits.findIndex(
      (h) => h.id === habitId
    );
    if (habitIndex === -1) return;
    const habitName = habits[habitIndex].name;
    if (confirm(`Delete "${habitName}"?`)) {
      habits.splice(habitIndex, 1);
      saveHabitsToStorage();
      displayGlobalConfirmation(
        `Habit "${habitName.slice(0, 25)}..." deleted.`
      );
      renderTableBody();
      console.log("Deleted habit:", habitId);
    }
  };

  const toggleHabitCompletion = (habitId, dateString_YYYYMMDD, targetCell) => {
    const habit = habits.find((h) => h.id === habitId);
    if (
      !habit ||
      dateString_YYYYMMDD < habit.startDate ||
      dateString_YYYYMMDD > habit.endDate
    )
      return;

    const completedIndex = habit.completedDates.indexOf(dateString_YYYYMMDD);
    let isCompleted;
    if (completedIndex > -1) {
      habit.completedDates.splice(completedIndex, 1);
      isCompleted = false;
    } else {
      habit.completedDates.push(dateString_YYYYMMDD);
      habit.completedDates.sort();
      isCompleted = true;
    }
    saveHabitsToStorage();

    // Update Cell Appearance
    targetCell.classList.toggle("cell-completed", isCompleted);

    // Update Achievement Count for the row
    updateAchievementCell(habitId, targetCell.closest("tr")); // Pass the row element
  };

  const updateAchievementCell = (habitId, tableRow) => {
    if (!tableRow) return; // Safety check
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const achieveCell = tableRow.querySelector(".achievement-cell");
    if (!achieveCell) return;

    // Recalculate completed days *within the currently viewed month*
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth(); // 0-indexed
    let completedInMonth = 0;
    habit.completedDates.forEach((dateStr) => {
      // Only count if the completion date is within the current month view
      if (dateStr.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)) {
        completedInMonth++;
      }
    });

    achieveCell.textContent = completedInMonth;
    achieveCell.classList.toggle("goal-met", completedInMonth >= habit.goal); // Add class if goal met/exceeded
  };

  const changeMonth = (direction) => {
    /* ... as before ... */ currentMonthDate.setMonth(
      currentMonthDate.getMonth() + direction
    );
    currentMonthDate.setDate(1);
    console.log("Month changed to:", currentMonthDate.toLocaleDateString());
    renderTable();
  };
  const toggleManageMode = () => {
    /* ... as before ... */ isManageMode = !isManageMode;
    manageHabitsBtn.classList.toggle("hidden", isManageMode);
    doneManagingBtn.classList.toggle("hidden", !isManageMode);
    if (habitTableBody)
      habitTableBody.classList.toggle("manage-mode", isManageMode);
    else console.error("Cannot find table body to toggle manage mode class.");
  };

  // --- Rendering Functions ---
  const renderTableHeader = () => {
    habitTableHead.innerHTML = ""; // Clear previous header
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const todayStr = formatDateLocal_YYYYMMDD(new Date());
    monthYearDisplay.textContent = currentMonthDate.toLocaleDateString(
      "en-US",
      { month: "long", year: "numeric" }
    );

    const row1 = document.createElement("tr");
    const thHabit = document.createElement("th");
    thHabit.textContent = "Habits";
    thHabit.className = "habit-col-header";
    thHabit.rowSpan = 2;
    row1.appendChild(thHabit);
    for (let day = 1; day <= daysInMonth; day++) {
      const thDayLetter = document.createElement("th");
      const currentDate = new Date(year, month, day);
      thDayLetter.textContent = currentDate
        .toLocaleDateString("en-US", { weekday: "short" })
        .charAt(0);
      thDayLetter.classList.add("day-col-header");
      if (formatDateLocal_YYYYMMDD(currentDate) === todayStr)
        thDayLetter.classList.add("current-day-header");
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6)
        thDayLetter.classList.add("weekend-header");
      row1.appendChild(thDayLetter);
    }
    const thGoal = document.createElement("th");
    thGoal.textContent = "Goal";
    thGoal.className = "goal-col-header";
    thGoal.rowSpan = 2;
    row1.appendChild(thGoal); // Added Goal Header
    const thAchieve = document.createElement("th");
    thAchieve.textContent = "Achieved";
    thAchieve.className = "achieve-col-header";
    thAchieve.rowSpan = 2;
    row1.appendChild(thAchieve);
    habitTableHead.appendChild(row1);

    const row2 = document.createElement("tr");
    for (let day = 1; day <= daysInMonth; day++) {
      const thDayNum = document.createElement("th");
      thDayNum.textContent = day;
      thDayNum.classList.add("day-num-header");
      const currentDate = new Date(year, month, day);
      if (formatDateLocal_YYYYMMDD(currentDate) === todayStr)
        thDayNum.classList.add("current-day-header");
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6)
        thDayNum.classList.add("weekend-header");
      row2.appendChild(thDayNum);
    }
    habitTableHead.appendChild(row2);
  };

  const renderTableBody = () => {
    habitTableBody.innerHTML = "";
    noHabitsMsg.classList.toggle("hidden", habits.length > 0);
    if (habits.length === 0) {
      if (isManageMode) toggleManageMode();
      manageHabitsBtn.classList.add("hidden");
      doneManagingBtn.classList.add("hidden");
      return;
    } else {
      manageHabitsBtn.classList.toggle("hidden", isManageMode);
      doneManagingBtn.classList.toggle("hidden", !isManageMode);
    }

    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const todayStr = formatDateLocal_YYYYMMDD(new Date());

    habits.forEach((habit) => {
      const tr = document.createElement("tr");
      tr.dataset.habitId = habit.id;
      const tdHabit = document.createElement("td");
      tdHabit.className = "habit-name-cell";
      const nameSpan = document.createElement("span");
      nameSpan.textContent = habit.name;
      tdHabit.appendChild(nameSpan);
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "habit-delete-button";
      deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 000 1.5h.3l.867 8.67A2 2 0 005.885 16h4.23a2 2 0 001.968-1.83L12.95 5.5h.3a.75.75 0 000-1.5H11v-.75A2.25 2.25 0 008.75 1h-1.5A2.25 2.25 0 005 3.25zm2.25-.75a.75.75 0 00-.75.75V4h3v-.75a.75.75 0 00-.75-.75h-1.5z" clip-rule="evenodd" /></svg>`;
      deleteBtn.title = `Delete "${habit.name}"`;
      deleteBtn.addEventListener("click", () => deleteHabit(habit.id));
      tdHabit.appendChild(deleteBtn);
      tr.appendChild(tdHabit);

      let completedInMonth = 0; // Reset for each habit row

      // Day Cells
      for (let day = 1; day <= daysInMonth; day++) {
        const tdDay = document.createElement("td");
        tdDay.classList.add("day-cell");
        const currentDate = new Date(year, month, day);
        const dateStr = formatDateLocal_YYYYMMDD(currentDate);
        if (dateStr === todayStr) tdDay.classList.add("current-day-cell");
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6)
          tdDay.classList.add("weekend-cell");

        if (dateStr >= habit.startDate && dateStr <= habit.endDate) {
          const isCompleted = habit.completedDates.includes(dateStr);
          if (isCompleted) {
            tdDay.classList.add("cell-completed");
            completedInMonth++; // Count completion for *this month*
          }
          const checkSvg = `<svg class="check-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" /></svg>`;
          tdDay.innerHTML = checkSvg;
          tdDay.addEventListener("click", (e) =>
            toggleHabitCompletion(habit.id, dateStr, e.currentTarget)
          );
        } else {
          tdDay.classList.add("cell-off-day");
          tdDay.style.cursor = "default";
        }
        tr.appendChild(tdDay);
      }

      // Goal Cell
      const tdGoal = document.createElement("td");
      tdGoal.className = "goal-cell";
      tdGoal.textContent = habit.goal; // Display the goal
      tr.appendChild(tdGoal);

      // Achievement Cell (displays count for the *current month*)
      const tdAchieve = document.createElement("td");
      tdAchieve.className = "achievement-cell";
      tdAchieve.textContent = completedInMonth; // Initial count for the month
      tdAchieve.classList.toggle("goal-met", completedInMonth >= habit.goal); // Initial check if goal met
      tr.appendChild(tdAchieve);

      habitTableBody.appendChild(tr);
    });
    habitTableBody.classList.toggle("manage-mode", isManageMode);
  };

  const renderTable = () => {
    console.log("Rendering full table...");
    renderTableHeader();
    renderTableBody();
  };

  // --- Event Handlers ---
  const handleAddHabitFormSubmit = (event) => {
    event.preventDefault();
    if (addNewHabitFromModal()) closeModal(addHabitModal);
  };
  const handleTableScroll = () => {
    const isScrolled = habitTableWrapper.scrollLeft > 5;
    habitTableWrapper.setAttribute("data-scrolled", isScrolled);
  }; // Trigger shadow slightly later

  // --- Initialization ---
  const initializeApp = () => {
    console.log("Initializing Grid Habits v2...");
    try {
      currentMonthDate.setDate(1); // Start view on the 1st

      // Element Checks
      if (!habitTableHead || !habitTableBody)
        throw new Error("Core table elements not found.");
      if (!addHabitModal) throw new Error("Add habit modal element not found.");
      if (!manageHabitsBtn || !doneManagingBtn)
        throw new Error("Manage buttons not found.");

      // Add Event Listeners
      addHabitBtn.addEventListener("click", () => openModal(addHabitModal));
      addModalCloseBtn.addEventListener("click", () =>
        closeModal(addHabitModal)
      );
      addModalCancelBtn.addEventListener("click", () =>
        closeModal(addHabitModal)
      );
      addModalOverlay.addEventListener("click", () =>
        closeModal(addHabitModal)
      );
      addHabitForm.addEventListener("submit", handleAddHabitFormSubmit);
      prevMonthBtn.addEventListener("click", () => changeMonth(-1));
      nextMonthBtn.addEventListener("click", () => changeMonth(1));
      manageHabitsBtn.addEventListener("click", toggleManageMode);
      doneManagingBtn.addEventListener("click", toggleManageMode);
      darkModeToggle.addEventListener("click", toggleTheme);
      habitTableWrapper.addEventListener("scroll", handleTableScroll);
      document.addEventListener("keydown", (e) => {
        if (
          e.key === "Escape" &&
          addHabitModal.classList.contains("modal-open")
        ) {
          closeModal(addHabitModal);
        }
      });

      loadTheme();
      loadHabitsFromStorage();
      renderTable();

      loadingOverlay.classList.add("hidden");
      console.log("Initialization Complete.");
    } catch (error) {
      console.error("FATAL ERROR during Initialization:", error);
      if (loadingOverlay) {
        loadingOverlay.classList.remove("hidden");
        loadingOverlay.innerHTML = `<div style='text-align:center; color: var(--clr-danger);'>Initialization Failed!<br>Check console (F12).<br><small>${error.message}</small></div>`;
      } else {
        alert(`Initialization Error: ${error.message}. Check console.`);
      }
    }
  };

  initializeApp();
}); // End DOMContentLoaded
