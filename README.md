# Dreamina Account Manager - Web Version

A modern web-based application for checking and registering Dreamina accounts with a beautiful, responsive interface.

## Features

### 🔍 Account Checker
- **File Upload**: Drag & drop or browse to upload accounts file
- **Manual Input**: Paste accounts directly in the text area
- **Real-time Progress**: Live progress tracking with detailed logs
- **Results Export**: Automatic saving of valid/invalid accounts with timestamps
- **VPN Verification**: Built-in reminder to connect to UK VPN

### 👤 Account Registration
- **Bulk Creation**: Create multiple accounts in one session (up to 50)
- **Temporary Email**: Uses generator.email for temporary email addresses
- **Auto Verification**: Automatically retrieves and uses verification codes
- **Progress Tracking**: Real-time status updates for each account creation
- **Error Handling**: Comprehensive error reporting and retry logic

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```

3. **Access the Application**
   Open your browser and navigate to `http://localhost:3000`

## Usage

### Account Checking

1. **Prepare Your Accounts File**
   - Format: `email|password` (one per line)
   - Example:
     ```
     user1@example.com|password123
     user2@example.com|mypassword
     ```

2. **Upload or Paste Accounts**
   - Drag & drop a `.txt` file, or
   - Click to browse and select a file, or
   - Paste accounts directly in the text area

3. **Verify VPN Connection**
   - Ensure you're connected to a UK VPN
   - Check the VPN confirmation checkbox

4. **Start Checking**
   - Click "Start Checking"
   - Monitor real-time progress and results
   - Download results files when complete

### Account Registration

1. **Set Account Count**
   - Enter the number of accounts to create (1-50)

2. **Start Registration**
   - Click "Start Registration"
   - Monitor the creation process in real-time
   - Each account goes through:
     - Email generation
     - Registration request
     - Verification code retrieval
     - Account verification

3. **View Results**
   - Successfully created accounts are automatically saved to `accounts.txt`
   - View detailed logs for each step

## Configuration

Edit `config.json` to customize settings:

```json
{
  "password": "YourDefaultPassword123!",
  "verifyFp": "verify_fingerprint_dreamina"
}
```

## File Structure

```
drmn/
├── server.js              # Express.js server
├── package.json           # Dependencies and scripts
├── config.json           # Configuration file
├── accounts.txt          # Generated accounts (created automatically)
├── public/
│   ├── index.html        # Main web interface
│   └── script.js         # Frontend JavaScript
├── uploads/              # Temporary file uploads (created automatically)
└── README.md            # This file
```

## API Endpoints

### POST `/api/check-accounts`
- **Purpose**: Check validity of provided accounts
- **Input**: Form data with `accountsText` or file upload
- **Output**: Streaming JSON responses with progress updates

### POST `/api/register-accounts`
- **Purpose**: Create new Dreamina accounts
- **Input**: JSON with `count` parameter
- **Output**: Streaming JSON responses with creation progress

## Technical Details

### Dependencies
- **express**: Web server framework
- **multer**: File upload handling
- **cors**: Cross-origin resource sharing
- **node-fetch**: HTTP requests
- **cheerio**: HTML parsing for email verification
- **@faker-js/faker**: Generate random user data

### Security Features
- Input validation and sanitization
- File upload restrictions
- Rate limiting through delays
- Error handling and logging

### Browser Compatibility
- Modern browsers with ES6+ support
- Responsive design for mobile and desktop
- Progressive enhancement

## Troubleshooting

### Common Issues

1. **"Scripts disabled" error**
   ```bash
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Port already in use**
   - Change the PORT in server.js or set environment variable
   - Kill existing processes using port 3000

3. **VPN Connection Issues**
   - Ensure UK VPN is active before checking accounts
   - Some VPNs may block the required endpoints

4. **Email Verification Timeout**
   - Temporary email services may be slow
   - The system waits up to 30 seconds for verification codes
   - Try reducing the number of concurrent registrations

### Logs and Debugging

- Server logs appear in the terminal
- Frontend logs are available in browser developer tools
- Check network tab for API request/response details

## Migration from CLI Version

The web version maintains full compatibility with the original CLI functionality:

- Same encryption methods
- Same API endpoints
- Same file formats
- Enhanced user experience with web interface

## License

ISC License - See package.json for details.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Verify network connectivity and VPN status
4. Ensure all dependencies are properly installed