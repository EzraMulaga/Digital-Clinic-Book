import { routeAfterAuth } from "../auth/authRouter.js";

// after successful login:
await routeAfterAuth({
  patientDashboard: "patient-dashboard.html",
  practitionerDashboard: "practitioner-dashboard.html",
  unknownRedirect: "user-login.html",
});
