const axios = require('axios');

class APIClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async checkEndpoint(path, method = 'GET', data = null) {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const startTime = Date.now();
    const result = {
      url,
      method,
      status: 0,
      responseTime: 0,
      success: false,
      error: ''
    };

    try {
      const config = {
        method,
        url,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/html, */*'
        },
        validateStatus: () => true
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      result.status = response.status;
      result.responseTime = Date.now() - startTime;
      result.success = response.status >= 200 && response.status < 400;
      
      if (!result.success) {
        result.error = `HTTP Error Status: ${response.status}`;
      }
    } catch (e) {
      result.status = e.response ? e.response.status : 500;
      result.responseTime = Date.now() - startTime;
      result.success = false;
      result.error = e.message;
    }

    return result;
  }

  async validateAPIs() {
    const endpoints = [
      { path: '/', method: 'GET', desc: 'Home Page' },
      { path: '/robots.txt', method: 'GET', desc: 'Robots TXT' },
      { path: '/sitemap.xml', method: 'GET', desc: 'Sitemap XML' },
      { path: '/sofa-sets', method: 'GET', desc: 'Category Page' },
      { path: '/product/auric-bar-cabinet-honey-finish', method: 'GET', desc: 'Product Details' }
    ];

    const results = [];
    for (const ep of endpoints) {
      const res = await this.checkEndpoint(ep.path, ep.method);
      results.push({
        ...res,
        description: ep.desc
      });
    }
    return results;
  }
}

module.exports = APIClient;
