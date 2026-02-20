import { requireAuth, getUserRole, logout } from "../auth/access-control.js";

(async () => {
  const session = await requireAuth("user-login.html");
  const role = await getUserRole(session.user.id);

  if (role.type !== "patient") {
    // optional: redirect practitioner to their dashboard
    window.location.href = role.type === "practitioner"
      ? "practitioner-dashboard.html"
      : "user-login.html";
    return;
  }

  // attach logout button if you have one
  const btn = document.getElementById("logout-btn");
  if (btn) btn.addEventListener("click", logout);
})();
