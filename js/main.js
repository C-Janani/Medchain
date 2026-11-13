/* ==========================================================================
   main.js — landing page interactions
   ========================================================================== */

(function () {
  // Retype the hash line on the hero seal, like a ledger writing a new block.
  const hashLine = document.querySelector(".hash-line");
  if (!hashLine) return;

  const fullHash = "0x8f3a9c1e...d47b2";
  const cursor = document.createElement("span");
  cursor.className = "cursor";

  function typeHash() {
    hashLine.textContent = "";
    hashLine.appendChild(cursor);
    let i = 0;

    const interval = setInterval(() => {
      hashLine.textContent = fullHash.slice(0, i + 1);
      hashLine.appendChild(cursor);
      i++;
      if (i >= fullHash.length) clearInterval(interval);
    }, 55);
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    hashLine.textContent = fullHash;
  } else {
    typeHash();
  }
})();
