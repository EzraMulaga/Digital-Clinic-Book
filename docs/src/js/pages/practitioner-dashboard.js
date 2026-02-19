import { requireAuth, getUserRole, logout } from "../auth/access-control";// adjust path

(async () => {
  const session = await requireAuth("user-login.html");
  const role = await getUserRole(session.user.id);

  if (role.type !== "practitioner") {
    window.location.href = role.type === "patient"
      ? "patient-dashboard.html"
      : "user-login.html";
    return;
  }

  const btn = document.getElementById("logout-btn");
  if (btn) btn.addEventListener("click", logout);
})();
