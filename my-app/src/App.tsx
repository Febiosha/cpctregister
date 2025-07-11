import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Search, UserPlus, Upload, Play, ChartLine, History, Download, Trash2, Settings } from 'lucide-react'

// Import services
import { accountService, historyService } from '../../services/AccountService.js'
import { SyncManager } from '../../config/api.js'

// Types
interface CheckResult {
  email: string
  password: string
  status: 'valid' | 'invalid' | 'checking'
  message?: string
}

interface RegistrationResult {
  email: string
  password: string
  status: 'success' | 'failed' | 'processing'
  message?: string
}

function App() {
  // UI State
  const [activeTab, setActiveTab] = useState('checker')
  const [accountsText, setAccountsText] = useState('')
  const [accountCount, setAccountCount] = useState(1)
  const [defaultPassword, setDefaultPassword] = useState('DreaminaKesya123!')
  const [vpnCheck, setVpnCheck] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentAccount, setCurrentAccount] = useState('')
  
  // Operation States
  const [isChecking, setIsChecking] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  
  // Results and Logs
  const [checkResults, setCheckResults] = useState<CheckResult[]>([])
  const [registrationResults, setRegistrationResults] = useState<RegistrationResult[]>([])
  const [logs, setLogs] = useState<string[]>(['Ready to check accounts...'])
  const [registrationLogs, setRegistrationLogs] = useState<string[]>(['Ready to register accounts...'])
  
  // Counters
  const [validCount, setValidCount] = useState(0)
  const [createdCount, setCreatedCount] = useState(0)
  const [processedCount, setProcessedCount] = useState(0)
  
  // Sync Manager
  const [syncManager, setSyncManager] = useState<SyncManager | null>(null)

  // Initialize app and sync manager
  useEffect(() => {
    initializeApp()
    
    return () => {
      if (syncManager) {
        syncManager.stopListening()
      }
    }
  }, [])
  
  // Initialize application
  const initializeApp = async () => {
    try {
      // Load default password
      const password = await accountService.getCurrentPassword()
      setDefaultPassword(password)
      
      // Load saved accounts
      loadSavedAccounts()
      
      // Initialize sync manager
      const manager = new SyncManager(loadSavedAccounts)
      manager.startListening()
      setSyncManager(manager)
      
      console.log('App initialized successfully')
    } catch (error) {
      console.error('Failed to initialize app:', error)
      addLog('Failed to initialize application')
    }
  }

  const loadSavedAccounts = () => {
    try {
      const allAccounts = historyService.getAllAccounts()
      const registrationResults: RegistrationResult[] = allAccounts.map(account => ({
        email: account.email,
        password: account.password,
        status: 'success' as const,
        message: 'Account created successfully'
      }))
      
      setRegistrationResults(registrationResults)
      setCreatedCount(registrationResults.length)
      setProcessedCount(registrationResults.length)
      console.log('Loaded saved accounts from history:', registrationResults.length)
    } catch (error) {
      console.error('Failed to load saved accounts:', error)
      addRegistrationLog('Failed to load saved accounts')
    }
  }

  const saveAccountsToHistory = (accounts: string[], type: 'check' | 'register') => {
    try {
      const accountObjects = accounts.map(account => {
        const [email, password] = account.split('|')
        return { email, password }
      })
      
      historyService.saveSession({
        type,
        accounts: accountObjects,
        timestamp: new Date().toISOString()
      })
      
      console.log('Saved accounts to history:', { type, count: accounts.length })
    } catch (error) {
      console.error('Failed to save accounts to history:', error)
      addLog('Failed to save accounts to history')
    }
  }

  const fetchDefaultPassword = async () => {
    try {
      const password = await accountService.getCurrentPassword()
      setDefaultPassword(password)
    } catch (error) {
      console.error('Failed to fetch default password:', error)
      addLog('Failed to fetch default password')
    }
  }

  const updatePassword = async (newPassword: string) => {
    try {
      await accountService.updatePassword(newPassword)
      setDefaultPassword(newPassword)
      addLog(`Password updated to: ${newPassword}`)
    } catch (error) {
      console.error('Failed to update password:', error)
      addLog('Failed to update password')
    }
  }

  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-49), message])
  }

  const addRegistrationLog = (message: string) => {
    setRegistrationLogs(prev => [...prev.slice(-49), message])
  }

  const startAccountCheck = async () => {
    if (!accountsText.trim()) {
      addLog('Please enter accounts to check')
      return
    }

    const accounts = accountsText.trim().split('\n').filter(line => line.trim())
    if (accounts.length === 0) {
      addLog('No valid accounts found')
      return
    }

    setIsChecking(true)
    setCheckResults([])
    setLogs(['Starting account check...'])
    setProgress(0)
    setValidCount(0)
    setProcessedCount(0)
    setCurrentAccount('')

    try {
      await accountService.checkAccounts(
        accounts,
        vpnCheck,
        {
          onProgress: (data) => {
            setProgress(data.progress)
            setProcessedCount(data.processed)
            if (data.currentAccount) {
              setCurrentAccount(data.currentAccount)
            }
          },
          onResult: (result) => {
            setCheckResults(prev => [...prev, result])
            if (result.status === 'valid') {
              setValidCount(prev => prev + 1)
            }
          },
          onLog: (message) => {
            addLog(message)
          },
          onComplete: (data) => {
            addLog(`Check completed. Valid: ${data.validCount}/${data.totalCount}`)
            setProgress(100)
            setCurrentAccount('')
          }
        }
      )
    } catch (error: any) {
      if (error.name === 'AbortError') {
        addLog('Account check was cancelled')
      } else {
        console.error('Account check failed:', error)
        addLog(`Error: ${error.message}`)
      }
    } finally {
      setIsChecking(false)
      setCurrentAccount('')
    }
  }

  const stopAccountCheck = () => {
    accountService.stopChecking()
    setIsChecking(false)
    addLog('Account check stopped by user')
  }

  const startRegistration = async () => {
    if (accountCount <= 0) return

    setIsRegistering(true)
    setProgress(0)
    setCreatedCount(0)
    setProcessedCount(0)
    setRegistrationResults([])
    setRegistrationLogs(['Starting account registration...'])
    setCurrentAccount('')

    // Update password in backend
    await updatePassword(defaultPassword)
    addRegistrationLog(`Using password: ${defaultPassword}`)
    addRegistrationLog(`Creating ${accountCount} accounts...`)

    try {
      const successfulAccounts: string[] = []
      
      await accountService.registerAccounts(
        accountCount,
        defaultPassword,
        {
          onProgress: (data) => {
            setProgress(data.progress)
            setProcessedCount(data.processed)
            if (data.currentAccount) {
              setCurrentAccount(data.currentAccount)
            }
          },
          onResult: (result) => {
            setRegistrationResults(prev => [...prev, result])
            if (result.status === 'success') {
              setCreatedCount(prev => prev + 1)
              successfulAccounts.push(`${result.email}|${result.password}`)
            }
          },
          onLog: (message) => {
            addRegistrationLog(message)
          },
          onComplete: (data) => {
            addRegistrationLog(`Registration completed. Created: ${data.createdCount}/${data.totalCount}`)
            setProgress(100)
            setCurrentAccount('')
            
            // Save successful accounts to history
            if (successfulAccounts.length > 0) {
              saveAccountsToHistory(successfulAccounts, 'register')
            }
          }
        }
      )
    } catch (error: any) {
      if (error.name === 'AbortError') {
        addRegistrationLog('Account registration was cancelled')
      } else {
        console.error('Account registration failed:', error)
        addRegistrationLog(`Error: ${error.message}`)
      }
    } finally {
      setIsRegistering(false)
      setCurrentAccount('')
    }
  }

  const stopAccountRegistration = () => {
    accountService.stopRegistration()
    setIsRegistering(false)
    addRegistrationLog('Account registration stopped by user')
  }

  const handlePasswordChange = (newPassword: string) => {
    setDefaultPassword(newPassword)
    updatePassword(newPassword)
  }

  const clearHistory = () => {
    setCheckResults([])
    setRegistrationResults([])
    setValidCount(0)
    setCreatedCount(0)
    setProcessedCount(0)
    setLogs(['Ready to check accounts...'])
    setRegistrationLogs(['Ready to register accounts...'])
    historyService.clearHistory()
    addLog('History cleared')
  }

  const exportData = () => {
    try {
      historyService.exportToCSV()
      addLog('Data exported successfully')
    } catch (error) {
      console.error('Export failed:', error)
      addLog('Failed to export data')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                Dreamina Account Manager
              </h1>
              <p className="text-gray-600 mt-1">Professional account checking and registration tool with modern interface</p>
              <div className="flex gap-2 mt-3">
                <Badge variant="info">Fast & Secure</Badge>
                <Badge variant="info">Mobile Friendly</Badge>
                <Badge variant="info">Real-time Stats</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="checker" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Account Checker
              </TabsTrigger>
              <TabsTrigger value="register" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Account Register
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Account Checker Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="checker" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Accounts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                    <h6 className="font-medium mb-2">Drop accounts file here or click to browse</h6>
                    <p className="text-sm text-gray-500">Supported format: email|password (one per line)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Or paste accounts manually:</label>
                    <Textarea 
                      value={accountsText}
                      onChange={(e) => setAccountsText(e.target.value)}
                      placeholder="email1|password1\nemail2|password2\n..."
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="vpnCheck" 
                      checked={vpnCheck}
                      onChange={(e) => setVpnCheck(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="vpnCheck" className="text-sm flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      I'm connected to UK VPN
                    </label>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={isChecking ? stopAccountCheck : startAccountCheck}
                    disabled={!accountsText.trim()}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isChecking ? 'Stop Checking' : 'Start Checking'}
                  </Button>
                </CardContent>
              </Card>

              {/* Progress Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChartLine className="h-5 w-5" />
                    Progress & Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    {isChecking || checkResults.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                            <h3 className="text-2xl font-bold text-gray-900">{checkResults.length || accountsText.split('\n').filter(line => line.includes('|')).length}</h3>
                            <p className="text-sm text-gray-600">TARGET</p>
                          </div>
                          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                            <h3 className="text-2xl font-bold text-gray-900">{validCount}</h3>
                            <p className="text-sm text-gray-600">VALID</p>
                          </div>
                        </div>
                        
                        <Progress value={progress} className="w-full" />
                        <p className="text-sm">Progress {Math.round(progress)}%</p>
                        
                        <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{currentAccount || (isChecking ? 'Checking accounts...' : 'Check completed')}</span>
                            <Badge variant={isChecking ? "warning" : "success"}>{isChecking ? 'checking' : 'completed'}</Badge>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">Ready to check accounts...</p>
                    )}
                  </div>
                  
                  <div className="mt-4 bg-gray-100 rounded-lg p-4 max-h-48 overflow-y-auto font-mono text-sm">
                    {logs.map((log, index) => (
                      <div key={index} className="text-gray-600 mb-1">{log}</div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Account Register Section */}
          <TabsContent value="register" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Registration Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Registration Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Number of accounts to create:</label>
                    <Input 
                      type="number" 
                      value={accountCount}
                      onChange={(e) => setAccountCount(Number(e.target.value))}
                      min={1}
                      max={50}
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum 50 accounts per session</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Default Password:</label>
                    <div className="flex gap-2">
                      <Input 
                        value={defaultPassword}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        placeholder="Enter default password"
                      />
                      <Button variant="outline" size="icon" onClick={fetchDefaultPassword}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">This password will be used for all new accounts</p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <div className="text-blue-600 mt-0.5">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-800">Note:</p>
                        <p className="text-sm text-blue-700">Registration uses temporary email services and may take time to receive verification codes.</p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={isRegistering ? stopAccountRegistration : startRegistration}
                    disabled={accountCount <= 0}
                    variant={isRegistering ? "destructive" : "default"}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isRegistering ? 'Stop Registration' : 'Start Registration'}
                  </Button>
                </CardContent>
              </Card>

              {/* Registration Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChartLine className="h-5 w-5" />
                    Registration Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 rounded-lg p-6 text-center space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <h3 className="text-2xl font-bold text-gray-900">{accountCount}</h3>
                        <p className="text-sm text-gray-600">TARGET</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                        <h3 className="text-2xl font-bold text-gray-900">{createdCount}</h3>
                        <p className="text-sm text-gray-600">CREATED</p>
                      </div>
                    </div>
                    
                    <Progress value={isRegistering ? progress : (registrationResults.length > 0 ? 100 : 0)} className="w-full" />
                    <p className="text-sm">Progress {createdCount}/{accountCount}</p>
                    
                    <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {isRegistering ? 'Creating accounts...' : 
                           registrationResults.length > 0 ? 'Registration completed' : 
                           'Ready to start registration'}
                        </span>
                        <Badge variant={isRegistering ? "warning" : registrationResults.length > 0 ? "success" : "secondary"}>
                          {isRegistering ? 'processing' : registrationResults.length > 0 ? 'completed' : 'ready'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 bg-gray-100 rounded-lg p-4 max-h-48 overflow-y-auto font-mono text-sm">
                    {registrationLogs.map((log, index) => (
                      <div key={index} className="text-blue-600 mb-1">{log}</div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Account History Section */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Account History
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportData}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={clearHistory}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear History
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="accounts">Accounts</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <Input placeholder="Search..." />
                  </div>
                  <Button variant="outline" onClick={exportData}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button variant="outline" onClick={clearHistory}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear History
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm border">
                    <h3 className="text-2xl font-bold text-gray-900">{(checkResults.length > 0 ? 1 : 0) + (registrationResults.length > 0 ? 1 : 0)}</h3>
                    <p className="text-sm text-gray-600">TOTAL SESSIONS</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm border">
                    <h3 className="text-2xl font-bold text-gray-900">{checkResults.length + registrationResults.length}</h3>
                    <p className="text-sm text-gray-600">TOTAL ACCOUNTS</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm border">
                    <h3 className="text-2xl font-bold text-gray-900">{validCount + createdCount}</h3>
                    <p className="text-sm text-gray-600">VALID ACCOUNTS</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-sm border">
                    <h3 className="text-2xl font-bold text-green-600">
                      {checkResults.length + registrationResults.length > 0 
                        ? Math.round(((validCount + createdCount) / (checkResults.length + registrationResults.length)) * 100)
                        : 0}%
                    </h3>
                    <p className="text-sm text-gray-600">SUCCESS RATE</p>
                  </div>
                </div>
                
                {checkResults.length === 0 && registrationResults.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No history data available</p>
                    <p className="text-sm">Start checking or registering accounts to see history</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {checkResults.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Checked Accounts</h4>
                        <div className="space-y-2">
                          {checkResults.map((result, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  result.status === 'valid' ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                                <span className="font-mono text-sm">{result.email}</span>
                              </div>
                              <Badge variant={result.status === 'valid' ? 'success' : 'destructive'}>
                                {result.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {registrationResults.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Registered Accounts</h4>
                        <div className="space-y-2">
                          {registrationResults.map((result, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  result.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                                <span className="font-mono text-sm">{result.email}</span>
                              </div>
                              <Badge variant={result.status === 'success' ? 'success' : 'destructive'}>
                                {result.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="sessions">
                <div className="text-center py-12 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No session data available</p>
                </div>
              </TabsContent>
              
              <TabsContent value="accounts">
                <div className="text-center py-12 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No account data available</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
