# Feature Requests

## Mobile/Tablet Support

**Request:** Run the Discord Monitor app on tablets (iPad, Android tablets)

**Status:** ✅ **Implemented** (with limitations)

**Solution Implemented:**
Web-based version that runs on a local server and can be accessed from any device on the LAN.

**How to Use:**
1. Run `npm run web` on your computer
2. Access from tablet via `http://192.168.x.x:3000` (LAN IP shown in terminal)
3. Works on any device with a web browser

**Current Limitations:**
- **CORS prevents automatic sidebar toggling** - Due to browser security, the web version cannot automatically hide Discord sidebars
- **Bookmarklet workaround** - Drag the provided bookmarklet to your bookmark bar and click it when Discord loads to toggle sidebars
- **Single Discord session** - All 3 panes share the same browser cookies (cannot easily use multiple accounts)
- **Requires LAN connection** - Must be on the same network as the computer running the server

**Advantages:**
- ✅ Works on tablets and mobile devices
- ✅ No installation needed on client devices
- ✅ Easy to update (just update server)
- ✅ Access from anywhere on your LAN

**Desktop version still recommended for:**
- Multiple Discord accounts (separate sessions)
- Automatic sidebar toggling
- Offline usage

---

## Future Enhancements

### 1. Native Mobile App

**Options:**
1. **React Native version** - Native app for iOS/Android
   - Better performance and native feel
   - Full control over UI and functionality
   - Significant development effort required

2. **Flutter version** - Cross-platform mobile support
   - Single codebase for iOS and Android
   - Modern UI toolkit

**Priority:** Low (web version covers most use cases)
**Status:** Not planned

### 2. Browser Extension for Sidebar Toggle

**Description:** Create a browser extension to enable automatic sidebar toggling in the web version

**Benefits:**
- Would solve CORS limitation
- Seamless user experience like desktop version

**Drawbacks:**
- Users must install extension
- Maintenance of separate codebase
- Store approval process needed

**Priority:** Medium
**Status:** Under consideration
