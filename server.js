import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { faker } from '@faker-js/faker';
import { promises as fs, readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Load config
let config;
try {
  config = JSON.parse(readFileSync('./config.json', 'utf-8'));
} catch (error) {
  config = { password: 'DreaminaKesya123!', verifyFp: 'verify_fingerprint_dreamina' };
}

// API endpoint to get current password
app.get('/api/get-password', (req, res) => {
  try {
    res.json({ password: config.password });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get password' });
  }
});

// API endpoint to update password
app.post('/api/update-password', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Update config object
    config.password = password;
    
    // Save to config.json file
    await fs.writeFile('./config.json', JSON.stringify(config, null, 2));
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Utility functions
function encryptToTargetHex(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid input for encryption');
  }
  
  let hexResult = "";
  for (const char of input) {
    const encryptedCharCode = char.charCodeAt(0) ^ 0x05;
    hexResult += encryptedCharCode.toString(16).padStart(2, "0");
  }
  return hexResult;
}

async function dreamina_login(email, password) {
  try {
    const encryptedEmail = encryptToTargetHex(email);
    const encryptedPassword = encryptToTargetHex(password);

    const url = new URL('https://dreamina.capcut.com/passport/web/email/login/');
    const queryParams = {
      aid: '513641',
      account_sdk_source: 'web',
      passport_jssdk_version: '1.0.7-beta.2',
      language: 'en',
      verifyFp: 'verify_mcn4m4du_2RcR9YtL_fjY9_4N7p_96P8_KvEHL8td0HwS',
      check_region: '1'
    };

    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': 'https://dreamina.capcut.com',
      'Referer': 'https://dreamina.capcut.com/login'
    };

    const formData = new URLSearchParams();
    formData.append('mix_mode', '1');
    formData.append('email', encryptedEmail);
    formData.append('password', encryptedPassword);
    formData.append('fixed_mix_mode', '1');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: headers,
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.description || data.message || `HTTP error ${response.status}`);
    }

    return {
      status: response.status,
      ...data
    };

  } catch (error) {
    return {
      error: true,
      message: error.message
    };
  }
}

// Multiple temp email services for redundancy
// Cache for successful domains to reduce API calls
let domainCache = {
  domains: null,
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5 minutes cache
};

// Performance monitoring
let performanceStats = {
  totalRequests: 0,
  successfulRequests: 0,
  averageResponseTime: 0,
  fastestResponse: Infinity,
  slowestResponse: 0,
  cacheHits: 0
};

// Function to update performance stats
function updatePerformanceStats(duration, success) {
  performanceStats.totalRequests++;
  if (success) performanceStats.successfulRequests++;
  
  // Update response time stats
  const total = performanceStats.averageResponseTime * (performanceStats.totalRequests - 1) + duration;
  performanceStats.averageResponseTime = total / performanceStats.totalRequests;
  
  if (duration < performanceStats.fastestResponse) performanceStats.fastestResponse = duration;
  if (duration > performanceStats.slowestResponse) performanceStats.slowestResponse = duration;
}

// Function to log performance stats
function logPerformanceStats() {
  const successRate = ((performanceStats.successfulRequests / performanceStats.totalRequests) * 100).toFixed(1);
  console.log(`\n📊 Performance Stats:`);
  console.log(`   Total Requests: ${performanceStats.totalRequests}`);
  console.log(`   Success Rate: ${successRate}%`);
  console.log(`   Avg Response: ${performanceStats.averageResponseTime.toFixed(0)}ms`);
  console.log(`   Fastest: ${performanceStats.fastestResponse === Infinity ? 'N/A' : performanceStats.fastestResponse + 'ms'}`);
  console.log(`   Slowest: ${performanceStats.slowestResponse}ms`);
  console.log(`   Cache Hits: ${performanceStats.cacheHits}\n`);
}

const tempEmailServices = {
  // Multiple email service providers for better reliability
  generatorEmail: async () => {
    try {
      const res = await fetch('https://generator.email/', {
        timeout: 5000, // Reduced from 10000ms
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const text = await res.text();
      const $ = cheerio.load(text);
      const result = [];
      $('.e7m.tt-suggestions').find('div > p').each(function (index, element) {
        result.push($(element).text());
      });
      return result.length > 0 ? result : null;
    } catch (err) {
      console.error("Generator.email error:", err.message);
      return null;
    }
  },

  // Alternative email service - 10minutemail
  tenMinuteMail: async () => {
    try {
      const domains = ['10minutemail.com', '10minutemail.net', '10minutemail.org'];
      return domains;
    } catch (err) {
      console.error("10minutemail error:", err.message);
      return null;
    }
  },

  // Alternative email service - guerrillamail (excluding .net due to verification failures)
  guerrillaMail: async () => {
    try {
      const domains = ['guerrillamail.com', 'guerrillamail.org', 'guerrillamail.biz'];
      return domains;
    } catch (err) {
      console.error("Guerrillamail error:", err.message);
      return null;
    }
  },
  
  // Enhanced fallback domains with reliability priority (most reliable first)
  fallbackDomains: () => {
    return [
      // High reliability domains (tested and proven fast)
      'guerrillamail.com',
      'guerrillamail.org',
      '10minutemail.com',
      'tempmail.org',
      'mailinator.com',
      // Medium reliability domains
      'temp-mail.org',
      'yopmail.com',
      'maildrop.cc',
      // Lower priority domains (slower or less reliable)
      'throwaway.email',
      'disposablemail.com',
      'sharklasers.com',
      'grr.la'
      // Note: guerrillamail.net and tempmail.net removed due to consistent verification failures
    ];
  },

  // Try multiple services in parallel for faster response
  getAllDomains: async () => {
    try {
      const promises = [
        tempEmailServices.generatorEmail(),
        tempEmailServices.tenMinuteMail(),
        tempEmailServices.guerrillaMail()
      ];
      
      const results = await Promise.allSettled(promises);
      let allDomains = [];
      
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          allDomains = allDomains.concat(result.value);
        }
      });
      
      // Remove duplicates and return
      return [...new Set(allDomains)];
    } catch (err) {
      console.error("Error getting all domains:", err.message);
      return tempEmailServices.fallbackDomains();
    }
  }
};

const getEmailRandom = async () => {
  try {
    // Check cache first
    const now = Date.now();
    if (domainCache.domains && domainCache.timestamp && (now - domainCache.timestamp) < domainCache.ttl) {
      performanceStats.cacheHits++;
      console.log('🚀 Using cached domains (cache hit)');
      return domainCache.domains;
    }
    
    // Try multiple services in parallel for faster response with timeout
    const timeout = 3000; // 3 second timeout for domain fetching
    const domainPromise = Promise.race([
      tempEmailServices.getAllDomains(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Domain fetch timeout')), timeout)
      )
    ]);
    
    let domains;
    try {
      domains = await domainPromise;
    } catch (timeoutError) {
      console.log('Domain fetch timed out, using fallback domains');
      domains = null;
    }
    
    if (!domains || domains.length === 0) {
      console.log('Using prioritized fallback domains');
      domains = tempEmailServices.fallbackDomains();
    } else {
      // Merge with fallback domains and prioritize reliable ones
      const fallbackDomains = tempEmailServices.fallbackDomains();
      const mergedDomains = [...new Set([...fallbackDomains.slice(0, 6), ...domains])];
      domains = mergedDomains;
      
      // Cache successful result
      domainCache.domains = domains;
      domainCache.timestamp = now;
      console.log(`Cached ${domains.length} domains for future use`);
    }
    
    return domains;
  } catch (err) {
    console.error("Error getting email domains:", err.message);
    // Return fallback domains as last resort
    return tempEmailServices.fallbackDomains();
  }
};

// Weighted domain selection - prioritizes more reliable domains
const selectReliableDomain = (domains) => {
  if (!domains || domains.length === 0) {
    return tempEmailServices.fallbackDomains()[0];
  }
  
  // Create weighted selection - first 6 domains have higher probability
  const weights = domains.map((_, index) => {
    if (index < 3) return 40; // Top 3 domains: 40% weight each
    if (index < 6) return 20; // Next 3 domains: 20% weight each  
    return 5; // Remaining domains: 5% weight each
  });
  
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const random = Math.random() * totalWeight;
  
  let currentWeight = 0;
  for (let i = 0; i < domains.length; i++) {
    currentWeight += weights[i];
    if (random <= currentWeight) {
      return domains[i];
    }
  }
  
  // Fallback to first domain
  return domains[0];
};

const functionGetLink = async (email, domain, maxRetries = 3, retryDelay = 1000, abortCheck = null) => { // Added abort check parameter
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check for abort before each attempt
      if (abortCheck && abortCheck()) {
        console.log(`[${new Date().toISOString()}] 🛑 Verification check aborted by client`);
        return null;
      }
      
      const startTime = Date.now();
      console.log(`[${new Date().toISOString()}] Checking verification email (${attempt}/${maxRetries}) for ${email}...`);
      
      const response = await fetch('https://generator.email/', {
        timeout: 5000, // Further reduced for faster detection of slow domains
        headers: {
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          'cookie': `_gid=GA1.2.989703044.1735637209; embx=%5B%22xaviermoen51%40dogonoithatlienha.com%22%2C%22sadahayuv%40jagomail.com%22%2C%22sadahayua%40jagomail.com%22%2C%22sadahayu%40jagomail.com%22%2C%22ajacoba%40auhit.com%22%5D; _ga=GA1.1.1696815852.1733235907; __gads=ID=08e2714256afd00c:T=1733235907:RT=1735638862:S=ALNI_MaFvYNYLhdTjGzS2xa3eZ3jls6QMQ; __gpi=UID=00000f7f6013ca38:T=1733235907:RT=1735638862:S=ALNI_MayYarsiugqTzh0Ky4wHiYNrSnGtQ; __eoi=ID=101f6e905a8358a1:T=1733235907:RT=1735638862:S=AA-AfjZCYAfxlwf-nyRYeP_9J9rE; FCNEC=%5B%5B%22AKsRol8j6KSk9Pga59DuS0D4a2pk72ZTqwfVO82pNZ4h-bO_EWCi04aWAU6ULkfWs6oHpsd6Cs949FJ6fmNfbqNhHt8GslL8Aa0Dzr20gerHRB_kL3qK8nW6DeD0WzT9KfeamIWXb1LyD2b7IDCPM94I8fUvBRcTqA%3D%3D%22%5D%5D; _ga_1GPPTBHNKN=GS1.1.1735637208.2.1.1735638882.38.0.0; surl=${domain}%2F${email}`,
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        redirect: 'follow'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      const $ = cheerio.load(text);
      
      // Optimized selectors for faster parsing
      const selectors = [
        ".e7m.mess_bodiyy span", // Most common selector first
        "#email-table span",
        ".verification-code",
        "span:contains('verification')",
        "span:contains('code')",
        "td span", // Additional fallback
        "div span" // Broad fallback
      ];
      
      let verificationCode = null;
      
      for (const selector of selectors) {
        const element = $(selector);
        if (element.length > 0) {
          const text = element.text().trim();
          // Look for 6-digit verification codes
          const codeMatch = text.match(/\b\d{6}\b/);
          if (codeMatch) {
            verificationCode = codeMatch[0];
            break;
          }
        }
      }
      
      // Also check for verification links that might contain codes
      if (!verificationCode) {
        const links = $('a[href*="dreamina.capcut.com"], a[href*="verify"]');
        for (let i = 0; i < links.length; i++) {
          const href = $(links[i]).attr('href');
          if (href) {
            try {
              const url = new URL(href);
              const code = url.searchParams.get('code');
              if (code && /^\d{6}$/.test(code)) {
                verificationCode = code;
                break;
              }
            } catch (urlError) {
              // Invalid URL, continue
            }
          }
        }
      }
      
      if (verificationCode) {
        const duration = Date.now() - startTime;
        updatePerformanceStats(duration, true);
        console.log(`[${new Date().toISOString()}] ✓ Verification code found: ${verificationCode} (took ${duration}ms)`);
        return verificationCode;
      }
      
      // If no verification code found and not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] ⏳ No code found (took ${duration}ms), waiting ${retryDelay/1000}s...`);
        
        // Check for abort during delay
        for (let i = 0; i < retryDelay; i += 100) {
          if (abortCheck && abortCheck()) {
            console.log(`[${new Date().toISOString()}] 🛑 Verification check aborted during delay`);
            return null;
          }
          await new Promise(resolve => setTimeout(resolve, Math.min(100, retryDelay - i)));
        }
      }
      
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] ❌ Error on attempt ${attempt} (took ${duration}ms):`, err.message);
      
      // Smart retry logic based on error type
      if (attempt < maxRetries) {
        if (err.message.includes('timeout') || err.message.includes('fetch') || err.message.includes('ECONNRESET')) {
          // Network errors - shorter delay
          const networkDelay = Math.min(retryDelay * 0.5, 1000);
          console.log(`[${new Date().toISOString()}] 🔄 Network error, retrying in ${networkDelay/1000}s...`);
          
          // Check for abort during network delay
          for (let i = 0; i < networkDelay; i += 100) {
            if (abortCheck && abortCheck()) {
              console.log(`[${new Date().toISOString()}] 🛑 Verification check aborted during network delay`);
              return null;
            }
            await new Promise(resolve => setTimeout(resolve, Math.min(100, networkDelay - i)));
          }
        } else {
          // Other errors - normal delay
          console.log(`[${new Date().toISOString()}] 🔄 Retrying in ${retryDelay/1000}s...`);
          
          // Check for abort during retry delay
          for (let i = 0; i < retryDelay; i += 100) {
            if (abortCheck && abortCheck()) {
              console.log(`[${new Date().toISOString()}] 🛑 Verification check aborted during retry delay`);
              return null;
            }
            await new Promise(resolve => setTimeout(resolve, Math.min(100, retryDelay - i)));
          }
        }
      } else {
         const totalDuration = Date.now() - startTime;
         updatePerformanceStats(totalDuration, false);
         console.error(`[${new Date().toISOString()}] 💥 Failed to get verification code after ${maxRetries} attempts`);
         logPerformanceStats(); // Log stats when request fails
         return null;
       }
    }
  }
  
  return null;
};

async function dreamina_sendRequest(encryptedEmail, encryptedPassword) {
  try {
    const url = new URL('https://dreamina.capcut.com/passport/web/email/send_code/');
    const queryParams = {
      aid: '348188',
      account_sdk_source: 'web',
      language: 'en',
      verifyFp: 'verify_m7euzwhw_PNtb4tlY_I0az_4me0_9Hrt_sEBZgW5GGPdn',
      check_region: '1'
    };
    
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const formData = new URLSearchParams();
    formData.append('mix_mode', '1');
    formData.append('email', encryptedEmail);
    formData.append('password', encryptedPassword);
    formData.append('type', '34');
    formData.append('fixed_mix_mode', '1');
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });
    
    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error:', error);
    return { error: true, message: error.message };
  }
}

async function dreamina_verifyRequest(encryptedEmail, encryptedPassword, encryptedCode) {
  try {
    console.log(`[${new Date().toISOString()}] 🔐 Starting verification process...`);
    
    const originalDate = faker.date.birthdate()
    const dateObj = new Date(originalDate);
    const formattedDate = dateObj.toISOString().split('T')[0];
    
    const url = new URL('https://dreamina.capcut.com/passport/web/email/register_verify_login/');
    const queryParams = {
      aid: '348188',
      account_sdk_source: 'web',
      language: 'en',
      verifyFp: 'verify_m7euzwhw_PNtb4tlY_I0az_4me0_9Hrt_sEBZgW5GGPdn',
      check_region: '1'
    };

    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    
    const formData = new URLSearchParams();
    formData.append('mix_mode', '1');
    formData.append('email', encryptedEmail); 
    formData.append('code', encryptedCode);
    formData.append('password', encryptedPassword);
    formData.append('type', '34');
    formData.append('birthday', formattedDate);
    formData.append('force_user_region', 'ID');
    formData.append('biz_param', '%7B%7D');
    formData.append('check_region', '1');
    formData.append('fixed_mix_mode', '1');
    
    console.log(`[${new Date().toISOString()}] 📤 Sending verification request...`);
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: formData
    });
    
    console.log(`[${new Date().toISOString()}] 📥 Verification response status: ${response.status}`);
    
    const data = await response.json();
    console.log(`[${new Date().toISOString()}] 📋 Verification response:`, JSON.stringify(data, null, 2));
    
    return data;

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Verification error:`, error);
    return { error: true, message: error.message };
  }
}

// Account History Management
const HISTORY_FILE = path.join(__dirname, 'account_history.json');

// Load existing history
let accountHistory = [];
try {
  if (existsSync(HISTORY_FILE)) {
    const historyData = readFileSync(HISTORY_FILE, 'utf-8');
    accountHistory = JSON.parse(historyData);
  }
} catch (error) {
  console.log('No existing history file found, starting fresh');
  accountHistory = [];
}

// Save history to file
function saveHistoryToFile() {
  try {
    writeFileSync(HISTORY_FILE, JSON.stringify(accountHistory, null, 2));
  } catch (error) {
    console.error('Error saving history:', error);
  }
}

// Add session to history
function addToHistory(sessionData) {
  const session = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...sessionData
  };
  
  accountHistory.unshift(session);
  
  // Keep only last 500 sessions to prevent file from getting too large
  if (accountHistory.length > 500) {
    accountHistory = accountHistory.slice(0, 500);
  }
  
  saveHistoryToFile();
  return session;
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Password configuration endpoints
app.get('/api/get-password', (req, res) => {
  try {
    res.json({ password: config.password });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get password' });
  }
});

app.post('/api/update-password', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Update config object
    config.password = password;
    
    // Write to config.json file
    await fs.writeFile('config.json', JSON.stringify(config, null, 2));
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// API Routes
app.post('/api/check-accounts', upload.single('accountsFile'), async (req, res) => {
  try {
    let accountsData;
    
    if (req.file) {
      // Read from uploaded file
      accountsData = await fs.readFile(req.file.path, 'utf-8');
      // Clean up uploaded file
      await fs.unlink(req.file.path);
    } else if (req.body.accountsText) {
      // Read from text input
      accountsData = req.body.accountsText;
    } else {
      return res.status(400).json({ error: 'No accounts data provided' });
    }

    const accounts = accountsData.trim().split('\n').filter(line => line.includes('|'));
    
    if (accounts.length === 0) {
      return res.status(400).json({ error: 'No valid accounts found' });
    }

    const results = {
      total: accounts.length,
      valid: [],
      invalid: [],
      progress: []
    };

    // Send initial response
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    });

    for (let i = 0; i < accounts.length; i++) {
      // Check if request was aborted
      if (req.aborted) {
        console.log(`[${new Date().toISOString()}] 🛑 Request aborted by client`);
        return;
      }
      
      const [email, password] = accounts[i].split('|').map(item => item.trim());
      
      const progressUpdate = {
        current: i + 1,
        total: accounts.length,
        email: email,
        status: 'checking'
      };
      
      res.write(JSON.stringify(progressUpdate) + '\n');

      const result = await dreamina_login(email, password);
      
      if (result.message === "success") {
        results.valid.push(`${email}|${password}`);
        progressUpdate.status = 'valid';
      } else {
        results.invalid.push(`${email}|${password}|${result.message}`);
        progressUpdate.status = 'invalid';
        progressUpdate.error = result.message;
      }

      res.write(JSON.stringify(progressUpdate) + '\n');
      
      // Reduced delay between requests for faster processing
      await new Promise(resolve => setTimeout(resolve, 1500)); // Reduced from 2000ms
    }

    // Send final results and save to history
    const finalResult = {
      completed: true,
      validCount: results.valid.length,
      invalidCount: results.invalid.length,
      validAccounts: results.valid,
      invalidAccounts: results.invalid,
      timestamp: new Date().toISOString()
    };

    // Save to persistent history
    addToHistory({
      type: 'check',
      validAccounts: results.valid,
      invalidAccounts: results.invalid,
      totalChecked: results.valid.length + results.invalid.length,
      successRate: results.valid.length > 0 ? ((results.valid.length / (results.valid.length + results.invalid.length)) * 100).toFixed(1) : '0'
    });

    res.write(JSON.stringify(finalResult) + '\n');
    res.end();

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/register-accounts', async (req, res) => {
  try {
    const { count } = req.body;
    const accountCount = parseInt(count) || 1;

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    });

    const createdAccounts = [];
    const failedAccounts = [];
    let totalAttempted = 0;
    let isAborted = false;
    let clientDisconnected = false;

    // Handle client disconnect/abort with delay to avoid false positives
    const handleDisconnect = () => {
      // Add a small delay to avoid immediate disconnection detection
      setTimeout(() => {
        if (!res.headersSent || res.destroyed) {
          clientDisconnected = true;
          isAborted = true;
          console.log(`[${new Date().toISOString()}] 🛑 Client disconnected, stopping registration process`);
        }
      }, 100);
    };

    req.on('close', handleDisconnect);
    req.on('aborted', handleDisconnect);
    
    // Also check for response being destroyed
    res.on('close', () => {
      clientDisconnected = true;
      isAborted = true;
      console.log(`[${new Date().toISOString()}] 🛑 Response closed, stopping registration process`);
    });

    for (let i = 1; i <= accountCount; i++) {
      totalAttempted = i;
      // Check if request was aborted or client disconnected (with more robust checking)
      if (clientDisconnected || (isAborted && res.destroyed)) {
        console.log(`[${new Date().toISOString()}] 🛑 Stopping registration due to client abort/disconnect`);
        break;
      }
      
      const progressUpdate = {
        current: i,
        total: accountCount,
        status: 'creating'
      };
      
      res.write(JSON.stringify(progressUpdate) + '\n');

      try {
        // Generate random email using reliable domain selection
        const domainList = await getEmailRandom();
        if (!domainList || domainList.length === 0) {
          throw new Error('No email domains available');
        }
        
        const domain = selectReliableDomain(domainList);
        console.log(`[${new Date().toISOString()}] 📧 Selected domain: ${domain} (prioritized selection)`);
        
        // Generate username with fallback
        let name;
        try {
          name = faker.internet.userName().toLowerCase().replace(/[^a-z0-9]/g, '');
        } catch (fakerError) {
          // Fallback username generation if faker fails
          const adjectives = ['cool', 'smart', 'fast', 'bright', 'happy', 'lucky', 'super', 'mega', 'ultra', 'pro'];
          const nouns = ['user', 'player', 'gamer', 'coder', 'ninja', 'master', 'hero', 'star', 'ace', 'champ'];
          const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
          const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
          const randomNumber = Math.floor(Math.random() * 9999);
          name = `${randomAdjective}${randomNoun}${randomNumber}`;
        }
        
        const email = `${name}@${domain}`;
        
        progressUpdate.email = email;
        progressUpdate.status = 'email_created';
        res.write(JSON.stringify(progressUpdate) + '\n');
        
        const password = config.password;
        const encryptedHexEmail = encryptToTargetHex(email);
        const encryptedHexPassword = encryptToTargetHex(password);
        
        const reqnya = await dreamina_sendRequest(encryptedHexEmail, encryptedHexPassword);
        
        if (reqnya.message === "success") {
          progressUpdate.status = 'waiting_verification';
          res.write(JSON.stringify(progressUpdate) + '\n');
          
          let verificationCode;
          let attempts = 0;
          const maxAttempts = 10; // Further reduced for faster processing
          
          do {
            // Check for abort before each verification attempt
            if (clientDisconnected || (isAborted && res.destroyed)) {
              console.log(`[${new Date().toISOString()}] 🛑 Stopping verification check due to client abort`);
              break;
            }
            
            verificationCode = await functionGetLink(
              email.split('@')[0], 
              email.split('@')[1], 
              10, // maxAttempts
              1500, // retryDelay
              () => clientDisconnected || (isAborted && res.destroyed) // abort check function
            );
            if (!verificationCode) {
              // Check for abort before delay
              if (clientDisconnected || (isAborted && res.destroyed)) {
                console.log(`[${new Date().toISOString()}] 🛑 Registration aborted during verification retry`);
                break;
              }
              
              // Interruptible delay
              for (let i = 0; i < 1500; i += 100) {
                if (clientDisconnected || (isAborted && res.destroyed)) {
                  console.log(`[${new Date().toISOString()}] 🛑 Registration aborted during verification delay`);
                  break;
                }
                await new Promise(resolve => setTimeout(resolve, Math.min(100, 1500 - i)));
              }
              
              if (clientDisconnected || (isAborted && res.destroyed)) break;
              attempts++;
              console.log(`[${new Date().toISOString()}] ⏳ Verification attempt ${attempts}/${maxAttempts} for ${email}`);
            }
          } while (!verificationCode && attempts < maxAttempts && !clientDisconnected && !(isAborted && res.destroyed));
          
          if (verificationCode) {
            progressUpdate.status = 'code_received';
            progressUpdate.code = verificationCode;
            res.write(JSON.stringify(progressUpdate) + '\n');
            
            const encryptedHexCode = encryptToTargetHex(verificationCode);
            
            const verifyData = await dreamina_verifyRequest(encryptedHexEmail, encryptedHexPassword, encryptedHexCode);
            
            if (verifyData.message === "success") {
              const accountData = `${email}|${password}`;
              createdAccounts.push(accountData);
              
              // Save to history immediately after each successful account creation
              // This prevents data loss if process is interrupted
              const immediateSession = {
                type: 'register',
                accounts: [accountData],
                totalRequested: 1,
                totalCreated: 1,
                partialResult: true // Flag to indicate this is a partial save
              };
              addToHistory(immediateSession);
              
              progressUpdate.status = 'success';
              progressUpdate.accountData = accountData; // Send account data to frontend immediately
              res.write(JSON.stringify(progressUpdate) + '\n');
            } else {
              failedAccounts.push({email, error: verifyData.message, reason: 'verification_failed'});
              progressUpdate.status = 'failed';
              progressUpdate.error = verifyData.message;
              res.write(JSON.stringify(progressUpdate) + '\n');
            }
          } else {
            failedAccounts.push({email, error: 'Verification code not received', reason: 'code_timeout'});
            progressUpdate.status = 'failed';
            progressUpdate.error = 'Verification code not received';
            res.write(JSON.stringify(progressUpdate) + '\n');
          }
        } else {
          failedAccounts.push({email, error: reqnya.message, reason: 'request_failed'});
          progressUpdate.status = 'failed';
          progressUpdate.error = reqnya.message;
          res.write(JSON.stringify(progressUpdate) + '\n');
        }
      } catch (error) {
        failedAccounts.push({email: progressUpdate.email || 'unknown', error: error.message, reason: 'general_error'});
        progressUpdate.status = 'failed';
        progressUpdate.error = error.message;
        res.write(JSON.stringify(progressUpdate) + '\n');
      }
    }

    // Send final results and save to history
    const finalResult = {
      completed: true,
      totalAttempted: totalAttempted,
      totalCreated: createdAccounts.length,
      totalFailed: failedAccounts.length,
      successRate: totalAttempted > 0 ? ((createdAccounts.length / totalAttempted) * 100).toFixed(1) : '0',
      accounts: createdAccounts,
      failedAccounts: failedAccounts
    };

    // Save to persistent history
    if (createdAccounts.length > 0 || failedAccounts.length > 0) {
      addToHistory({
        type: 'register',
        accounts: createdAccounts,
        failedAccounts: failedAccounts,
        totalRequested: accountCount,
        totalCreated: createdAccounts.length,
        totalFailed: failedAccounts.length,
        successRate: finalResult.successRate
      });
    }

    res.write(JSON.stringify(finalResult) + '\n');
    res.end();

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint for performance monitoring
app.get('/api/performance-stats', (req, res) => {
  const stats = {
    ...performanceStats,
    successRate: performanceStats.totalRequests > 0 ? 
      ((performanceStats.successfulRequests / performanceStats.totalRequests) * 100).toFixed(1) : '0',
    cacheHitRate: performanceStats.totalRequests > 0 ? 
      ((performanceStats.cacheHits / performanceStats.totalRequests) * 100).toFixed(1) : '0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
  res.json(stats);
});

// API endpoint to reset performance stats
app.post('/api/reset-performance-stats', (req, res) => {
  performanceStats = {
    totalRequests: 0,
    successfulRequests: 0,
    averageResponseTime: 0,
    fastestResponse: Infinity,
    slowestResponse: 0,
    cacheHits: 0
  };
  res.json({ message: 'Performance stats reset successfully' });
});

// Save session endpoint (for frontend to manually save sessions)
app.post('/api/save-session', (req, res) => {
  try {
    const sessionData = req.body;
    console.log('Received session save request:', sessionData);
    
    // Add to history using existing function
    const savedSession = addToHistory(sessionData);
    
    res.json({ 
      success: true, 
      message: 'Session saved successfully',
      session: savedSession
    });
  } catch (error) {
    console.error('Error saving session:', error);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

// Account History API endpoints
app.get('/api/account-history', (req, res) => {
  try {
    res.json({
      success: true,
      history: accountHistory,
      total: accountHistory.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get account history' });
  }
});

app.delete('/api/account-history', (req, res) => {
  try {
    accountHistory = [];
    saveHistoryToFile();
    res.json({ success: true, message: 'Account history cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear account history' });
  }
});

app.delete('/api/account-history/:sessionId', (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const initialLength = accountHistory.length;
    accountHistory = accountHistory.filter(session => session.id !== sessionId);
    
    if (accountHistory.length < initialLength) {
      saveHistoryToFile();
      res.json({ success: true, message: 'Session deleted successfully' });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

app.get('/api/account-history/export', (req, res) => {
  try {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalSessions: accountHistory.length,
      sessions: accountHistory
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="dreamina_history_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export account history' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Performance monitoring enabled`);
  console.log(`🔧 Optimizations applied:`);
  console.log(`   - Reduced timeouts and retries`);
  console.log(`   - Multiple email service providers`);
  console.log(`   - Domain caching (5min TTL)`);
  console.log(`   - Smart retry logic`);
  console.log(`   - Performance monitoring`);
});