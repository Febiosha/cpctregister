// Account Service - Centralized service for account operations
import { API_CONFIG, apiRequest, StorageHelper } from '../config/api.js';

/**
 * Account Service Class
 * Handles all account-related operations with proper error handling and synchronization
 */
export class AccountService {
  constructor() {
    this.isProcessing = false;
    this.abortController = null;
  }

  /**
   * Get current password from backend
   */
  async getCurrentPassword() {
    try {
      const response = await apiRequest(API_CONFIG.ENDPOINTS.GET_PASSWORD);
      const data = await response.json();
      return data.password || 'DreaminaKesya123!';
    } catch (error) {
      console.error('Failed to fetch password:', error);
      return 'DreaminaKesya123!'; // Fallback
    }
  }

  /**
   * Update password in backend
   */
  async updatePassword(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    try {
      const response = await apiRequest(API_CONFIG.ENDPOINTS.UPDATE_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to update password:', error);
      throw error;
    }
  }

  /**
   * Check accounts validity
   */
  async checkAccounts(accountsText, onProgress, onResult) {
    if (this.isProcessing) {
      throw new Error('Another operation is already in progress');
    }

    this.isProcessing = true;
    this.abortController = new AbortController();

    try {
      const response = await apiRequest(API_CONFIG.ENDPOINTS.CHECK_ACCOUNTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountsText }),
        signal: this.abortController.signal
      });

      if (!response.body) {
        throw new Error('No response body received');
      }

      await this._processStreamingResponse(response, onProgress, onResult);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Account check was aborted');
      } else {
        console.error('Account check failed:', error);
        throw error;
      }
    } finally {
      this.isProcessing = false;
      this.abortController = null;
    }
  }

  /**
   * Register new accounts
   */
  async registerAccounts(count, password, onProgress, onResult) {
    if (this.isProcessing) {
      throw new Error('Another operation is already in progress');
    }

    if (count <= 0 || count > 100) {
      throw new Error('Account count must be between 1 and 100');
    }

    this.isProcessing = true;
    this.abortController = new AbortController();

    try {
      // Update password first
      await this.updatePassword(password);

      const response = await apiRequest(API_CONFIG.ENDPOINTS.REGISTER_ACCOUNTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count, password }),
        signal: this.abortController.signal
      });

      if (!response.body) {
        throw new Error('No response body received');
      }

      await this._processStreamingResponse(response, onProgress, onResult);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Account registration was aborted');
      } else {
        console.error('Account registration failed:', error);
        throw error;
      }
    } finally {
      this.isProcessing = false;
      this.abortController = null;
    }
  }

  /**
   * Stop current operation
   */
  stopOperation() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isProcessing = false;
  }

  /**
   * Process streaming response from server
   */
  async _processStreamingResponse(response, onProgress, onResult) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            
            if (data.completed) {
              if (onResult) onResult(data);
              break;
            } else {
              if (onProgress) onProgress(data);
            }
          } catch (parseError) {
            console.error('Failed to parse response line:', line, parseError);
          }
        }
      }
    }
  }

  /**
   * Check if service is currently processing
   */
  isOperationInProgress() {
    return this.isProcessing;
  }
}

/**
 * History Service Class
 * Handles account history management with proper synchronization
 */
export class HistoryService {
  constructor() {
    this.maxSessions = API_CONFIG.SYNC_CONFIG.MAX_HISTORY_SESSIONS;
  }

  /**
   * Get account history from storage
   */
  getHistory() {
    return StorageHelper.get(API_CONFIG.STORAGE_KEYS.ACCOUNT_HISTORY, []);
  }

  /**
   * Save session to history
   */
  saveSession(sessionData) {
    try {
      const history = this.getHistory();
      
      const newSession = {
        id: Date.now() + Math.random(), // Ensure unique ID
        timestamp: new Date().toISOString(),
        ...sessionData
      };

      // Add to beginning of array
      history.unshift(newSession);

      // Limit history size
      if (history.length > this.maxSessions) {
        history.splice(this.maxSessions);
      }

      // Save to storage
      const success = StorageHelper.set(API_CONFIG.STORAGE_KEYS.ACCOUNT_HISTORY, history);
      
      if (success) {
        // Trigger sync event
        StorageHelper.triggerSync(API_CONFIG.STORAGE_KEYS.ACCOUNT_HISTORY);
        console.log('Session saved to history:', newSession.type, newSession.id);
        return newSession;
      } else {
        throw new Error('Failed to save to storage');
      }
    } catch (error) {
      console.error('Failed to save session to history:', error);
      throw error;
    }
  }

  /**
   * Save account immediately after creation
   */
  saveAccountImmediately(accountData) {
    if (!accountData || !accountData.email || !accountData.password) {
      console.error('Invalid account data for immediate save');
      return;
    }

    const sessionData = {
      type: 'register',
      accounts: [`${accountData.email}|${accountData.password}`],
      totalRequested: 1,
      totalCreated: 1,
      successRate: '100.0'
    };

    return this.saveSession(sessionData);
  }

  /**
   * Save multiple accounts as a batch
   */
  saveAccountsBatch(accounts, sessionType = 'register') {
    if (!accounts || accounts.length === 0) {
      console.warn('No accounts to save');
      return;
    }

    const sessionData = {
      type: sessionType,
      accounts: accounts,
      totalRequested: accounts.length,
      totalCreated: accounts.length,
      successRate: '100.0'
    };

    return this.saveSession(sessionData);
  }

  /**
   * Delete a specific session from history
   */
  deleteSession(sessionId) {
    try {
      const history = this.getHistory();
      const filteredHistory = history.filter(session => session.id !== sessionId);
      
      const success = StorageHelper.set(API_CONFIG.STORAGE_KEYS.ACCOUNT_HISTORY, filteredHistory);
      
      if (success) {
        StorageHelper.triggerSync(API_CONFIG.STORAGE_KEYS.ACCOUNT_HISTORY);
        console.log('Session deleted from history:', sessionId);
        return true;
      } else {
        throw new Error('Failed to save updated history');
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }

  /**
   * Clear all history
   */
  clearHistory() {
    try {
      StorageHelper.remove(API_CONFIG.STORAGE_KEYS.ACCOUNT_HISTORY);
      StorageHelper.triggerSync(API_CONFIG.STORAGE_KEYS.ACCOUNT_HISTORY);
      console.log('History cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear history:', error);
      return false;
    }
  }

  /**
   * Get all accounts from history
   */
  getAllAccounts() {
    const history = this.getHistory();
    const allAccounts = [];

    history.forEach(session => {
      if (session.accounts && Array.isArray(session.accounts)) {
        session.accounts.forEach(account => {
          const [email, password] = account.split('|');
          if (email && password) {
            allAccounts.push({
              email: email.trim(),
              password: password.trim(),
              timestamp: session.timestamp,
              sessionId: session.id
            });
          }
        });
      }
    });

    return allAccounts;
  }

  /**
   * Search history by term
   */
  searchHistory(searchTerm) {
    if (!searchTerm) return this.getHistory();

    const history = this.getHistory();
    const term = searchTerm.toLowerCase();

    return history.filter(session => {
      const searchableText = [
        session.type,
        ...(session.accounts || []),
        session.timestamp
      ].join(' ').toLowerCase();

      return searchableText.includes(term);
    });
  }

  /**
   * Export history as text
   */
  exportHistory(format = 'json') {
    const history = this.getHistory();
    
    switch (format) {
      case 'json':
        return JSON.stringify(history, null, 2);
      
      case 'csv':
        const accounts = this.getAllAccounts();
        const csvHeader = 'Email,Password,Timestamp,SessionId\n';
        const csvData = accounts.map(acc => 
          `${acc.email},${acc.password},${acc.timestamp},${acc.sessionId}`
        ).join('\n');
        return csvHeader + csvData;
      
      case 'txt':
        const accounts_txt = this.getAllAccounts();
        return accounts_txt.map(acc => `${acc.email}|${acc.password}`).join('\n');
      
      default:
        throw new Error('Unsupported export format');
    }
  }

  /**
   * Export history to CSV file
   */
  exportToCSV() {
    try {
      const csvContent = this.exportHistory('csv');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `account_history_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('History exported to CSV successfully');
      } else {
        throw new Error('Browser does not support file download');
      }
    } catch (error) {
      console.error('Failed to export history to CSV:', error);
      throw error;
    }
  }
}

// Create singleton instances
export const accountService = new AccountService();
export const historyService = new HistoryService();

// Export default
export default {
  AccountService,
  HistoryService,
  accountService,
  historyService
};