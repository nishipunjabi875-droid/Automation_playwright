const axios = require('axios');
const urlModule = require('url');

class LinkCrawler {
  constructor(baseUrl, maxUrls = 50) {
    this.baseUrl = baseUrl;
    this.maxUrls = maxUrls;
    this.visitedUrls = new Set();
    this.brokenLinks = [];
    this.checkedLinksCount = 0;
  }

  // Check if a link is internal to our base domain
  isInternal(linkUrl) {
    try {
      const baseHost = new URL(this.baseUrl).hostname;
      const linkHost = new URL(linkUrl).hostname;
      return baseHost === linkHost;
    } catch (e) {
      return false;
    }
  }

  // Normalize link URL (resolve relative paths, remove query/hash if needed)
  normalizeUrl(rawUrl, sourcePageUrl) {
    try {
      // Resolve relative path to absolute
      const resolved = new URL(rawUrl, sourcePageUrl).href;
      // Strip hash fragments
      const parsed = new URL(resolved);
      parsed.hash = '';
      return parsed.href;
    } catch (e) {
      return null;
    }
  }

  // Validate a single URL via HTTP HEAD/GET request
  async checkLink(linkUrl, sourcePage) {
    if (this.visitedUrls.has(linkUrl)) return;
    this.visitedUrls.add(linkUrl);
    this.checkedLinksCount++;

    const result = {
      sourcePage,
      url: linkUrl,
      status: 0,
      isBroken: false,
      error: ''
    };

    try {
      // Try HEAD request first for efficiency
      let response;
      try {
        response = await axios.head(linkUrl, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          validateStatus: () => true
        });
      } catch (err) {
        // Fallback to GET on network/protocol error during HEAD
        response = null;
      }

      // If HEAD is not allowed (405/403) or failed, try GET
      if (!response || response.status === 405 || response.status === 403 || response.status === 400) {
        response = await axios.get(linkUrl, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          validateStatus: () => true,
          // Limit payload size
          maxContentLength: 100000 
        });
      }

      result.status = response.status;
      if (response.status >= 400) {
        result.isBroken = true;
        result.error = `HTTP Error Status: ${response.status}`;
        this.brokenLinks.push(result);
      }
    } catch (e) {
      result.isBroken = true;
      result.status = e.response ? e.response.status : 500;
      result.error = e.message;
      this.brokenLinks.push(result);
    }
  }

  // Concurrently validate a list of links
  async checkLinksInBatch(links, sourcePage, concurrency = 10) {
    const urlsToCheck = [];
    for (const link of links) {
      const normalized = this.normalizeUrl(link.href, sourcePage);
      // Skip if normalization failed or already visited
      if (!normalized || this.visitedUrls.has(normalized)) continue;
      
      // Limit check count to stay responsive
      if (this.visitedUrls.size >= this.maxUrls) break;
      
      urlsToCheck.push(normalized);
    }

    // Execute in batches
    for (let i = 0; i < urlsToCheck.length; i += concurrency) {
      const batch = urlsToCheck.slice(i, i + concurrency);
      await Promise.all(batch.map(url => this.checkLink(url, sourcePage)));
    }
  }
}

module.exports = LinkCrawler;
