const NodeClam = require('clamscan');
const config = require('../config/config');
const logger = require('../utils/logger');

let clamscan = null;
let scannerAvailable = false;
let initAttempted = false;

const initScanner = async () => {
  if (initAttempted) return;
  initAttempted = true;

  try {
    logger.info('Initializing ClamAV scanner...', { host: config.clamav.host, port: config.clamav.port });
    clamscan = await new NodeClam().init({
      removeInfected: false,
      quarantineInfected: false,
      scanLog: null,
      debugMode: false,
      clamdscan: {
        host: config.clamav.host,
        port: config.clamav.port,
        timeout: 30000,
        localFallback: false,
        active: true,
      },
      preference: 'clamdscan'
    });
    scannerAvailable = true;
    logger.success('ClamAV scanner ready');
  } catch (err) {
    scannerAvailable = false;
    logger.warn('ClamAV not available - running in DEMO mode (no real scanning)', { error: err.message });
  }
};

// Initialize on module load
initScanner();

const scanFile = async (filePath) => {
  if (!scannerAvailable) {
    logger.warn('ClamAV unavailable - returning DEMO scan result (clean)');
    // In demo mode, simulate a quick scan
    await new Promise(r => setTimeout(r, 500));
    return {
      isInfected: false,
      viruses: [],
      demoMode: true
    };
  }

  try {
    const result = await clamscan.scanFile(filePath);
    return {
      isInfected: result.isInfected,
      viruses: result.viruses || [],
      demoMode: false
    };
  } catch (err) {
    logger.error('Scan failed', { error: err.message });
    return { isInfected: false, viruses: [], demoMode: true, error: err.message };
  }
};

const isScannerAvailable = () => scannerAvailable;

module.exports = { scanFile, isScannerAvailable };
