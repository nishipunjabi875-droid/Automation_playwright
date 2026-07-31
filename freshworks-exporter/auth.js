require('dotenv').config();

/**
 * Authentication & Configuration module
 */
class AuthManager {
  constructor() {
    this.domain = process.env.FRESHWORKS_DOMAIN || '';
    this.apiKey = process.env.FRESHWORKS_API_KEY || '';
    this.concurrencyLimit = parseInt(process.env.CONCURRENCY_LIMIT || '5', 10);
    this.maxRetries = parseInt(process.env.MAX_RETRIES || '5', 10);
    this.downloadAttachments = process.env.DOWNLOAD_ATTACHMENTS === 'true';
    this.startDate = process.env.START_DATE ? new Date(process.env.START_DATE) : null;
    this.endDate = process.env.END_DATE ? new Date(process.env.END_DATE) : null;
    this.outputDir = process.env.OUTPUT_DIR || './output';

    this.validate();
  }

  /**
   * Validates required configuration items
   */
  validate() {
    if (!this.domain) {
      throw new Error('Missing FRESHWORKS_DOMAIN in environment variables or .env file');
    }
    if (!this.apiKey) {
      throw new Error('Missing FRESHWORKS_API_KEY in environment variables or .env file');
    }
  }

  /**
   * Normalizes the base URL for Freshworks API
   * Handles domains specified with or without protocol (https://) or /v2 path
   * @returns {string} Normalized Base URL
   */
  getBaseUrl() {
    let cleanDomain = this.domain.trim().replace(/\/+$/, '');

    // Add protocol if missing
    if (!cleanDomain.startsWith('http://') && !cleanDomain.startsWith('https://')) {
      cleanDomain = `https://${cleanDomain}`;
    }

    // Append /v2 if not present
    if (!cleanDomain.endsWith('/v2')) {
      cleanDomain = `${cleanDomain}/v2`;
    }

    return cleanDomain;
  }

  /**
   * Generates authorization headers for Axios requests
   * Freshworks supports 'Bearer <token>' or raw token
   * @returns {Object} Headers object
   */
  getHeaders() {
    const rawToken = this.apiKey.trim();
    const authHeader = rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`;

    return {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }
}

module.exports = new AuthManager();
