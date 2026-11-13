document.addEventListener("DOMContentLoaded", () => {

  const tabs = document.querySelectorAll(".role-tab");
  const roleLabel = document.getElementById("roleLabel");
  const statusBox = document.getElementById("formStatus");
  const form = document.getElementById("loginForm");

  const params = new URLSearchParams(window.location.search);

  let selectedRole = params.get("role") || "doctor";


  function setActiveTab(role) {

    selectedRole = role;

    tabs.forEach((tab) => {
      tab.classList.toggle(
        "active",
        tab.dataset.role === role
      );
    });

    roleLabel.textContent =
      role.charAt(0).toUpperCase() + role.slice(1);
  }


  tabs.forEach((tab) => {

    tab.addEventListener("click", () => {
      setActiveTab(tab.dataset.role);
    });

  });


  setActiveTab(selectedRole);


  function showStatus(message, isError = true) {

    statusBox.textContent = message;

    statusBox.className =
      "form-status " +
      (isError ? "error" : "success");

    statusBox.style.display = "block";
  }


  form.addEventListener("submit", async (e) => {

    e.preventDefault();

    statusBox.style.display = "none";


    const registrationId =
      document.getElementById("userId").value.trim();

    const password =
      document.getElementById("password").value;


    if (!registrationId || !password) {

      showStatus(
        "Please fill in both fields."
      );

      return;
    }


    const submitBtn =
      form.querySelector(".login-submit");


    submitBtn.disabled = true;

    submitBtn.textContent = "Signing in...";


    try {

      const data = await api(
        "/auth/login",
        {
          method: "POST",

          body: {
            registrationId,
            password,
            role: selectedRole
          }
        }
      );


      Auth.saveSession(
        data.token,
        data.user
      );


      const dashboardPaths = {

        doctor:
          "pages/doctor/doctor-dashboard.html",

        patient:
          "pages/patient/patient-dashboard.html",

        pharmacy:
          "pages/pharmacy/pharmacy-dashboard.html",

        admin:
          "pages/admin/admin-dashboard.html"

      };


      window.location.href =
        dashboardPaths[selectedRole];


    } catch (error) {

      console.error(error);

      showStatus(
        error.message ||
        "Login failed."
      );

    } finally {

      submitBtn.disabled = false;

      submitBtn.textContent =
        `Sign in as ${
          selectedRole.charAt(0).toUpperCase() +
          selectedRole.slice(1)
        }`;

    }

  });

});