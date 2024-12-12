// src/utils/comboUtils.js

export const generateComboId = () => {
  // Format: COMBO-TIMESTAMP-RANDOM
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `COMBO-${timestamp}-${random}`;
};

export const isComboService = (serviceId, services) => {
  const manikuraService = services.find((s) =>
    s.name.toLowerCase().includes("manikúra")
  );
  const pedikuraService = services.find((s) =>
    s.name.toLowerCase().includes("pedikúra")
  );

  return serviceId === manikuraService?.id || serviceId === pedikuraService?.id;
};
