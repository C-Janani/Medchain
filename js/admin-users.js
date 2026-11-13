/* admin-users.js - lets the admin register doctors, patients, pharmacies and admins */
document.getElementById("auBtn").addEventListener("click", () => {
  const msg = document.getElementById("auMsg");
  const v = (id) => document.getElementById(id).value.trim();
  try {
    const u = RxChain.createUser({
      role: v("auRole"),
      name: v("auName"),
      licenseNumber: v("auLic"),
      specialization: v("auSpec"),
      password: document.getElementById("auPass").value,
    });
    msg.textContent = "Created " + u.role + ": " + u.registrationId + " (" + u.name + "). Share the ID and password with the user.";
    ["auName", "auLic", "auSpec", "auPass"].forEach((id) => { document.getElementById(id).value = ""; });
  } catch (err) {
    msg.textContent = err.message;
  }
});
