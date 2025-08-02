document.addEventListener("DOMContentLoaded", () => {

  const monthLabel = document.getElementById("monthLabel");
  const daysGrid = document.getElementById("daysGrid");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const todayBtn = document.getElementById("todayBtn");
  const form = document.getElementById("eventForm");
  const feedback = document.getElementById("feedback");
  const clearBtn = document.getElementById("clearBtn");
  const bigCreateBtn = document.getElementById("bigCreateBtn");
  const sidebar = document.querySelector(".event-sidebar");
  const closeSidebar = document.getElementById("closeSidebar");
  const shareLinksDiv = document.getElementById("shareLinks");


  const guestEmailsContainer = document.getElementById("guestEmailsContainer");
  const guestEmailInput = document.getElementById("guestEmailInput");
  const guestEmailError = document.getElementById("guestEmailError");
  const guestCountInput = form.querySelector("input[name=guestCount]");


  const allDayCheckbox = form.querySelector("input[name=allDay]");
  const startTimeInput = form.querySelector("input[name=start]");
  const endTimeInput = form.querySelector("input[name=end]");

  let currentDate = new Date();
  let selectedCell = null;
  let guestEmails = [];
  let lastCreatedEventId = null;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function loadEvents() {
    try {
      const raw = localStorage.getItem("calendarEvents");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function saveEvents(evts) {
    localStorage.setItem("calendarEvents", JSON.stringify(evts));
  }


  function normalizeBackendEvent(evt) {
    return {
      id: evt.id,
      title: evt.title,
      date: evt.date,
      startTime: evt.start_time || "",
      endTime: evt.end_time || "",
      allDay: evt.all_day,
      description: evt.description,
      location: evt.location,
      guestCount: evt.guest_emails.length,
      guestEmails: evt.guest_emails,
      organizerEmail: evt.organizer_email,
      createdAt: evt.created_at,
    };
  }


  async function fetchEventsFromBackend() {
    try {
      const res = await fetch("http://127.0.0.1:8000/events");
      if (!res.ok) throw new Error("Failed to fetch events");
      const events = await res.json();
      const mapped = events.map(normalizeBackendEvent);
      saveEvents(mapped);
      renderCalendar(currentDate);
    } catch (err) {
      console.warn("Backend load failed, falling back to local:", err);
      renderCalendar(currentDate);
    }
  }


  function syncGuestCount() {
    if (guestCountInput) guestCountInput.value = guestEmails.length;
  }

  function renderGuestTags() {
    guestEmailsContainer.querySelectorAll(".email-tag").forEach(el => el.remove());
    guestEmails.forEach((email, idx) => {
      const tag = document.createElement("div");
      tag.className = "email-tag";
      if (!emailRegex.test(email)) tag.classList.add("invalid");
      const span = document.createElement("span");
      span.textContent = email;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-btn";
      remove.setAttribute("aria-label", `Remove ${email}`);
      remove.innerHTML = "&times;";
      remove.addEventListener("click", e => {
        e.stopPropagation();
        guestEmails.splice(idx, 1);
        syncGuestCount();
        renderGuestTags();
        guestEmailError.textContent = "";
      });
      tag.appendChild(span);
      tag.appendChild(remove);
      guestEmailsContainer.insertBefore(tag, guestEmailInput);
    });
  }

  function addEmailsFromString(str) {
    const parts = str
      .split(/[\n,]+/)
      .map(e => e.trim())
      .filter(e => e);
    parts.forEach(p => {
      if (!guestEmails.includes(p)) guestEmails.push(p);
    });
    syncGuestCount();
    renderGuestTags();
  }

  function tryAddCurrentInput() {
    const val = guestEmailInput.value.trim();
    if (!val) return;
    addEmailsFromString(val);
    guestEmailInput.value = "";
  }

  function getGuestEmailsForSubmission() {
    const invalid = guestEmails.filter(e => !emailRegex.test(e));
    if (invalid.length) {
      guestEmailError.textContent = `Invalid email(s): ${invalid.join(", ")}`;
      return null;
    }
    guestEmailError.textContent = "";
    return guestEmails.slice();
  }


  function isSameDay(d1, d2) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  function formatDisplayTime(evt) {
    if (evt.allDay) return "All day";
    return `${evt.startTime || ""} - ${evt.endTime || ""}`.trim();
  }


  function renderCalendar(date) {
    daysGrid.innerHTML = "";
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = lastOfMonth.getDate();
    const prevMonthLast = new Date(year, month, 0).getDate();
    const totalCells = 42;

    monthLabel.textContent = date.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    const today = new Date();
    const events = loadEvents();

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement("div");
      cell.className = "day";
      let dayNumber, cellDate;

      if (i < startWeekday) {
        dayNumber = prevMonthLast - (startWeekday - 1 - i);
        cell.classList.add("inactive");
        cellDate = new Date(year, month - 1, dayNumber);
      } else if (i >= startWeekday + daysInMonth) {
        dayNumber = i - (startWeekday + daysInMonth) + 1;
        cell.classList.add("inactive");
        cellDate = new Date(year, month + 1, dayNumber);
      } else {
        dayNumber = i - startWeekday + 1;
        cellDate = new Date(year, month, dayNumber);
      }


      const dateDiv = document.createElement("div");
      dateDiv.className = "date";
      dateDiv.textContent = dayNumber;
      if (isSameDay(cellDate, today)) {
        cell.classList.add("today");
        dateDiv.innerHTML = `<strong>${dayNumber}</strong> <span style="font-size:0.6em;opacity:0.7;">Today</span>`;
      }
      cell.appendChild(dateDiv);


      const matching = events.filter(evt => {
        const evtDate = new Date(evt.date);
        return isSameDay(evtDate, cellDate);
      });

      if (matching.length) {
        const dotWrapper = document.createElement("div");
        dotWrapper.style.display = "flex";
        dotWrapper.style.flexWrap = "wrap";
        dotWrapper.style.gap = "4px";
        matching.forEach(evt => {
          const dot = document.createElement("span");
          dot.className = "event-dot";
          dot.setAttribute("aria-label", evt.title);
          dot.title = `${evt.title} • ${formatDisplayTime(evt)}`;

          dot.addEventListener("mouseenter", () => {
            const tip = document.createElement("div");
            tip.className = "event-tooltip";
            tip.dataset.for = evt.id;
            tip.innerHTML = `
              <div><strong>${evt.title}</strong></div>
              <div>${formatDisplayTime(evt)}</div>
              <div><em>Location:</em> ${evt.location || "N/A"}</div>
              <div><em>Guests:</em> ${evt.guestCount || 0}</div>
              <div><em>Organizer:</em> ${evt.organizerEmail || ""}</div>
              <div style="margin-top:4px;font-size:0.65em;">${evt.description || ""}</div>
            `;
            dot.appendChild(tip);
          });
          dot.addEventListener("mouseleave", () => {
            const existing = dot.querySelector(".event-tooltip");
            if (existing) existing.remove();
          });

          dotWrapper.appendChild(dot);
        });
        cell.appendChild(dotWrapper);
      }


      cell.addEventListener("click", () => {
        if (selectedCell) selectedCell.classList.remove("selected-day");
        selectedCell = cell;
        cell.classList.add("selected-day");

        const dateInput = form.querySelector("input[name=date]");
        if (dateInput) {
          const y = cellDate.getFullYear();
          const m = String(cellDate.getMonth() + 1).padStart(2, "0");
          const d = String(cellDate.getDate()).padStart(2, "0");
          dateInput.value = `${y}-${m}-${d}`;
        }
        showSidebar();
      });

      daysGrid.appendChild(cell);
    }
  }


  function showSidebar() {
    sidebar.classList.add("visible");
    sidebar.setAttribute("aria-hidden", "false");
    if (bigCreateBtn) bigCreateBtn.style.display = "none";

    if (shareLinksDiv) shareLinksDiv.innerHTML = "";
  }

  function hideSidebar() {
    sidebar.classList.remove("visible");
    sidebar.setAttribute("aria-hidden", "true");
    if (bigCreateBtn) bigCreateBtn.style.display = "";
    if (selectedCell) {
      selectedCell.classList.remove("selected-day");
      selectedCell = null;
    }
 
    if (shareLinksDiv) shareLinksDiv.innerHTML = "";
  }

  prevBtn?.addEventListener("click", () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    renderCalendar(currentDate);
  });
  nextBtn?.addEventListener("click", () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    renderCalendar(currentDate);
  });
  todayBtn?.addEventListener("click", () => {
    currentDate = new Date();
    renderCalendar(currentDate);
  });

  bigCreateBtn?.addEventListener("click", () => {
    showSidebar();
  });

  closeSidebar?.addEventListener("click", () => {
    hideSidebar();
  });


  guestEmailInput.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      tryAddCurrentInput();
    } else if (e.key === "Backspace" && !guestEmailInput.value) {
      guestEmails.pop();
      syncGuestCount();
      renderGuestTags();
      guestEmailError.textContent = "";
    }
  });

  guestEmailInput.addEventListener("paste", e => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData("text");
    addEmailsFromString(paste);
  });

  guestEmailInput.addEventListener("blur", () => {
    tryAddCurrentInput();
  });

  allDayCheckbox.addEventListener("change", () => {
    if (allDayCheckbox.checked) {
      startTimeInput.value = "00:00";
      endTimeInput.value = "12:00";
      startTimeInput.disabled = true;
      endTimeInput.disabled = true;
    } else {
      startTimeInput.disabled = false;
      endTimeInput.disabled = false;
    }
  });


  form.addEventListener("submit", async e => {
    e.preventDefault();
    feedback.textContent = "";
    if (shareLinksDiv) shareLinksDiv.innerHTML = "";

    const data = new FormData(form);
    const title = data.get("title")?.toString().trim();
    const date = data.get("date")?.toString();
    const start = data.get("start")?.toString();
    const end = data.get("end")?.toString();
    const allDay = Boolean(data.get("allDay"));
    const description = data.get("description")?.toString().trim();
    const location = data.get("location")?.toString().trim() || "";
    const organizerEmail = data.get("organizerEmail")?.toString().trim();
    const guestCount = Number(data.get("guestCount")) || 0;

    if (!title || !date) {
      feedback.textContent = "Title and date are required.";
      return;
    }
    if (!allDay && (!start || !end)) {
      feedback.textContent = "Start and end time required unless all-day.";
      return;
    }
    if (!organizerEmail) {
      feedback.textContent = "Organizer email is required.";
      return;
    }

    const guestEmailsList = getGuestEmailsForSubmission();
    if (guestEmailsList === null) return;

    if (guestEmailsList.length !== guestCount) {
      feedback.textContent = `Guest count (${guestCount}) doesn't match number of emails (${guestEmailsList.length}).`;
      return;
    }

    
    const payload = {
      title,
      date,
      start_time: start ? `${start}:00` : null,
      end_time: end ? `${end}:00` : null,
      all_day: allDay,
      description,
      location,
      organizer_email: organizerEmail,
      guest_emails: guestEmailsList,
    };

    try {
      const resp = await fetch("http://127.0.0.1:8000/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        feedback.textContent = "Save failed: " + (err?.detail || resp.statusText);
        return;
      }

      const created = await resp.json();
      feedback.textContent = "Event saved.";


      const normalized = normalizeBackendEvent(created);
      const existing = loadEvents();
      existing.push(normalized);
      saveEvents(existing);

      lastCreatedEventId = created.id;

      form.reset();
      guestEmails = [];
      syncGuestCount();
      renderGuestTags();
      renderCalendar(currentDate);


      if (shareLinksDiv) {
        const baseUrl = window.location.origin;
        const eventLink = `${baseUrl}/event/${lastCreatedEventId}`;
        shareLinksDiv.innerHTML = `
          <p>Share this event link:</p>
          <input type="text" readonly value="${eventLink}" style="width: 100%; padding: 6px;"/>
          <div class="share-buttons">
            <button id="copyLinkBtn" type="button" title="Copy link">📋 Copy Link</button>
            <button id="shareEmailBtn" type="button" title="Share via Email">✉️ Email</button>
          </div>
        `;

        document.getElementById("copyLinkBtn").addEventListener("click", () => {
          navigator.clipboard.writeText(eventLink);
          alert("Link copied to clipboard!");
        });

        document.getElementById("shareEmailBtn").addEventListener("click", () => {
          const subject = encodeURIComponent(`Invitation: ${title}`);
          const body = encodeURIComponent(`Hi,\n\nYou are invited to the event "${title}".\n\nDetails:\nDate: ${date}\nTime: ${allDay ? "All day" : `${start} - ${end}`}\nLocation: ${location}\n\nView event here: ${eventLink}\n\nBest regards.`);
          window.location.href = `mailto:?subject=${subject}&body=${body}`;
        });
      }

      setTimeout(() => (feedback.textContent = ""), 3000);
    } catch (err) {
      console.error("Network error:", err);
      feedback.textContent = "Network error, could not save event.";
    }
  });

  clearBtn.addEventListener("click", () => {
    form.reset();
    feedback.textContent = "";
    guestEmails = [];
    syncGuestCount();
    renderGuestTags();
    guestEmailError.textContent = "";
    if (shareLinksDiv) shareLinksDiv.innerHTML = "";
    startTimeInput.disabled = false;
    endTimeInput.disabled = false;
  });


  syncGuestCount();
  renderGuestTags();
  renderCalendar(currentDate);
  fetchEventsFromBackend();
});
