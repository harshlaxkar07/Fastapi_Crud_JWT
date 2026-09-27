/* Identity Console — front end for the FastAPI user CRUD + JWT API. */
(function () {
  "use strict";

  const { $, $$, esc, icon, http, toast, modal, initials, debounce, date } = UI;

  http.base = "";

  const TOKEN_KEY = "identity-token";
  let token = null;
  let claims = null;
  let users = [];
  let shellReady = false;

  /* ---------------- token helpers ---------------- */
  function decode(jwt) {
    try {
      const part = jwt.split(".")[1];
      const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(decodeURIComponent(escape(json)));
    } catch (_) {
      return null;
    }
  }

  function setToken(value) {
    token = value;
    claims = value ? decode(value) : null;
    if (value) {
      http.headers.Authorization = "Bearer " + value;
      UI.store.set(TOKEN_KEY, value);
    } else {
      delete http.headers.Authorization;
      try { localStorage.removeItem(TOKEN_KEY); } catch (_) { /* storage unavailable */ }
    }
  }

  const expired = () => !!(claims && claims.exp && claims.exp * 1000 < Date.now());

  /* ---------------- connection ---------------- */
  async function ping() {
    const node = $("#conn");
    if (!node) return;
    const text = $(".conn-text", node);
    try {
      await http.get("/openapi.json");
      node.className = "conn online";
      text.textContent = "API connected";
    } catch (_) {
      node.className = "conn offline";
      text.textContent = "API unreachable";
    }
  }

  /* ---------------- screens ---------------- */
  function showApp() {
    $("#authScreen").classList.add("hidden");
    $("#appScreen").classList.remove("hidden");

    const who = (claims && (claims.sub || claims.username)) || "user";
    $("#meName").textContent = who;
    $("#meAvatar").textContent = initials(String(who).replace(/[._-]/g, " "));

    if (!shellReady) {
      UI.shell({ start: "users" });
      shellReady = true;
    }
    renderToken();
    renderMe();
    loadUsers();
  }

  function showAuth() {
    $("#appScreen").classList.add("hidden");
    $("#authScreen").classList.remove("hidden");
    users = [];
  }

  /* ---------------- auth ---------------- */
  async function signIn(e) {
    e.preventDefault();
    const btn = $("#signinBtn");
    btn.classList.add("loading");
    try {
      const data = await http.post("/login", {
        username: $("#siUser").value.trim(),
        password: $("#siPass").value,
      });
      setToken(data.access_token);
      $("#siPass").value = "";
      toast("Signed in — token issued", "success");
      showApp();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      btn.classList.remove("loading");
    }
  }

  async function signUp(e) {
    e.preventDefault();
    const btn = $("#signupBtn");
    btn.classList.add("loading");
    const username = $("#suUser").value.trim();
    const password = $("#suPass").value;
    try {
      await http.post("/signup", {
        username,
        fullname: $("#suName").value.trim(),
        email: $("#suEmail").value.trim(),
        phone_number: $("#suPhone").value.trim(),
        password,
      });
      toast("Account created — signing you in", "success");
      const data = await http.post("/login", { username, password });
      setToken(data.access_token);
      $("#signupForm").reset();
      showApp();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      btn.classList.remove("loading");
    }
  }

  async function signOut() {
    try { await http.post("/logout", {}); } catch (_) { /* the token is dropped locally either way */ }
    setToken(null);
    showAuth();
    toast("Signed out", "info");
  }

  /* ---------------- users ---------------- */
  async function loadUsers() {
    const host = $("#usersTable");
    host.innerHTML = `<div class="card-body"><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line"></div></div>`;
    try {
      const data = await http.get("/users");
      users = Array.isArray(data) ? data : data && data.users ? data.users : [];
      renderUsers();
      renderStats();
      $("[data-count='users']").textContent = users.length;
    } catch (err) {
      if (err.status === 401) {
        setToken(null);
        showAuth();
        toast("Your session expired — sign in again", "warn");
        return;
      }
      host.innerHTML = `<div class="empty">
        <div class="empty-icon" style="background:var(--danger-soft);color:var(--danger)">${icon("alert", 24)}</div>
        <h3>Could not load users</h3><p>${esc(err.message)}</p></div>`;
    }
  }

  function renderStats() {
    const withEmail = users.filter((u) => u.email).length;
    const withPhone = users.filter((u) => u.phone_number).length;
    $("#userStats").innerHTML = [
      { label: "Accounts", value: users.length, hint: "in the directory", ic: "users" },
      { label: "With email", value: withEmail, hint: "contactable by mail", ic: "mail" },
      { label: "With phone", value: withPhone, hint: "contactable by phone", ic: "phone" },
    ]
      .map(
        (t) => `<div class="stat">
        <div class="stat-icon">${icon(t.ic, 16)}</div>
        <div class="stat-label">${esc(t.label)}</div>
        <div class="stat-value">${esc(t.value)}</div>
        <div class="stat-hint">${esc(t.hint)}</div></div>`
      )
      .join("");
  }

  function renderUsers() {
    const term = ($("#userFilter").value || "").toLowerCase();
    const rows = users.filter((u) =>
      !term
        ? true
        : [u.username, u.fullname, u.email, u.phone_number]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(term)
    );

    const host = $("#usersTable");
    if (!rows.length) {
      host.innerHTML = `<div class="empty">
        <div class="empty-icon">${icon("users", 24)}</div>
        <h3>${users.length ? "No match for that filter" : "The directory is empty"}</h3>
        <p>${
          users.length
            ? "Clear the filter to see every account."
            : "Create an account from the sign-up form and it will be listed here."
        }</p></div>`;
      return;
    }

    host.innerHTML = `
      <div class="table-wrap"><table class="table">
        <thead><tr><th>User</th><th>Email</th><th>Phone</th><th class="num">ID</th><th></th></tr></thead>
        <tbody>${rows
          .map(
            (u) => `
          <tr>
            <td>
              <div class="user-cell">
                <div class="avatar">${esc(initials(u.fullname || u.username))}</div>
                <div class="ub">
                  <div class="un truncate">${esc(u.fullname || "—")}</div>
                  <div class="uu truncate">@${esc(u.username || "")}</div>
                </div>
              </div>
            </td>
            <td class="truncate">${esc(u.email || "—")}</td>
            <td class="nowrap">${esc(u.phone_number || "—")}</td>
            <td class="num mono">${esc(u.user_id ?? u.id ?? "—")}</td>
            <td class="actions">
              <button class="btn btn-sm btn-ghost" data-edit="${esc(u.user_id ?? u.id)}" title="Edit">${icon("edit", 13)}</button>
              <button class="btn btn-sm btn-ghost" data-del="${esc(u.user_id ?? u.id)}" title="Delete">${icon("trash", 13)}</button>
            </td>
          </tr>`
          )
          .join("")}</tbody></table></div>`;

    $$("#usersTable [data-edit]").forEach((b) =>
      b.addEventListener("click", () => editUser(Number(b.dataset.edit)))
    );
    $$("#usersTable [data-del]").forEach((b) =>
      b.addEventListener("click", () => removeUser(Number(b.dataset.del)))
    );
  }

  function editUser(id) {
    const u = users.find((x) => (x.user_id ?? x.id) === id);
    if (!u) return;

    const form = document.createElement("form");
    form.className = "stack";
    form.innerHTML = `
      <div class="field"><label>Username</label>
        <input class="input" name="username" required minlength="3" maxlength="30" value="${esc(u.username || "")}"></div>
      <div class="field"><label>Full name</label>
        <input class="input" name="fullname" required minlength="3" maxlength="100" value="${esc(u.fullname || "")}"></div>
      <div class="field"><label>Email</label>
        <input class="input" name="email" type="email" required value="${esc(u.email || "")}"></div>
      <div class="field"><label>Phone number</label>
        <input class="input" name="phone_number" required minlength="10" maxlength="15" value="${esc(u.phone_number || "")}"></div>`;

    const m = modal({
      title: `Edit ${u.username}`,
      body: form,
      actions: [
        { label: "Cancel", onClick: (close) => close() },
        {
          label: "Save changes",
          variant: "primary",
          onClick: async (close, btn) => {
            if (!form.reportValidity()) return;
            btn.classList.add("loading");
            const payload = Object.fromEntries(new FormData(form).entries());
            try {
              await http.post(`/users/${id}`, payload);
              toast("User updated", "success");
              close();
              loadUsers();
            } catch (err) {
              toast(err.message, "error");
            } finally {
              btn.classList.remove("loading");
            }
          },
        },
      ],
    });
    void m;
  }

  async function removeUser(id) {
    const u = users.find((x) => (x.user_id ?? x.id) === id);
    const ok = await UI.confirm({
      title: "Delete this user?",
      message: `${u ? u.fullname || u.username : "This account"} will be removed from the directory.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await http.del(`/users/${id}`);
      toast("User deleted", "success");
      loadUsers();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function removeAll() {
    if (!users.length) {
      toast("The directory is already empty", "info");
      return;
    }
    const ok = await UI.confirm({
      title: "Delete every user?",
      message: `All ${users.length} accounts will be removed from the directory.`,
      confirmLabel: "Delete all",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await http.del("/users");
      toast(res && res.message ? res.message : "All users deleted", "success");
      loadUsers();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  /* ---------------- account ---------------- */
  function renderMe() {
    const who = (claims && (claims.sub || claims.username)) || "—";
    const me = users.find((u) => u.username === who);
    $("#meCard").innerHTML = `
      <div class="row" style="gap:13px;margin-bottom:16px">
        <div class="avatar lg">${esc(initials(String(who).replace(/[._-]/g, " ")))}</div>
        <div>
          <h3>${esc(me ? me.fullname || who : who)}</h3>
          <div class="muted small">@${esc(who)}</div>
        </div>
      </div>
      <dl class="kv">
        ${me && me.email ? `<dt>Email</dt><dd>${esc(me.email)}</dd>` : ""}
        ${me && me.phone_number ? `<dt>Phone</dt><dd>${esc(me.phone_number)}</dd>` : ""}
        ${me ? `<dt>User ID</dt><dd class="mono">${esc(me.user_id ?? me.id)}</dd>` : ""}
        <dt>Token expires</dt><dd>${claims && claims.exp ? esc(date(claims.exp * 1000, true)) : "—"}</dd>
      </dl>`;
  }

  async function changePassword(e) {
    e.preventDefault();
    const btn = $("#pwBtn");
    btn.classList.add("loading");
    try {
      const res = await http.post("/password", {
        password: $("#pwCurrent").value,
        new_password: $("#pwNew").value,
      });
      toast(res && res.message ? res.message : "Password updated", "success");
      $("#pwForm").reset();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      btn.classList.remove("loading");
    }
  }

  /* ---------------- token page ---------------- */
  function renderToken() {
    $("#tokenRaw").textContent = token || "—";
    $("#tokenPayload").innerHTML = claims
      ? UI.highlightJson(claims)
      : '<span class="dim">No payload available.</span>';

    const exp = claims && claims.exp ? claims.exp * 1000 : null;
    const issued = claims && claims.iat ? claims.iat * 1000 : null;
    const left = exp ? exp - Date.now() : null;
    const total = exp && issued ? exp - issued : null;
    const remaining = left && total ? Math.max(0, Math.min(1, left / total)) : null;

    $("#tokenValidity").innerHTML = `
      <dl class="kv mb-2">
        <dt>Subject</dt><dd class="mono">${esc((claims && claims.sub) || "—")}</dd>
        ${issued ? `<dt>Issued</dt><dd>${esc(date(issued, true))}</dd>` : ""}
        <dt>Expires</dt><dd>${exp ? esc(date(exp, true)) : "—"}</dd>
        <dt>Status</dt><dd>${
          expired()
            ? '<span class="badge danger">Expired</span>'
            : '<span class="badge ok"><span class="dot"></span>Active</span>'
        }</dd>
      </dl>
      ${
        remaining !== null
          ? `<div class="meter ${remaining < 0.2 ? "warn" : "ok"}"><span style="width:${remaining * 100}%"></span></div>
             <div class="xs dim mt-1">${Math.max(0, Math.round(left / 60000))} minutes of validity left</div>`
          : ""
      }`;
  }

  /* ---------------- boot ---------------- */
  function init() {
    UI.initTheme();
    UI.hydrateIcons();
    $$("[data-theme-toggle]").forEach((b) => b.addEventListener("click", UI.toggleTheme));

    $$("[data-auth-tab]").forEach((b) =>
      b.addEventListener("click", () => {
        const tab = b.dataset.authTab;
        $$("[data-auth-tab]").forEach((x) => x.classList.toggle("active", x === b));
        $("#signinForm").classList.toggle("hidden", tab !== "signin");
        $("#signupForm").classList.toggle("hidden", tab !== "signup");
      })
    );

    $$("[data-reveal]").forEach((b) =>
      b.addEventListener("click", () => {
        const input = $("#" + b.dataset.reveal);
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        b.innerHTML = icon(show ? "x" : "eye", 16);
      })
    );

    const pw = $("#suPass");
    pw.addEventListener("input", () => {
      const v = pw.value;
      let score = 0;
      if (v.length >= 8) score++;
      if (v.length >= 12) score++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
      if (/\d/.test(v)) score++;
      if (/[^\w\s]/.test(v)) score++;
      const meter = $("#pwMeter");
      meter.style.width = (score / 5) * 100 + "%";
      meter.className = score >= 4 ? "good" : score >= 3 ? "mid" : "";
      $("#pwHint").textContent =
        v.length < 8
          ? "Use 8 characters or more"
          : score >= 4
          ? "Strong password"
          : score >= 3
          ? "Reasonable password"
          : "Add a capital, a digit or a symbol";
    });

    $("#signinForm").addEventListener("submit", signIn);
    $("#signupForm").addEventListener("submit", signUp);
    $("#signout").addEventListener("click", signOut);
    $("#pwForm").addEventListener("submit", changePassword);
    $("#deleteAll").addEventListener("click", removeAll);
    $("#userFilter").addEventListener("input", debounce(renderUsers, 180));
    $("#refresh").addEventListener("click", async (e) => {
      e.currentTarget.classList.add("loading");
      await loadUsers();
      renderToken();
      renderMe();
      e.currentTarget.classList.remove("loading");
    });
    $("#copyToken").addEventListener("click", () => token && UI.copy(token));

    const saved = UI.store.get(TOKEN_KEY);
    if (saved) {
      setToken(saved);
      if (expired()) {
        setToken(null);
        showAuth();
        toast("Your previous session expired", "info");
      } else {
        showApp();
      }
    } else {
      showAuth();
    }

    ping();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
