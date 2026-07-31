const fs = require('fs');
const path = require('path');

/**
 * Utility helper for delaying execution
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ensures that a target directory exists on disk
 * @param {string} dirPath - Directory path to verify/create
 */
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Formats a Date object or timestamp into an ISO string
 * @param {Date|string|number} dateVal
 * @returns {string} ISO Date String
 */
const formatDateIso = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? String(dateVal) : d.toISOString();
};

/**
 * Formats a Date object or timestamp into a YYYY-MM-DD string for grouping
 * @param {Date|string|number} dateVal
 * @returns {string} Date string YYYY-MM-DD
 */
const formatDateDay = (dateVal) => {
  if (!dateVal) return 'Unknown';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'Unknown';
  return d.toISOString().split('T')[0];
};

/**
 * Custom lightweight concurrency pool executor
 * Processes items with a maximum parallel limit
 * @template T, R
 * @param {number} limit - Concurrency limit
 * @param {Array<T>} items - Array of items to process
 * @param {function(T): Promise<R>} iteratorFn - Async function per item
 * @returns {Promise<Array<R>>} Results array
 */
const mapConcurrent = async (limit, items, iteratorFn) => {
  const results = [];
  const executing = new Set();

  for (const item of items) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    results.push(p);
    executing.add(p);

    const clean = () => executing.delete(p);
    p.then(clean, clean);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
};

/**
 * Calculates summary metrics from processed conversation and message records
 * @param {Array<Object>} conversations - Array of conversation objects
 * @param {Array<Object>} messages - Flattened array of message records
 * @returns {Object} Summary statistics object
 */
const generateStatistics = (conversations, messages) => {
  const stats = {
    totalConversations: conversations.length,
    totalMessages: messages.length,
    messagesByChannel: {},
    messagesPerDay: {},
    topActiveAgents: {},
    topActiveCustomers: {}
  };

  for (const msg of messages) {
    // Channel aggregation
    const channel = msg.channel || 'Unknown';
    stats.messagesByChannel[channel] = (stats.messagesByChannel[channel] || 0) + 1;

    // Messages per day aggregation
    const day = formatDateDay(msg.timestamp);
    stats.messagesPerDay[day] = (stats.messagesPerDay[day] || 0) + 1;

    // Agent & Customer activity
    if (msg.senderType === 'Agent' || msg.senderType === 'agent') {
      const agentName = msg.agentName || msg.agentId || 'Unknown Agent';
      stats.topActiveAgents[agentName] = (stats.topActiveAgents[agentName] || 0) + 1;
    } else if (msg.senderType === 'Customer' || msg.senderType === 'user') {
      const customerName = msg.customerName || msg.customerId || 'Unknown Customer';
      stats.topActiveCustomers[customerName] = (stats.topActiveCustomers[customerName] || 0) + 1;
    }
  }

  // Sort top active agents & customers
  const sortMap = (mapObj, topN = 10) => {
    return Object.entries(mapObj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .reduce((acc, [k, v]) => {
        acc[k] = v;
        return acc;
      }, {});
  };

  stats.topActiveAgents = sortMap(stats.topActiveAgents, 10);
  stats.topActiveCustomers = sortMap(stats.topActiveCustomers, 10);

  return stats;
};

module.exports = {
  sleep,
  ensureDir,
  formatDateIso,
  formatDateDay,
  mapConcurrent,
  generateStatistics
};
