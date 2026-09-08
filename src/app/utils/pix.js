function ascii(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function emvField(id, value) {
  const clean = ascii(value);
  const length = String(clean.length).padStart(2, "0");
  return `${id}${length}${clean}`;
}

export function createPixPayload({ pixKey, name, city, txid = "***", amount }) {
  const cleanKey = ascii(pixKey);
  if (!cleanKey) throw new Error("PIX key is required");

  const cleanName = ascii(name).toUpperCase();
  if (!cleanName) throw new Error("PIX receiver name is required");
  if (cleanName.length > 25) throw new Error("PIX receiver name must be at most 25 characters");

  const cleanCity = ascii(city).toUpperCase();
  if (!cleanCity) throw new Error("PIX receiver city is required");
  if (cleanCity.length > 15) throw new Error("PIX receiver city must be at most 15 characters");

  const cleanTxid = txid === undefined || txid === null ? "***" : ascii(txid);

  const merchantAccount = emvField("00", "br.gov.bcb.pix") + emvField("01", cleanKey);

  let payload = emvField("00", "01");
  payload += emvField("26", merchantAccount);
  payload += emvField("52", "0000");
  payload += emvField("53", "986");
  if (amount) payload += emvField("54", Number(amount).toFixed(2));
  payload += emvField("58", "BR");
  payload += emvField("59", cleanName);
  payload += emvField("60", cleanCity);
  payload += emvField("62", emvField("05", cleanTxid));
  payload += "6304";

  return payload + crc16(payload);
}
