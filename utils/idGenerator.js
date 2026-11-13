const crypto = require("crypto");

function generatePrescriptionId() {
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `RX-${Date.now()}-${random}`;
}

function generateQrToken() {
  return crypto.randomBytes(24).toString("hex");
}

module.exports = {
  generatePrescriptionId,
  generateQrToken,
};