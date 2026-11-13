const QRCode = require("qrcode");

async function generatePrescriptionQR(data) {
  return QRCode.toDataURL(JSON.stringify(data));
}

module.exports = {
  generatePrescriptionQR,
};
