const tls = require('tls');
const dns = require('dns');
const axios = require('axios');

class SSLValidator {
  static checkDnsAndSsl(url) {
    return new Promise((resolve) => {
      let hostname = '';
      try {
        hostname = new URL(url).hostname;
      } catch (e) {
        hostname = url;
      }

      const result = {
        dnsReachable: false,
        sslValid: false,
        sslDetails: null,
        error: null
      };

      // 1. DNS Resolution Check
      dns.lookup(hostname, (dnsErr, address) => {
        if (dnsErr || !address) {
          result.error = `DNS Lookup failed: ${dnsErr ? dnsErr.message : 'no address resolved'}`;
          return resolve(result);
        }
        
        result.dnsReachable = true;

        // 2. SSL/TLS Connection Check
        const socket = tls.connect({
          host: hostname,
          port: 443,
          servername: hostname,
          rejectUnauthorized: false // Connect even if expired/untrusted so we can inspect details
        }, () => {
          const cert = socket.getPeerCertificate(true);
          const authorized = socket.authorized;
          
          result.sslValid = authorized;
          
          if (cert && cert.valid_to) {
            const validToDate = new Date(cert.valid_to);
            const daysRemaining = Math.round((validToDate - new Date()) / (1000 * 60 * 60 * 24));
            
            result.sslDetails = {
              subject: cert.subject?.CN || 'unknown',
              issuer: cert.issuer?.O || 'unknown',
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              daysRemaining: daysRemaining
            };

            if (!authorized) {
              result.error = socket.authorizationError || 'SSL certificate is not trusted / self-signed';
            }
          } else {
            result.error = 'Failed to retrieve peer certificate details';
          }
          
          socket.destroy();
          resolve(result);
        });

        socket.on('error', (err) => {
          result.error = `TLS Connection failed: ${err.message}`;
          resolve(result);
        });

        socket.setTimeout(10000, () => {
          result.error = 'TLS connection timed out';
          socket.destroy();
          resolve(result);
        });
      });
    });
  }

  static async checkRedirects(baseUrl) {
    try {
      // Force HTTP to check if it correctly forces HTTPS
      const httpUrl = baseUrl.startsWith('http://') ? baseUrl : baseUrl.replace(/^https:\/\//, 'http://');
      const response = await axios.get(httpUrl, {
        maxRedirects: 5,
        validateStatus: () => true,
        timeout: 10000
      });

      const finalUrl = response.request?.res?.responseUrl || '';
      const redirectedToHttps = finalUrl.startsWith('https://');

      return {
        redirectedToHttps,
        finalUrl,
        status: response.status,
        success: response.status >= 200 && response.status < 400
      };
    } catch (e) {
      return {
        redirectedToHttps: false,
        finalUrl: '',
        status: 0,
        success: false,
        error: e.message
      };
    }
  }
}

module.exports = SSLValidator;
