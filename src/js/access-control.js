const params = new URLSearchParams(window.location.search);
const source = params.get("source");

if (source !== "emergency") {
  document.body.innerHTML = `
    <main style="padding:2rem;text-align:center;">
      <h2>Access Denied</h2>
      <p>
        Patient search is only available through
        emergency medical access.
      </p>
      <a href="/public/index.html">Return Home</a>
    </main>
  `;
}
