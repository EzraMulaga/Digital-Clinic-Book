import { requireAuth, getUserRole, logout } from "../auth/access-control.js";

(async () => {
  const session = await requireAuth("user-login.html");
  const role = await getUserRole(session.user.id);

  if (role.type !== "patient") {
    // optional: redirect practitioner to their dashboard
    const target = role.type === "practitioner"
      ? "practitioner-dashboard.html"
      : role.type === "inactive_practitioner"
        ? "user-login.html?error=account_inactive"
        : "user-login.html?error=account_incomplete";
    window.location.href = target;
    return;
  }

  // attach logout button if you have one
  const btn = document.getElementById("logout-btn");
  if (btn) btn.addEventListener("click", logout);
})();
