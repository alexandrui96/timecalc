const ipInput = document.getElementById('ipAddress');
const prefixInput = document.getElementById('prefix');
const maskInput = document.getElementById('subnetMask');
const calculateBtn = document.getElementById('calculateBtn');
const resetBtn = document.getElementById('resetBtn');
const copySummaryBtn = document.getElementById('copySummaryBtn');

const networkValue = document.getElementById('networkValue');
const broadcastValue = document.getElementById('broadcastValue');
const firstUsableValue = document.getElementById('firstUsableValue');
const lastUsableValue = document.getElementById('lastUsableValue');
const maskValue = document.getElementById('maskValue');
const wildcardValue = document.getElementById('wildcardValue');
const usableHostsValue = document.getElementById('usableHostsValue');
const totalHostsValue = document.getElementById('totalHostsValue');
const classValue = document.getElementById('classValue');
const typeValue = document.getElementById('typeValue');
const binaryIp = document.getElementById('binaryIp');
const binaryMask = document.getElementById('binaryMask');
const binaryNetwork = document.getElementById('binaryNetwork');
const binaryBroadcast = document.getElementById('binaryBroadcast');

const toastTemplate = document.getElementById('toastTemplate');

const DEFAULT_STATE = {
  ip: '',
  prefix: '',
  mask: ''
};

function ipToInt(ip) {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    throw new Error('Invalid IPv4 address');
  }

  return octets.reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0;
}

function intToIp(value) {
  const octets = [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255
  ];

  return octets.join('.');
}

function prefixToMask(prefix) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error('CIDR prefix must be between 0 and 32');
  }

  const maskInt = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  return intToIp(maskInt);
}

function maskToPrefix(mask) {
  const maskInt = ipToInt(mask);

  if (maskInt === 0) {
    return 0;
  }

  let bits = 0;
  let seenZero = false;
  let value = maskInt >>> 0;

  for (let i = 0; i < 32; i += 1) {
    if ((value & 0x80000000) !== 0) {
      if (seenZero) {
        throw new Error('Invalid subnet mask');
      }
      bits += 1;
    } else {
      seenZero = true;
    }
    value = (value << 1) >>> 0;
  }

  return bits;
}

function toBinaryOctets(ip) {
  return ip.split('.').map((octet) => Number(octet).toString(2).padStart(8, '0')).join('.');
}

function getAddressClass(ipInt) {
  const firstOctet = (ipInt >>> 24) & 255;

  if (firstOctet >= 1 && firstOctet <= 126) return 'A';
  if (firstOctet >= 128 && firstOctet <= 191) return 'B';
  if (firstOctet >= 192 && firstOctet <= 223) return 'C';
  if (firstOctet >= 224 && firstOctet <= 239) return 'D';
  return 'E';
}

function getType(ipInt) {
  const firstOctet = (ipInt >>> 24) & 255;
  const secondOctet = (ipInt >>> 16) & 255;

  if (firstOctet === 10) return 'Private';
  if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) return 'Private';
  if (firstOctet === 192 && secondOctet === 168) return 'Private';
  if (firstOctet === 127) return 'Loopback';
  if (firstOctet === 169 && secondOctet === 254) return 'Link-local';
  return 'Public';
}

function validateAndNormalizeInput() {
  const ip = ipInput.value.trim();
  const prefixField = prefixInput.value.trim();
  const maskText = maskInput.value.trim();

  if (!ip) throw new Error('IPv4 address is required');

  const ipInt = ipToInt(ip);
  let resolvedPrefix;

  if (prefixField !== '') {
    resolvedPrefix = Number(prefixField);
    if (!Number.isInteger(resolvedPrefix) || resolvedPrefix < 0 || resolvedPrefix > 32) {
      throw new Error('CIDR prefix must be between 0 and 32');
    }
  } else if (maskText !== '') {
    resolvedPrefix = maskToPrefix(maskText);
  } else {
    throw new Error('Enter a CIDR prefix or subnet mask');
  }

  const maskInt = resolvedPrefix === 0 ? 0 : ((0xffffffff << (32 - resolvedPrefix)) >>> 0);
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | (~maskInt >>> 0)) >>> 0;

  return {
    ip,
    ipInt,
    prefix: resolvedPrefix,
    mask: intToIp(maskInt),
    maskInt,
    networkInt,
    broadcastInt,
    className: getAddressClass(ipInt),
    type: getType(ipInt)
  };
}

function clearResults() {
  networkValue.textContent = '—';
  broadcastValue.textContent = '—';
  firstUsableValue.textContent = '—';
  lastUsableValue.textContent = '—';
  maskValue.textContent = '—';
  wildcardValue.textContent = '—';
  usableHostsValue.textContent = '—';
  totalHostsValue.textContent = '—';
  classValue.textContent = '—';
  typeValue.textContent = '—';
  binaryIp.textContent = '—';
  binaryMask.textContent = '—';
  binaryNetwork.textContent = '—';
  binaryBroadcast.textContent = '—';
}

function renderResult(result) {
  const totalAddresses = 2 ** (32 - result.prefix);
  const usableHosts = result.prefix >= 31 ? totalAddresses : Math.max(0, totalAddresses - 2);
  const firstUsable = result.prefix === 31 ? result.networkInt : result.prefix === 32 ? result.ipInt : result.networkInt + 1;
  const lastUsable = result.prefix === 31 ? result.broadcastInt : result.prefix === 32 ? result.ipInt : result.broadcastInt - 1;

  prefixInput.value = String(result.prefix);
  maskInput.value = result.mask;

  networkValue.textContent = intToIp(result.networkInt);
  broadcastValue.textContent = intToIp(result.broadcastInt);
  firstUsableValue.textContent = intToIp(firstUsable);
  lastUsableValue.textContent = intToIp(lastUsable);
  maskValue.textContent = result.mask;
  wildcardValue.textContent = intToIp((~result.maskInt) >>> 0);
  usableHostsValue.textContent = usableHosts.toLocaleString();
  totalHostsValue.textContent = totalAddresses.toLocaleString();
  classValue.textContent = result.className;
  typeValue.textContent = result.type;

  binaryIp.textContent = toBinaryOctets(result.ip);
  binaryMask.textContent = toBinaryOctets(result.mask);
  binaryNetwork.textContent = toBinaryOctets(intToIp(result.networkInt));
  binaryBroadcast.textContent = toBinaryOctets(intToIp(result.broadcastInt));

  ipInput.setCustomValidity('');
  maskInput.setCustomValidity('');
}

function updateUI() {
  try {
    const result = validateAndNormalizeInput();
    renderResult(result);
  } catch (error) {
    clearResults();
    ipInput.setCustomValidity(error.message || 'Invalid input');
    maskInput.setCustomValidity(error.message || 'Invalid input');
    console.error(error);
  }
}

function attachEvents() {
  calculateBtn.addEventListener('click', () => {
    try {
      const result = validateAndNormalizeInput();
      renderResult(result);
      ipInput.reportValidity();
      maskInput.reportValidity();
    } catch (error) {
      clearResults();
      ipInput.setCustomValidity(error.message || 'Invalid input');
      maskInput.setCustomValidity(error.message || 'Invalid input');
      ipInput.reportValidity();
      maskInput.reportValidity();
      console.error(error);
    }
  });

  [ipInput, prefixInput, maskInput].forEach((element) => {
    element.addEventListener('input', () => {
      if (element !== prefixInput && element !== maskInput) {
        return;
      }

      if (element === prefixInput && prefixInput.value.trim() !== '') {
        maskInput.value = '';
      }

      if (element === maskInput && maskInput.value.trim() !== '') {
        prefixInput.value = '';
      }
    });
  });

  document.querySelectorAll('.example-btn').forEach((button) => {
    button.addEventListener('click', () => {
      ipInput.value = button.dataset.ip;
      prefixInput.value = button.dataset.prefix;
      maskInput.value = '';
      clearResults();
    });
  });

  resetBtn.addEventListener('click', () => {
    ipInput.value = DEFAULT_STATE.ip;
    prefixInput.value = DEFAULT_STATE.prefix;
    maskInput.value = DEFAULT_STATE.mask;
    clearResults();
    ipInput.setCustomValidity('');
    maskInput.setCustomValidity('');
  });

  copySummaryBtn.addEventListener('click', async () => {
    const summary = [
      `Address: ${ipInput.value}`,
      `CIDR: /${prefixInput.value}`,
      `Mask: ${maskValue.textContent}`,
      `Network: ${networkValue.textContent}`,
      `Broadcast: ${broadcastValue.textContent}`,
      `Usable Range: ${firstUsableValue.textContent} - ${lastUsableValue.textContent}`,
      `Total Hosts: ${totalHostsValue.textContent}`,
      `Usable Hosts: ${usableHostsValue.textContent}`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      showToast('Summary copied');
    } catch (error) {
      const fallback = document.createElement('textarea');
      fallback.value = summary;
      document.body.appendChild(fallback);
      fallback.select();
      document.execCommand('copy');
      fallback.remove();
      showToast('Summary copied');
    }
  });
}

function showToast(message) {
  const toast = toastTemplate.content.firstElementChild.cloneNode(true);
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1600);
}

ipInput.value = DEFAULT_STATE.ip;
prefixInput.value = DEFAULT_STATE.prefix;
maskInput.value = DEFAULT_STATE.mask;
clearResults();
attachEvents();
