const axios = require('axios');
const fs = require('fs');
const path = require('path');
const auth = require('./auth');
const { sleep, ensureDir } = require('./utils');

/**
 * Resilient Freshworks Messaging / Freshchat API Client
 */
class FreshworksApiClient {
  constructor() {
    this.baseUrl = auth.getBaseUrl();
    this.headers = auth.getHeaders();
    this.maxRetries = auth.maxRetries;

    // Cache for Users and Agents to minimize redundant API calls
    this.userCache = new Map();
    this.agentCache = new Map();

    // Create Axios instance
    this.axiosClient = axios.create({
      baseURL: this.baseUrl,
      headers: this.headers,
      timeout: 30000
    });
  }

  /**
   * Wrapper around Axios with automatic retries and exponential backoff for 429 and 5xx
   * @param {Object} config - Axios request config
   * @param {number} attempt - Current retry count
   * @returns {Promise<any>} Response data
   */
  async requestWithRetry(config, attempt = 1) {
    try {
      const response = await this.axiosClient.request(config);
      return response.data;
    } catch (error) {
      const status = error.response ? error.response.status : null;
      const isRateLimited = status === 429;
      const isServerError = status >= 500 && status < 600;
      const isNetworkError = !status;

      if ((isRateLimited || isServerError || isNetworkError) && attempt <= this.maxRetries) {
        // Calculate backoff time: use Retry-After header if present, or exponential backoff
        let backoffMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);

        if (isRateLimited && error.response && error.response.headers['retry-after']) {
          const retryAfterSec = parseInt(error.response.headers['retry-after'], 10);
          if (!isNaN(retryAfterSec)) {
            backoffMs = (retryAfterSec + 1) * 1000;
          }
        }

        console.warn(`⚠️ [API ${status || 'Network Error'}] Retry ${attempt}/${this.maxRetries} for ${config.url}. Waiting ${Math.round(backoffMs / 1000)}s...`);
        await sleep(backoffMs);

        return this.requestWithRetry(config, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Fetches a single page of conversations
   * Handles page number pagination OR cursor/token pagination
   * @param {Object} params - Query parameters or page tokens
   * @returns {Promise<Object>} Object containing conversations array and next pagination reference
   */
  async fetchConversationsPage(params = {}) {
    const query = {
      page: params.page || 1,
      per_page: params.per_page || 50
    };

    if (params.page_token) {
      query.page_token = params.page_token;
    }

    const config = {
      method: 'GET',
      url: '/conversations',
      params: query
    };

    // If custom URL is provided from link headers or next token href
    if (params.nextUrl) {
      config.url = params.nextUrl;
      config.params = {};
    }

    const data = await this.requestWithRetry(config);

    // Extract conversations list
    let conversations = [];
    if (Array.isArray(data)) {
      conversations = data;
    } else if (data.conversations && Array.isArray(data.conversations)) {
      conversations = data.conversations;
    } else if (data.items && Array.isArray(data.items)) {
      conversations = data.items;
    }

    // Determine pagination state
    let nextPage = null;
    let nextToken = null;
    let nextUrl = null;

    if (data.pagination) {
      if (data.pagination.page && data.pagination.total_pages && data.pagination.page < data.pagination.total_pages) {
        nextPage = data.pagination.page + 1;
      }
      if (data.pagination.next_page_token) {
        nextToken = data.pagination.next_page_token;
      }
    }

    if (data.link && data.link.next && data.link.next.href) {
      nextUrl = data.link.next.href;
    }

    return {
      conversations,
      nextPage,
      nextToken,
      nextUrl,
      raw: data
    };
  }

  /**
   * Fetches all conversations automatically handling pagination & date range filtering
   * @param {Object} options - Filtering options (startDate, endDate, onPageFetched)
   * @returns {Promise<Array<Object>>} Complete list of conversations
   */
  async fetchAllConversations(options = {}) {
    const allConversations = [];
    let currentPage = 1;
    let pageToken = null;
    let nextUrl = null;
    let hasMore = true;

    console.log('🔄 Fetching conversations list from Freshworks API...');

    while (hasMore) {
      const pageResult = await this.fetchConversationsPage({
        page: currentPage,
        page_token: pageToken,
        nextUrl: nextUrl,
        per_page: 50
      });

      const fetched = pageResult.conversations || [];
      if (fetched.length === 0) {
        hasMore = false;
        break;
      }

      // Date range filtering
      for (const conv of fetched) {
        const convDate = new Date(conv.created_time || conv.created_at || conv.updated_time);
        
        let inRange = true;
        if (options.startDate && convDate < options.startDate) {
          inRange = false;
        }
        if (options.endDate && convDate > options.endDate) {
          inRange = false;
        }

        if (inRange) {
          allConversations.push(conv);
        }
      }

      if (options.onPageFetched) {
        options.onPageFetched(allConversations.length, fetched.length);
      }

      // Check pagination continuation criteria
      if (pageResult.nextUrl) {
        nextUrl = pageResult.nextUrl;
      } else if (pageResult.nextToken) {
        pageToken = pageResult.nextToken;
      } else if (pageResult.nextPage) {
        currentPage = pageResult.nextPage;
      } else {
        // Fallback: increment page if page size equaled per_page
        if (fetched.length === 50) {
          currentPage += 1;
        } else {
          hasMore = false;
        }
      }

      // Brief sleep between pagination requests to avoid immediate rate limit spikes
      await sleep(100);
    }

    console.log(`✅ Total conversations retrieved: ${allConversations.length}`);
    return allConversations;
  }

  /**
   * Fetches all messages for a specific conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Array<Object>>} List of messages
   */
  async fetchMessagesForConversation(conversationId) {
    const allMessages = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const config = {
        method: 'GET',
        url: `/conversations/${conversationId}/messages`,
        params: { page, per_page: 50 }
      };

      try {
        const data = await this.requestWithRetry(config);
        
        let messages = [];
        if (Array.isArray(data)) {
          messages = data;
        } else if (data.messages && Array.isArray(data.messages)) {
          messages = data.messages;
        }

        if (messages.length === 0) {
          hasMore = false;
          break;
        }

        allMessages.push(...messages);

        if (messages.length < 50) {
          hasMore = false;
        } else {
          page += 1;
        }
      } catch (err) {
        // If messages endpoint returned 404 or specific error, handle gracefully
        if (err.response && err.response.status === 404) {
          console.warn(`⚠️ Messages not found for conversation ID: ${conversationId}`);
        } else {
          throw err;
        }
        hasMore = false;
      }

      await sleep(50);
    }

    return allMessages;
  }

  /**
   * Fetches user details (customer) with in-memory caching
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User details object
   */
  async fetchUserDetails(userId) {
    if (!userId) return null;
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId);
    }

    try {
      const data = await this.requestWithRetry({
        method: 'GET',
        url: `/users/${userId}`
      });
      this.userCache.set(userId, data);
      return data;
    } catch (err) {
      return null;
    }
  }

  /**
   * Fetches agent details with in-memory caching
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>} Agent details object
   */
  async fetchAgentDetails(agentId) {
    if (!agentId) return null;
    if (this.agentCache.has(agentId)) {
      return this.agentCache.get(agentId);
    }

    try {
      const data = await this.requestWithRetry({
        method: 'GET',
        url: `/agents/${agentId}`
      });
      this.agentCache.set(agentId, data);
      return data;
    } catch (err) {
      return null;
    }
  }

  /**
   * Downloads an attachment file from URL to disk
   * @param {string} url - Media URL
   * @param {string} targetDir - Local target directory
   * @param {string} filename - Target filename
   * @returns {Promise<string|null>} Relative path to saved file or null
   */
  async downloadAttachment(url, targetDir, filename) {
    if (!url || !url.startsWith('http')) return null;

    try {
      ensureDir(targetDir);
      const filePath = path.join(targetDir, filename);

      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 20000
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', () => resolve(null));
      });
    } catch (err) {
      return null;
    }
  }
}

module.exports = new FreshworksApiClient();
