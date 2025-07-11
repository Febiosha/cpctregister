// Global variables
let isChecking = false;
let isRegistering = false;

// DOM elements
const fileUploadArea = document.getElementById('fileUploadArea');
const accountsFile = document.getElementById('accountsFile');
const accountsText = document.getElementById('accountsText');
const vpnCheck = document.getElementById('vpnCheck');
const startCheckBtn = document.getElementById('startCheckBtn');
const checkProgress = document.getElementById('checkProgress');
const checkLogs = document.getElementById('checkLogs');

const accountCount = document.getElementById('accountCount');
const defaultPassword = document.getElementById('defaultPassword');
const savePasswordBtn = document.getElementById('savePasswordBtn');
const passwordStatus = document.getElementById('passwordStatus');

// Created accounts results elements
const createdAccountsSection = document.getElementById('createdAccountsSection');
const totalCreatedDisplay = document.getElementById('totalCreatedDisplay');
const createdEmailsList = document.getElementById('createdEmailsList');
const createdAccountsList = document.getElementById('createdAccountsList');
const copyAllAccountsBtn = document.getElementById('copyAllAccountsBtn');
const copyEmailsBtn = document.getElementById('copyEmailsBtn');
const copyCompleteBtn = document.getElementById('copyCompleteBtn');

// Store created accounts data
let createdAccountsData = [];
const startRegisterBtn = document.getElementById('startRegisterBtn');
const registerProgress = document.getElementById('registerProgress');
const registerLogs = document.getElementById('registerLogs');

// Password configuration handling
savePasswordBtn.addEventListener('click', async () => {
    const password = defaultPassword.value.trim();
    if (!password) {
        showPasswordStatus('Please enter a password', 'error');
        return;
    }
    
    try {
        savePasswordBtn.disabled = true;
        savePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Saving...';
        
        const response = await fetch('/api/update-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showPasswordStatus('Password saved successfully!', 'success');
        } else {
            showPasswordStatus(result.error || 'Failed to save password', 'error');
        }
    } catch (error) {
        showPasswordStatus('Error saving password: ' + error.message, 'error');
    } finally {
        savePasswordBtn.disabled = false;
        savePasswordBtn.innerHTML = '<i class="fas fa-save me-1"></i>Save';
    }
});

// Copy functionality for created accounts
copyEmailsBtn.addEventListener('click', () => {
    const emails = createdAccountsData.map(account => account.split('|')[0]);
    copyToClipboard(emails.join('\n'), 'Email addresses copied to clipboard!');
});

copyCompleteBtn.addEventListener('click', () => {
    copyToClipboard(createdAccountsData.join('\n'), 'Complete accounts copied to clipboard!');
});

copyAllAccountsBtn.addEventListener('click', () => {
    const emails = createdAccountsData.map(account => account.split('|')[0]);
    const complete = createdAccountsData.join('\n');
    const allData = `EMAILS ONLY:\n${emails.join('\n')}\n\nCOMPLETE ACCOUNTS (EMAIL|PASSWORD):\n${complete}`;
    copyToClipboard(allData, 'All account data copied to clipboard!');
});

// Load current password on page load
async function loadCurrentPassword() {
    try {
        const response = await fetch('/api/get-password');
        const result = await response.json();
        
        if (response.ok) {
            defaultPassword.value = result.password;
        }
    } catch (error) {
        console.error('Error loading password:', error);
    }
}

function showPasswordStatus(message, type) {
    passwordStatus.innerHTML = `
        <div class="alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show py-2" role="alert">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-1"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        const alert = passwordStatus.querySelector('.alert');
        if (alert) {
            alert.remove();
        }
    }, 3000);
}

// Initialize password on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCurrentPassword();
});

// File upload handling
fileUploadArea.addEventListener('click', () => {
    accountsFile.click();
});

fileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadArea.classList.add('dragover');
});

fileUploadArea.addEventListener('dragleave', () => {
    fileUploadArea.classList.remove('dragover');
});

fileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        accountsFile.files = files;
        handleFileSelect(files[0]);
    }
});

accountsFile.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

function handleFileSelect(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        accountsText.value = e.target.result;
        fileUploadArea.innerHTML = `
            <i class="fas fa-file-check fa-2x text-success mb-2"></i>
            <h6>File loaded: ${file.name}</h6>
            <p class="text-muted">${file.size} bytes</p>
        `;
    };
    reader.readAsText(file);
}

// Account checking functionality
startCheckBtn.addEventListener('click', async () => {
    if (isChecking) return;
    
    if (!vpnCheck.checked) {
        alert('Please confirm you are connected to UK VPN before proceeding.');
        return;
    }
    
    const accountsData = accountsText.value.trim();
    if (!accountsData) {
        alert('Please provide accounts data either by uploading a file or entering manually.');
        return;
    }
    
    const accounts = accountsData.split('\n').filter(line => line.includes('|'));
    if (accounts.length === 0) {
        alert('No valid accounts found. Please use format: email|password');
        return;
    }
    
    startChecking(accountsData);
});

async function startChecking(accountsData) {
    isChecking = true;
    startCheckBtn.disabled = true;
    startCheckBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Checking...';
    
    checkProgress.classList.remove('d-none');
    clearLogs('check');
    
    try {
        const formData = new FormData();
        formData.append('accountsText', accountsData);
        
        const response = await fetch('/api/check-accounts', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let validCount = 0;
        let invalidCount = 0;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    
                    if (data.completed) {
                        // Final results
                        addLog('check', `✅ Checking completed! Valid: ${data.validCount}, Invalid: ${data.invalidCount}`, 'success');
                        addLog('check', `📁 Results saved with timestamp: ${data.timestamp}`, 'info');
                        
                        if (data.validAccounts.length > 0) {
                            addLog('check', '📋 Valid accounts:', 'success');
                            data.validAccounts.forEach(account => {
                                addLog('check', `  ✓ ${account}`, 'success');
                            });
                        }
                        
                        break;
                    } else {
                        // Progress update
                        updateCheckProgress(data);
                        
                        if (data.status === 'valid') {
                            validCount++;
                            addLog('check', `✅ ${data.email} - Valid`, 'success');
                        } else if (data.status === 'invalid') {
                            invalidCount++;
                            addLog('check', `❌ ${data.email} - Invalid: ${data.error || 'Unknown error'}`, 'error');
                        } else if (data.status === 'checking') {
                            addLog('check', `🔍 Checking ${data.email}...`, 'info');
                        }
                        
                        document.getElementById('validCount').textContent = validCount;
                        document.getElementById('invalidCount').textContent = invalidCount;
                    }
                } catch (e) {
                    console.error('Error parsing JSON:', e, line);
                }
            }
        }
        
    } catch (error) {
        addLog('check', `❌ Error: ${error.message}`, 'error');
    } finally {
        isChecking = false;
        startCheckBtn.disabled = false;
        startCheckBtn.innerHTML = '<i class="fas fa-play me-2"></i>Start Checking';
    }
}

function updateCheckProgress(data) {
    const progress = (data.current / data.total) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `${data.current}/${data.total}`;
    document.getElementById('totalCount').textContent = data.total;
    document.getElementById('currentEmail').textContent = data.email || '-';
    
    const statusBadge = document.getElementById('currentStatus');
    statusBadge.textContent = data.status;
    statusBadge.className = 'status-badge ms-2';
    
    switch (data.status) {
        case 'checking':
            statusBadge.classList.add('bg-primary', 'text-white');
            break;
        case 'valid':
            statusBadge.classList.add('bg-success', 'text-white');
            break;
        case 'invalid':
            statusBadge.classList.add('bg-danger', 'text-white');
            break;
        default:
            statusBadge.classList.add('bg-secondary', 'text-white');
    }
}

// Account registration functionality
startRegisterBtn.addEventListener('click', async () => {
    if (isRegistering) return;
    
    const count = parseInt(accountCount.value);
    if (!count || count < 1 || count > 50) {
        alert('Please enter a valid number of accounts (1-50).');
        return;
    }
    
    startRegistration(count);
});

async function startRegistration(count) {
    isRegistering = true;
    startRegisterBtn.disabled = true;
    startRegisterBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating...';
    
    registerProgress.classList.remove('d-none');
    clearLogs('register');
    
    // Hide previous results
    createdAccountsSection.style.display = 'none';
    createdAccountsData = [];
    
    document.getElementById('targetCount').textContent = count;
    document.getElementById('createdCount').textContent = '0';
    
    try {
        const response = await fetch('/api/register-accounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ count })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let createdCount = 0;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    
                    if (data.completed) {
                        addLog('register', `🎉 Registration completed! Created ${data.totalCreated} accounts`, 'success');
                        if (data.accounts.length > 0) {
                            addLog('register', '📋 Created accounts:', 'success');
                            data.accounts.forEach(account => {
                                addLog('register', `  ✓ ${account}`, 'success');
                            });
                            // Display results in the new section
                            displayCreatedAccounts(data.accounts);
                        }
                        break;
                    } else {
                        updateRegisterProgress(data);
                        
                        switch (data.status) {
                            case 'creating':
                                addLog('register', `🔄 Creating account ${data.current}/${data.total}...`, 'info');
                                break;
                            case 'email_created':
                                addLog('register', `📧 Generated email: ${data.email}`, 'info');
                                break;
                            case 'waiting_verification':
                                addLog('register', `⏳ Waiting for verification code...`, 'info');
                                break;
                            case 'code_received':
                                addLog('register', `✅ Verification code received: ${data.code}`, 'success');
                                break;
                            case 'success':
                                createdCount++;
                                addLog('register', `🎉 Account created successfully!`, 'success');
                                document.getElementById('createdCount').textContent = createdCount;
                                break;
                            case 'verification_failed':
                                addLog('register', `❌ Verification failed: ${data.error}`, 'error');
                                break;
                            case 'code_timeout':
                                addLog('register', `⏰ Verification code timeout`, 'error');
                                break;
                            case 'request_failed':
                                addLog('register', `❌ Request failed: ${data.error}`, 'error');
                                break;
                            case 'error':
                                addLog('register', `❌ Error: ${data.error}`, 'error');
                                break;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing JSON:', e, line);
                }
            }
        }
        
    } catch (error) {
        addLog('register', `❌ Error: ${error.message}`, 'error');
    } finally {
        isRegistering = false;
        startRegisterBtn.disabled = false;
        startRegisterBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Start Registration';
    }
}

function updateRegisterProgress(data) {
    const progress = (data.current / data.total) * 100;
    document.getElementById('registerProgressBar').style.width = `${progress}%`;
    document.getElementById('registerProgressText').textContent = `${data.current}/${data.total}`;
    document.getElementById('currentRegisterEmail').textContent = data.email || '-';
    
    const statusBadge = document.getElementById('currentRegisterStatus');
    statusBadge.textContent = data.status.replace('_', ' ');
    statusBadge.className = 'status-badge ms-2';
    
    switch (data.status) {
        case 'creating':
        case 'email_created':
        case 'waiting_verification':
            statusBadge.classList.add('bg-primary', 'text-white');
            break;
        case 'code_received':
        case 'success':
            statusBadge.classList.add('bg-success', 'text-white');
            break;
        case 'verification_failed':
        case 'code_timeout':
        case 'request_failed':
        case 'error':
            statusBadge.classList.add('bg-danger', 'text-white');
            break;
        default:
            statusBadge.classList.add('bg-secondary', 'text-white');
    }
}

// Utility functions
function addLog(type, message, level = 'info') {
    const logsContainer = type === 'check' ? checkLogs : registerLogs;
    const logEntry = document.createElement('p');
    logEntry.className = `log-entry ${level}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    
    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

function clearLogs(type) {
    const logsContainer = type === 'check' ? checkLogs : registerLogs;
    logsContainer.innerHTML = '';
}

// Copy to clipboard function
function copyToClipboard(text, successMessage) {
    navigator.clipboard.writeText(text).then(() => {
        // Show success message
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white bg-success border-0 position-fixed';
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-check me-2"></i>${successMessage}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        document.body.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            document.body.removeChild(toast);
        });
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy to clipboard');
    });
}

// Display created accounts results
function displayCreatedAccounts(accounts) {
    createdAccountsData = accounts;
    
    if (accounts.length === 0) {
        createdAccountsSection.style.display = 'none';
        return;
    }
    
    // Update total count
    totalCreatedDisplay.textContent = accounts.length;
    
    // Extract emails and display them
    const emails = accounts.map(account => account.split('|')[0]);
    createdEmailsList.innerHTML = emails.map(email => 
        `<div class="mb-1 p-1 border-bottom">${email}</div>`
    ).join('');
    
    // Display complete accounts
    createdAccountsList.innerHTML = accounts.map(account => 
        `<div class="mb-1 p-1 border-bottom">${account}</div>`
    ).join('');
    
    // Show the results section
    createdAccountsSection.style.display = 'block';
    
    // Scroll to results section
    setTimeout(() => {
        createdAccountsSection.scrollIntoView({ behavior: 'smooth' });
    }, 500);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load default password from config if available
    fetch('/config.json')
        .then(response => response.json())
        .then(config => {
            if (config.password) {
                document.getElementById('defaultPassword').value = config.password;
            }
        })
        .catch(() => {
            // Config not accessible, use default
        });
});

// Prevent form submission on Enter key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
    }
});