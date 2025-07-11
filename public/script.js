// Import service layer
import { accountService, historyService } from '../services/AccountService.js'
import { SyncManager } from '../config/api.js'

// Global variables
let isChecking = false;
let isRegistering = false;


let syncManager = null;

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
        
        await accountService.updatePassword(password);
        showPasswordStatus('Password saved successfully!', 'success');
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
    
    const accounts = accountsData.split('\n').filter(line => line.trim());
    let validCount = 0;
    let invalidCount = 0;
    
    try {
        await accountService.checkAccounts(
            accounts,
            true, // VPN check is required
            {
                onProgress: (data) => {
                    updateCheckProgress(data);
                },
                onResult: (result) => {
                    if (result.status === 'valid') {
                        validCount++;
                        addLog('check', `✅ ${result.email} - Valid`, 'success');
                    } else {
                        invalidCount++;
                        addLog('check', `❌ ${result.email} - Invalid: ${result.message || 'Unknown error'}`, 'error');
                    }
                    
                    document.getElementById('validCount').textContent = validCount;
                    document.getElementById('invalidCount').textContent = invalidCount;
                },
                onLog: (message) => {
                    addLog('check', message, 'info');
                },
                onComplete: (data) => {
                    addLog('check', `✅ Checking completed! Valid: ${data.validCount}, Invalid: ${data.totalCount - data.validCount}`, 'success');
                    addLog('check', `📁 Results saved with timestamp: ${new Date().toISOString()}`, 'info');
                }
            }
        );
        
    } catch (error) {
        if (error.name === 'AbortError') {
            addLog('check', '⏹️ Checking stopped by user', 'warning');
        } else {
            addLog('check', `❌ Error: ${error.message}`, 'error');
        }
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
    if (isRegistering) {
        stopRegistration();
        return;
    }
    
    const count = parseInt(accountCount.value);
    if (!count || count < 1 || count > 50) {
        alert('Please enter a valid number of accounts (1-50).');
        return;
    }
    
    startRegistration(count);
});

function stopRegistration() {
    accountService.stopRegistration();
    addLog('register', '🛑 Stopping registration...', 'warning');
}

async function startRegistration(count) {
    isRegistering = true;
    startRegisterBtn.disabled = false;
    startRegisterBtn.innerHTML = '<i class="fas fa-stop me-2"></i>Stop Registration';
    
    registerProgress.classList.remove('d-none');
    clearLogs('register');
    
    // Hide previous results
    createdAccountsSection.style.display = 'none';
    createdAccountsData = [];
    
    document.getElementById('targetCount').textContent = count;
    document.getElementById('createdCount').textContent = '0';
    
    let createdCount = 0;
    
    try {
        await accountService.registerAccounts(
            count,
            // Progress callback
            (data) => {
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
                        
                        // Save account data immediately to prevent data loss
                        if (data.accountData) {
                            const immediateSession = {
                                type: 'register',
                                accounts: [data.accountData],
                                totalRequested: 1,
                                totalCreated: 1,
                                partialResult: true,
                                timestamp: new Date().toISOString()
                            };
                            
                            historyService.saveSession(immediateSession);
                            console.log('Account saved immediately:', data.accountData);
                            
                            // Update history display
                            setTimeout(() => {
                                updateHistoryDisplay();
                            }, 100);
                        }
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
            },
            // Results callback
            (accounts) => {
                addLog('register', '📋 Created accounts:', 'success');
                accounts.forEach(account => {
                    addLog('register', `  ✓ ${account}`, 'success');
                });
                displayCreatedAccounts(accounts);
            },
            // Log callback
            (message, type) => {
                addLog('register', message, type);
            },
            // Completion callback
            (data) => {
                addLog('register', `🎉 Registration completed! Created ${data.totalCreated} accounts`, 'success');
                
                if (data.accounts.length > 0) {
                    // Save to history with detailed logging
                    console.log('Saving to history:', {
                        type: 'register',
                        accounts: data.accounts,
                        totalRequested: count,
                        totalCreated: data.accounts.length
                    });
                    
                    historyService.saveSession({
                        type: 'register',
                        accounts: data.accounts,
                        totalRequested: count,
                        totalCreated: data.accounts.length
                    });
                    
                    // Update history display immediately
                    setTimeout(() => {
                        updateHistoryDisplay();
                    }, 1000);
                }
            }
        );
        
    } catch (error) {
        if (error.name === 'AbortError') {
            addLog('register', '🛑 Registration stopped by user', 'warning');
        } else {
            addLog('register', `❌ Error: ${error.message}`, 'error');
        }
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



// Save session to history
async function saveSessionToHistory(sessionData) {
    try {
        console.log('saveSessionToHistory called with:', sessionData);
        await historyService.saveSession(sessionData);
        console.log('Session saved successfully');
        
        // Add delay before updating display to ensure data is persisted
        setTimeout(() => {
            console.log('Updating history display after save...');
            updateHistoryDisplay();
        }, 100);
    } catch (error) {
        console.error('Error saving session to history:', error);
    }
}

// Get account history
async function getAccountHistory() {
    try {
        console.log('Fetching history from service...');
        const history = await historyService.getHistory();
        console.log('History loaded:', history.length, 'sessions');
        return history;
    } catch (error) {
        console.error('Error loading history from service:', error);
        return [];
    }
}



// Clear history
async function clearAccountHistory() {
    if (confirm('Are you sure you want to clear all account history? This action cannot be undone.')) {
        try {
            await historyService.clearHistory();
            console.log('History cleared successfully');
        } catch (error) {
            console.error('Error clearing history:', error);
        }
        updateHistoryDisplay();
    }
}

// Export history
async function exportAccountHistory() {
    try {
        await historyService.exportToCSV();
        console.log('History exported successfully');
    } catch (error) {
        console.error('Error exporting history:', error);
        alert('Failed to export history. Please try again.');
    }
}

// Filter history by date range
function filterHistoryByDate(history, filter) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
        case 'today':
            return history.filter(session => new Date(session.timestamp) >= today);
        case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return history.filter(session => new Date(session.timestamp) >= weekAgo);
        case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            return history.filter(session => new Date(session.timestamp) >= monthAgo);
        default:
            return history;
    }
}

// Search history
function searchHistory(history, searchTerm) {
    if (!searchTerm) return history;
    
    const term = searchTerm.toLowerCase();
    return history.filter(session => {
        const searchableText = [
            session.type,
            ...(session.accounts || []),
            ...(session.validAccounts || []),
            ...(session.invalidAccounts || [])
        ].join(' ').toLowerCase();
        
        return searchableText.includes(term);
    });
}

// Update history display
async function updateHistoryDisplay() {
    console.log('updateHistoryDisplay called');
    const history = await getAccountHistory();
    console.log('History loaded:', history.length, 'sessions');
    
    const filter = document.getElementById('historyFilter')?.value || 'all';
    const searchTerm = document.getElementById('historySearch')?.value || '';
    
    let filteredHistory = filterHistoryByDate(history, filter);
    filteredHistory = searchHistory(filteredHistory, searchTerm);
    console.log('Filtered history:', filteredHistory.length, 'sessions');
    
    // Update statistics
    updateHistoryStats(history);
    
    // Update content
    const historyContent = document.getElementById('historyContent');
    
    if (filteredHistory.length === 0) {
        historyContent.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-history fa-3x mb-3"></i>
                <p>${history.length === 0 ? 'No account history found. Start creating or checking accounts to see history here.' : 'No sessions match your filter criteria.'}</p>
            </div>
        `;
        return;
    }
    
    historyContent.innerHTML = filteredHistory.map(session => {
        const date = new Date(session.timestamp).toLocaleString();
        const typeIcon = session.type === 'register' ? 'user-plus' : 'check-circle';
        const typeColor = session.type === 'register' ? 'success' : 'info';
        
        let accountsHtml = '';
        if (session.type === 'register' && session.accounts) {
            accountsHtml = `
                <div class="mt-2">
                    <small class="text-muted">Created Accounts (${session.accounts.length}):</small>
                    <div class="font-monospace small mt-1" style="max-height: 100px; overflow-y: auto;">
                        ${session.accounts.map(acc => `<div class="text-success">${acc}</div>`).join('')}
                    </div>
                </div>
            `;
        } else if (session.type === 'check') {
            const validCount = session.validAccounts ? session.validAccounts.length : 0;
            const invalidCount = session.invalidAccounts ? session.invalidAccounts.length : 0;
            accountsHtml = `
                <div class="mt-2">
                    <div class="row">
                        <div class="col-6">
                            <small class="text-success">Valid: ${validCount}</small>
                        </div>
                        <div class="col-6">
                            <small class="text-danger">Invalid: ${invalidCount}</small>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="card-title">
                                <i class="fas fa-${typeIcon} text-${typeColor} me-2"></i>
                                ${session.type === 'register' ? 'Account Registration' : 'Account Check'}
                            </h6>
                            <p class="card-text text-muted mb-1">
                                <i class="fas fa-clock me-1"></i>${date}
                            </p>
                            ${accountsHtml}
                        </div>
                        <div class="btn-group" role="group">
                            <button class="btn btn-outline-primary btn-sm" onclick="copySessionData(${session.id})">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteSession(${session.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Update history statistics
function updateHistoryStats(history) {
    const totalSessions = history.length;
    let totalAccounts = 0;
    let totalValidAccounts = 0;
    
    history.forEach(session => {
        if (session.type === 'register' && session.accounts) {
            totalAccounts += session.accounts.length;
            totalValidAccounts += session.accounts.length; // All registered accounts are valid
        } else if (session.type === 'check') {
            const validCount = session.validAccounts ? session.validAccounts.length : 0;
            const invalidCount = session.invalidAccounts ? session.invalidAccounts.length : 0;
            totalAccounts += validCount + invalidCount;
            totalValidAccounts += validCount;
        }
    });
    
    const successRate = totalAccounts > 0 ? Math.round((totalValidAccounts / totalAccounts) * 100) : 0;
    
    document.getElementById('totalSessions').textContent = totalSessions;
    document.getElementById('totalHistoryAccounts').textContent = totalAccounts;
    document.getElementById('totalValidAccounts').textContent = totalValidAccounts;
    document.getElementById('successRate').textContent = `${successRate}%`;
}

// Copy session data
async function copySessionData(sessionId) {
    const history = await getAccountHistory();
    const session = history.find(s => s.id === sessionId);
    
    if (!session) return;
    
    let copyText = '';
    if (session.type === 'register' && session.accounts) {
        copyText = session.accounts.join('\n');
    } else if (session.type === 'check' && session.validAccounts) {
        copyText = session.validAccounts.join('\n');
    }
    
    if (copyText) {
        copyToClipboard(copyText, 'Session data copied to clipboard!');
    }
}

// Delete session
async function deleteSession(sessionId) {
    if (confirm('Are you sure you want to delete this session?')) {
        try {
            const success = historyService.deleteSession(sessionId);
            if (success) {
                console.log('Session deleted successfully');
            } else {
                console.error('Failed to delete session');
            }
        } catch (error) {
            console.error('Error deleting session:', error);
        }
        
        // Refresh history display
        updateHistoryDisplay();
    }
}



// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing...');
    
    console.log('Initializing application...');
    
    // Load default password from config if available
    loadCurrentPassword();
    
    // Initialize history display
    console.log('Initializing history display...');
    updateHistoryDisplay();
    
    // Add event listeners for history functionality
    document.getElementById('historySearch').addEventListener('input', updateHistoryDisplay);
    document.getElementById('historyFilter').addEventListener('change', updateHistoryDisplay);
    document.getElementById('exportHistoryBtn').addEventListener('click', exportAccountHistory);
    document.getElementById('clearHistoryBtn').addEventListener('click', clearAccountHistory);
    
    // Listen for storage changes from other tabs/apps
    window.addEventListener('storage', function(e) {
        console.log('Storage changed, updating history display');
        setTimeout(updateHistoryDisplay, 100); // Small delay to ensure data is written
    });
    
    // Periodically refresh history display to catch any missed updates
    setInterval(updateHistoryDisplay, 30000); // Refresh every 30 seconds
});

// Prevent form submission on Enter key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
    }
});