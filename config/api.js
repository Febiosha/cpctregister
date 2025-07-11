// API Configuration - Centralized configuration for all applications

// Base URLs
export const API_CONFIG = {
  // Backend server configuration
  BACKEND_URL: 'http://localhost:5000',
  FRONTEND_URL: 'http://localhost:3000',
  
  // API Endpoints
  ENDPOINTS: {
    // Password management
    GET_PASSWORD: '/api/get-password',
    UPDATE_PASSWORD: '/api/update-password',
    
    // Account operations
    CHECK_ACCOUNTS: '/api/check-accounts',
    REGISTER_ACCOUNTS: '/api/register-accounts',
    
    // History management
    ACCOUNT_HISTORY: '/api/account-history',
    CLEAR_HISTORY: '/api/clear-history',
    EXPORT_HISTORY: '/api/export-history'
  },
  
  // Request configuration
  REQUEST_CONFIG: {
    timeout: 30000, // 30 seconds
    retries: 3,
    retryDelay: 1000 // 1 second
  },
  
  // LocalStorage keys
  STORAGE_KEYS: {
    ACCOUNT_HISTORY: 'dreamina_account_history',
    USER_PREFERENCES: 'dreamina_preferences',
    LAST_SYNC: 'dreamina_last_sync'
  },
  
  // Sync configuration
  SYNC_CONFIG: {
    AUTO_SYNC_INTERVAL: 30000, // 30 seconds
    STORAGE_EVENT_DELAY: 100, // 100ms delay for storage events
    MAX_HISTORY_SESSIONS: 100,
    MAX_RETRY_ATTEMPTS: 3
  }
};

// Helper function to build full API URL
export function buildApiUrl(endpoint) {
  return `${API_CONFIG.BACKEND_URL}${endpoint}`;
}

// Helper function for making API requests with retry logic
export async function apiRequest(endpoint, options = {}) {
  const url = buildApiUrl(endpoint);
  const config = {
    timeout: API_CONFIG.REQUEST_CONFIG.timeout,
    ...options
  };
  
  let lastError;
  
  for (let attempt = 1; attempt <= API_CONFIG.REQUEST_CONFIG.retries; attempt++) {
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`API request attempt ${attempt} failed:`, error.message);
      
      if (attempt < API_CONFIG.REQUEST_CONFIG.retries) {
        await new Promise(resolve => 
          setTimeout(resolve, API_CONFIG.REQUEST_CONFIG.retryDelay * attempt)
        );
      }
    }
  }
  
  throw new Error(`API request failed after ${API_CONFIG.REQUEST_CONFIG.retries} attempts: ${lastError.message}`);
}

// Storage helper functions
export const StorageHelper = {
  // Get data from localStorage with error handling
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return defaultValue;
    }
  },
  
  // Set data to localStorage with error handling
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error);
      return false;
    }
  },
  
  // Remove item from localStorage
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
      return false;
    }
  },
  
  // Trigger storage event for cross-tab sync
  triggerSync(key) {
    setTimeout(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: key,
        newValue: localStorage.getItem(key)
      }));
    }, API_CONFIG.SYNC_CONFIG.STORAGE_EVENT_DELAY);
  }
};

// Sync manager for cross-application synchronization
export class SyncManager {
  constructor(onSyncCallback) {
    this.onSyncCallback = onSyncCallback;
    this.syncInterval = null;
    this.isListening = false;
  }
  
  // Start listening for storage changes
  startListening() {
    if (this.isListening) return;
    
    this.handleStorageChange = (e) => {
      if (e.key === API_CONFIG.STORAGE_KEYS.ACCOUNT_HISTORY) {
        console.log('Cross-tab sync detected, updating data...');
        setTimeout(() => {
          if (this.onSyncCallback) {
            this.onSyncCallback();
          }
        }, API_CONFIG.SYNC_CONFIG.STORAGE_EVENT_DELAY);
      }
    };
    
    window.addEventListener('storage', this.handleStorageChange);
    
    // Start periodic sync
    this.syncInterval = setInterval(() => {
      if (this.onSyncCallback) {
        this.onSyncCallback();
      }
    }, API_CONFIG.SYNC_CONFIG.AUTO_SYNC_INTERVAL);
    
    this.isListening = true;
    console.log('Sync manager started');
  }
  
  // Stop listening for storage changes
  stopListening() {
    if (!this.isListening) return;
    
    if (this.handleStorageChange) {
      window.removeEventListener('storage', this.handleStorageChange);
    }
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.isListening = false;
    console.log('Sync manager stopped');
  }
}

// Export default configuration
export default API_CONFIG;