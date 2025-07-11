import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { faker } from '@faker-js/faker';
import { promises as fs, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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
const tempEmailServices = {
  generatorEmail: async () => {
    try {
      const res = await fetch('https://generator.email/', {
        timeout: 10000,
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
  
  // Fallback domains if generator.email fails
  fallbackDomains: () => {
    return [
      'tempmail.org',
      '10minutemail.com',
      'guerrillamail.com',
      'mailinator.com',
      'temp-mail.org',
      'throwaway.email',
      'maildrop.cc',
      'yopmail.com'
    ];
  }
};

const getEmailRandom = async () => {
  try {
    // Try generator.email first
    let domains = await tempEmailServices.generatorEmail();
    
    if (!domains || domains.length === 0) {
      console.log('Generator.email failed, using fallback domains');
      domains = tempEmailServices.fallbackDomains();
    }
    
    return domains;
  } catch (err) {
    console.error("Error getting email domains:", err.message);
    // Return fallback domains as last resort
    return tempEmailServices.fallbackDomains();
  }
};

const functionGetLink = async (email, domain, maxRetries = 10, retryDelay = 3000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Checking for verification email (attempt ${attempt}/${maxRetries})...`);
      
      const response = await fetch('https://generator.email/', {
        timeout: 15000,
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
      
      // Try multiple selectors to find verification code
      const selectors = [
        "#email-table > div.e7m.row.list-group-item > div.e7m.col-md-12.ma1 > div.e7m.mess_bodiyy > div > div > div:nth-child(2) > p:nth-child(2) > span",
        ".e7m.mess_bodiyy span",
        ".verification-code",
        "span:contains('verification')"
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
        console.log(`Verification code found: ${verificationCode}`);
        return verificationCode;
      }
      
      // If no verification code found and not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        console.log(`No verification code found, waiting ${retryDelay/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      
    } catch (err) {
      console.error(`Error on attempt ${attempt}:`, err.message);
      
      // If it's a network error and not the last attempt, wait before retrying
      if (attempt < maxRetries && (err.message.includes('fetch') || err.message.includes('timeout'))) {
        console.log(`Network error, waiting ${retryDelay/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else if (attempt === maxRetries) {
        console.error(`Failed to get verification code after ${maxRetries} attempts`);
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
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Send final results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.writeFile(`valid_accounts_${timestamp}.txt`, results.valid.join('\n'));
    await fs.writeFile(`invalid_accounts_${timestamp}.txt`, results.invalid.join('\n'));

    const finalResult = {
      completed: true,
      validCount: results.valid.length,
      invalidCount: results.invalid.length,
      validAccounts: results.valid,
      invalidAccounts: results.invalid,
      timestamp: timestamp
    };

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

    for (let i = 1; i <= accountCount; i++) {
      const progressUpdate = {
        current: i,
        total: accountCount,
        status: 'creating'
      };
      
      res.write(JSON.stringify(progressUpdate) + '\n');

      try {
        // Generate random email
        const domainList = await getEmailRandom();
        if (!domainList || domainList.length === 0) {
          throw new Error('No email domains available');
        }
        
        const domain = domainList[Math.floor(Math.random() * domainList.length)];
        
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
          const maxAttempts = 30;
          
          do {
            verificationCode = await functionGetLink(email.split('@')[0], email.split('@')[1]);
            if (!verificationCode) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              attempts++;
            }
          } while (!verificationCode && attempts < maxAttempts);
          
          if (verificationCode) {
            progressUpdate.status = 'code_received';
            progressUpdate.code = verificationCode;
            res.write(JSON.stringify(progressUpdate) + '\n');
            
            const encryptedHexCode = encryptToTargetHex(verificationCode);
            
            const verifyData = await dreamina_verifyRequest(encryptedHexEmail, encryptedHexPassword, encryptedHexCode);
            
            if (verifyData.message === "success") {
              const accountData = `${email}|${password}`;
              createdAccounts.push(accountData);
              
              // Append to accounts.txt
              await fs.appendFile('accounts.txt', accountData + '\n');
              
              progressUpdate.status = 'success';
              res.write(JSON.stringify(progressUpdate) + '\n');
            } else {
              progressUpdate.status = 'verification_failed';
              progressUpdate.error = verifyData.message;
              res.write(JSON.stringify(progressUpdate) + '\n');
            }
          } else {
            progressUpdate.status = 'code_timeout';
            progressUpdate.error = 'Verification code not received';
            res.write(JSON.stringify(progressUpdate) + '\n');
          }
        } else {
          progressUpdate.status = 'request_failed';
          progressUpdate.error = reqnya.message;
          res.write(JSON.stringify(progressUpdate) + '\n');
        }
      } catch (error) {
        progressUpdate.status = 'error';
        progressUpdate.error = error.message;
        res.write(JSON.stringify(progressUpdate) + '\n');
      }
    }

    // Send final results
    const finalResult = {
      completed: true,
      totalCreated: createdAccounts.length,
      accounts: createdAccounts
    };

    res.write(JSON.stringify(finalResult) + '\n');
    res.end();

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});