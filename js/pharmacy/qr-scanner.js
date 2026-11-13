/* ==========================================================================
   qr-scanner.js — logic for scan-qr.html
   Uses jsQR (loaded via CDN in the page) to decode camera frames. Falls
   back gracefully to manual entry if the camera is unavailable or blocked.
   Depends on blockchain.js being loaded first.
   ========================================================================== */

(function () {
  const session = RxChain.requireRole("pharmacy", "../../login.html");
  document.getElementById("sbUserName").textContent = session.userId;

  document.getElementById("signOutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    RxChain.signOut("../../login.html");
  });

  const video = document.getElementById("video");
  const canvas = document.getElementById("hiddenCanvas");
  const ctx = canvas.getContext("2d");
  const startBtn = document.getElementById("startCam");
  const stopBtn = document.getElementById("stopCam");
  const placeholder = document.getElementById("scanPlaceholder");
  const guide = document.getElementById("scanGuide");
  const camNote = document.getElementById("camNote");

  let stream = null;
  let scanning = false;

  function goToPrescription(id, token) {
    window.location.href = `verify-prescription.html?id=${encodeURIComponent(id)}` +
      (token ? `&token=${encodeURIComponent(token)}` : "");
  }

  function tryDecode(payloadText) {
    // QR payload is JSON like {"id":"RX-1001","hash":"0x..."}. Accept a
    // raw ID too, in case someone types/scans just the code.
    try {
      const data = JSON.parse(payloadText);
      // The server writes {prescriptionId, qrToken, blockHash}; older QR codes used {id, token}.
      const id = data && (data.prescriptionId || data.id);
      if (id) return { id, token: data.qrToken || data.token || "" };
    } catch (e) {
      /* not JSON — fall through */
    }
    return { id: payloadText.trim(), token: "" };
  }

  function scanLoop() {
    if (!scanning) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA && window.jsQR) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data) {
        scanning = false;
        stopCamera();
        const decoded = tryDecode(code.data);
        goToPrescription(decoded.id, decoded.token);
        return;
      }
    }

    requestAnimationFrame(scanLoop);
  }

  function cameraErrorText(err) {
    switch (err && err.name) {
      case "NotAllowedError":
      case "SecurityError":
        return "Camera permission is blocked. Click the lock icon in the address bar > Site settings > Camera > Allow, then reload.";
      case "NotFoundError":
      case "OverconstrainedError":
        return "No camera was found on this device.";
      case "NotReadableError":
      case "AbortError":
        return "Camera is being used by another app/tab (Zoom, Meet, another browser tab). Close it and try again.";
      default:
        return "Camera unavailable (" + (err && err.message ? err.message : err) + ").";
    }
  }

  async function startCamera() {
    camNote.textContent = "";

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      camNote.textContent = "This page needs HTTPS (or localhost) for camera access. You can also enter the prescription ID manually.";
      return;
    }
    if (!window.jsQR) {
      camNote.textContent = "QR decoder (jsQR) failed to load - check internet connection. Camera can't decode without it.";
      return;
    }

    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      } catch (firstErr) {
        if (firstErr && (firstErr.name === "NotAllowedError" || firstErr.name === "NotReadableError")) throw firstErr;
        // Laptop / unusual camera: retry with the simplest constraint.
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      // Show the <video> BEFORE play() so the browser actually renders frames.
      placeholder.style.display = "none";
      video.style.display = "block";
      guide.style.display = "block";
      video.setAttribute("playsinline", "true");
      video.muted = true;
      video.srcObject = stream;
      await video.play();

      startBtn.style.display = "none";
      stopBtn.style.display = "inline-flex";
      camNote.textContent = "Camera active - hold the QR steady inside the frame.";

      scanning = true;
      requestAnimationFrame(scanLoop);
    } catch (err) {
      console.error("[scan-qr] camera error:", err);
      stopCamera();
      camNote.textContent = cameraErrorText(err) + " You can still use manual entry or upload a QR image.";
    }
  }

  function stopCamera() {
    scanning = false;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    video.style.display = "none";
    guide.style.display = "none";
    placeholder.style.display = "block";
    startBtn.style.display = "inline-flex";
    stopBtn.style.display = "none";
  }

  startBtn.addEventListener("click", startCamera);
  stopBtn.addEventListener("click", stopCamera);


  /* ---------------- QR image upload ---------------- */
  const fileInput = document.getElementById("qrFile");
  const fileNote = document.getElementById("fileNote");

  function decodeImageElement(img) {
    // Try at a few sizes - large photos / tiny QR images decode better scaled.
    const sizes = [1, 0.5, 0.25];
    for (const scale of sizes) {
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      if (w > 2400) continue;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h);
      const code = jsQR(data.data, w, h, { inversionAttempts: "attemptBoth" });
      if (code && code.data) return code.data;
    }
    return null;
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      fileNote.textContent = "Please choose an image file (PNG / JPG).";
      return;
    }
    if (!window.jsQR) {
      fileNote.textContent = "QR decoder (jsQR) failed to load - check internet connection.";
      return;
    }
    fileNote.textContent = "Reading QR...";
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const text = decodeImageElement(img);
      URL.revokeObjectURL(url);
      if (!text) {
        fileNote.textContent = "No QR code found in that image. Try a clearer, closer image.";
        return;
      }
      const decoded = tryDecode(text);
      goToPrescription(decoded.id, decoded.token);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      fileNote.textContent = "Could not open that image.";
    };
    img.src = url;
  });

  document.getElementById("manualBtn").addEventListener("click", () => {
    const val = document.getElementById("manualId").value.trim();
    if (val) goToPrescription(val);
  });

  document.getElementById("manualId").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("manualBtn").click();
  });
})();
