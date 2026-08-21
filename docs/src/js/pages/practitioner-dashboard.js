import { requireAuth, getUserRole, logout } from "../auth/access-control.js";

(async () => {
  const session = await requireAuth("user-login.html");
  const role = await getUserRole(session.user.id);

  if (role.type !== "practitioner") {
    const target = role.type === "patient"
      ? "patient-dashboard.html"
      : role.type === "inactive_practitioner"
        ? "user-login.html?error=account_inactive"
        : "user-login.html?error=account_incomplete";
    window.location.href = target;
    return;
  }

  const btn = document.getElementById("logout-btn");
  if (btn) btn.addEventListener("click", logout);
})();
