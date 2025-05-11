# P2P File Sharing System

A secure, peer-to-peer file sharing application built with WebRTC and Firebase. This system enables direct file transfers between peers without storing files on any intermediate server.

## Features

- 🔒 Secure P2P file transfers using WebRTC
- 📤 Chunked file transfer for large files
- 🔄 Real-time connection status updates
- 📱 Cross-platform compatibility
- 🔍 Enhanced debugging capabilities
- 🚀 Firebase-based signaling server
- 📊 Real-time transfer speed and progress monitoring
- 🔄 Automatic reconnection handling
- 🎯 Direct room joining via URL parameters
- 🛡️ Comprehensive error handling

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A Firebase account
- A TURN server (for NAT traversal)

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd P2P-File-sharing-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Configuration**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Firestore Database
   - Set up Firestore in test mode
   - Copy your Firebase configuration and replace in `main.js`:
     ```javascript
     const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT.appspot.com",
       messagingSenderId: "YOUR_SENDER_ID",
       appId: "YOUR_APP_ID"
     };
     ```

4. **TURN Server Configuration**
   - Set up a TURN server or use a TURN service provider
   - Update the TURN server configuration in `main.js`:
     ```javascript
     {
       urls: "turn:YOUR_TURN_SERVER:3478",
       username: "TURN_USERNAME",
       credential: "TURN_CREDENTIAL"
     }
     ```

## Usage

1. **Start the application**
   ```bash
   npm run serve
   ```

2. **Connect Peers**
   - Open the application in two different browsers or devices
   - Copy the Room ID from one peer
   - Paste the Room ID in the other peer's input field
   - Click "Connect"
   - Alternatively, share the URL with `?room=ROOM_ID` parameter

3. **Transfer Files**
   - Select a file using the file input
   - Click "Send File"
   - Monitor transfer progress and speed
   - The receiver will see a download link when the transfer is complete

## Security Considerations

- The application requires HTTPS for WebRTC functionality
- Files are transferred directly between peers
- No files are stored on the signaling server
- TURN server credentials should be kept secure
- File size is limited to 2GB for stability
- Automatic cleanup of signaling data on disconnect

## Debugging

1. **Console Logging**
   - ICE candidate information
   - Connection state changes
   - File transfer progress and speed
   - Firebase signaling events
   - Error messages and stack traces

2. **WebRTC Internals**
   - Open Chrome and navigate to `chrome://webrtc-internals`
   - Start a new session
   - Reproduce the issue
   - Export logs for analysis

## Project Structure

```
P2P-File-sharing-system/
├── main.js           # Main application logic
├── index.html        # User interface
├── styles.css        # Styling
├── package.json      # Dependencies
└── README.md         # Documentation
```

## Dependencies

- Firebase (for signaling)
- WebRTC (native browser API)

## Browser Support

- Chrome (recommended)
- Firefox
- Edge
- Safari (limited support)

## Limitations

- Requires HTTPS for WebRTC functionality
- File size limited to 2GB
- Requires TURN server for NAT traversal
- Both peers must be online simultaneously
- Transfer speed depends on network conditions
- Memory usage scales with file size
- No automatic retry on transfer failure
- No file integrity verification

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- WebRTC for P2P communication
- Firebase for signaling server
- STUN/TURN servers for NAT traversal

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.