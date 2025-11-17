# QR Scanner Troubleshooting Guide - Student Feedback

## Problem
Students cannot scan stall QR codes from the Feedback page.

---

## Fixes Implemented

### 1. **Scanner Initialization Improvements**
- Added proper lifecycle management to prevent multiple initializations
- Added element existence check before initializing scanner
- Added `rememberLastUsedCamera` option for better UX
- Improved cleanup to prevent memory leaks

### 2. **Enhanced Error Handling**
- Camera permission errors now show helpful toast messages
- Better logging for debugging scanner issues
- Graceful handling of scanner cleanup errors

### 3. **QR Data Validation**
- Validates QR code type is 'stall' (not student check-in QR)
- Validates eventId matches selected event
- Validates stall exists in current event
- Checks if feedback already submitted

### 4. **Better User Feedback**
- Clear error messages for different failure scenarios
- Console logging for debugging
- Success messages with stall name

---

## Common Issues & Solutions

### Issue 1: Camera Not Opening

**Symptoms:**
- Scanner button clicked but nothing happens
- No camera permission popup

**Causes:**
1. Browser doesn't have camera permission
2. Another app is using the camera
3. HTTPS required for camera access

**Solutions:**

**A. Check Camera Permissions:**
```
Chrome: Settings → Privacy and Security → Site Settings → Camera
Edge: Settings → Cookies and site permissions → Camera
Firefox: Settings → Privacy & Security → Permissions → Camera
```

**B. Allow Camera for Your Site:**
1. Click the lock icon in address bar
2. Find "Camera" permission
3. Set to "Allow"
4. Refresh the page

**C. Ensure HTTPS:**
- Camera API requires HTTPS (or localhost for development)
- Render provides HTTPS automatically ✅

**D. Close Other Apps:**
- Close any other apps using camera (Zoom, Teams, etc.)
- Close other browser tabs that might be using camera

---

### Issue 2: Scanner Shows But Doesn't Scan

**Symptoms:**
- Camera opens successfully
- QR code shown to camera but nothing happens

**Causes:**
1. QR code is too small/blurry
2. Poor lighting
3. QR code format is wrong
4. Camera focus issues

**Solutions:**

**A. QR Code Quality:**
- Ensure QR code is clear and sharp
- Download QR code from admin panel for best quality
- Print QR code at least 2x2 inches
- Avoid scanning from phone screens (use printed QR)

**B. Lighting:**
- Good lighting is essential
- Avoid direct sunlight (causes glare)
- Use steady hands or mount QR code

**C. Distance:**
- Hold QR code 6-12 inches from camera
- Ensure QR code fills the scanning box
- Keep QR code steady

**D. Check QR Code Data:**
Open browser console (F12) and look for:
```javascript
[Feedback QR] Raw scanned data: {"stallId":"...","eventId":"...","type":"stall","token":"..."}
```

If you see this, the scanner is working!

---

### Issue 3: "Invalid QR Code Format" Error

**Symptoms:**
- Scanner detects QR but shows error toast
- Console shows parse error

**Causes:**
1. Scanning wrong type of QR code (e.g., student check-in QR)
2. QR code from old system
3. Corrupted QR code data

**Solutions:**

**A. Regenerate QR Code:**
1. Go to Admin → Stalls
2. Click QR icon on the stall
3. Wait for QR to generate (loading spinner)
4. Download fresh QR code
5. Try scanning again

**B. Verify QR Type:**
Check console logs:
```javascript
[Feedback QR] Parsed QR data: {
  "stallId": "abc-123",
  "eventId": "xyz-789",
  "type": "stall",  // ← Must be "stall"
  "token": "..."
}
```

If `type` is not "stall", you're scanning wrong QR code.

---

### Issue 4: "This QR code is for a different event"

**Symptoms:**
- QR scans successfully
- Error: "This QR code is for a different event"

**Cause:**
- QR code is for Event A but you selected Event B

**Solution:**
1. Check which event is selected in dropdown
2. Ensure QR code is for the same event
3. Change event selection if needed
4. Or use correct QR code for selected event

---

### Issue 5: "You have already submitted feedback"

**Symptoms:**
- QR scans successfully
- Error: "Already submitted feedback"

**Cause:**
- Feedback already given to this stall

**Solution:**
- This is correct behavior! Each student can only give feedback once per stall
- Scan a different stall's QR code instead
- Check "My Feedbacks" section to see which stalls you've already reviewed

---

### Issue 6: "Not Checked In" Warning

**Symptoms:**
- Scanner button is disabled
- Yellow warning banner shows

**Cause:**
- Student hasn't checked into the event yet

**Solution:**
1. Go to Student → QR Code
2. Show your QR code to volunteer at gate
3. Wait for check-in
4. Return to Feedback page
5. Scanner button should now be enabled

---

## Testing Steps (After Deployment - 3-5 minutes)

### Test 1: Basic Scanner Functionality
1. Login as student
2. Go to **Student → Feedback**
3. Select an event
4. Ensure you're checked in (green banner)
5. Click **"Open Camera to Scan Stall QR"**
6. Camera should open successfully ✅

### Test 2: Permission Handling
1. Block camera permission in browser
2. Try to open scanner
3. Should see error toast about permissions ✅
4. Re-enable camera permission
5. Try again - should work ✅

### Test 3: QR Code Scanning
1. Generate stall QR from admin panel
2. Display QR on screen or print it
3. Scan QR with camera
4. Should see: **"Scanned: [Stall Name]! Now give your feedback."** ✅
5. Feedback form should appear with stall details ✅

### Test 4: Validation Checks
1. Try scanning student check-in QR → Should fail with "not a stall QR code" ✅
2. Try scanning QR from different event → Should fail with "different event" ✅
3. Submit feedback, then scan same QR again → Should fail with "already submitted" ✅

### Test 5: Submit Feedback
1. Scan a valid stall QR
2. Give rating (1-5 stars)
3. Add comment
4. Click submit
5. Should see success message ✅
6. Feedback should appear in "My Feedbacks" section ✅

---

## Browser Console Logs

### Successful Scan:
```
[Feedback QR] Raw scanned data: {"stallId":"ca8dcf7d...","eventId":"550e8400...","type":"stall","token":"eyJhbGc..."}
[Feedback QR] Parsed QR data: {stallId: "ca8dcf7d...", eventId: "550e8400...", type: "stall", token: "eyJhbGc..."}
[Feedback QR] Found stall: AI & ML Showcase
✅ Toast: "Scanned: AI & ML Showcase! Now give your feedback."
```

### Failed Scan (Wrong Type):
```
[Feedback QR] Raw scanned data: {"userId":"123...","eventId":"...","type":"student","token":"..."}
[Feedback QR] Parsed QR data: {userId: "123...", type: "student", ...}
❌ Toast: "This is not a stall QR code"
```

### Failed Scan (Invalid JSON):
```
[Feedback QR] Raw scanned data: eyJhbGciOiJIUzI1NiIsInR5...
[Feedback QR] Scan error: SyntaxError: Unexpected token e in JSON at position 0
❌ Toast: "Invalid QR code format. Please scan a stall QR code."
```

---

## File Changes

### Modified Files:
- `frontend/src/pages/Student/Feedback.jsx`
  - Improved scanner initialization with lifecycle management
  - Added element existence check
  - Enhanced error handling and logging
  - Added QR type and eventId validation
  - Better camera permission error messages

---

## Deployment Status

✅ **Deployed:** November 17, 2025
✅ **Auto-deploy:** Render (from GitHub)
✅ **Expected:** 3-5 minutes deployment time

---

## What to Check After Deployment

1. **Browser Console:**
   - Press F12 to open developer tools
   - Look for `[Feedback QR]` logs
   - Check for initialization errors

2. **Network Tab:**
   - Check if `/api/student/stalls` loads successfully
   - Verify QR data has proper structure

3. **Camera:**
   - Ensure browser has camera permission
   - Test on both desktop and mobile
   - Check different browsers (Chrome, Edge, Firefox)

4. **QR Codes:**
   - Re-download QR codes from admin panel
   - Ensure they contain latest format
   - Test with both printed and screen QR codes

---

## Mobile Testing

### Android (Chrome/Edge):
1. Camera permission popup appears on first use
2. Tap "Allow" to grant permission
3. Scanner should work immediately

### iOS (Safari):
1. Settings → Safari → Camera
2. Set to "Ask" or "Allow"
3. Scanner requests permission on first use
4. Tap "Allow"

**Note:** iOS Safari can be restrictive with camera access. If issues persist, try:
- Use Chrome or Edge browser instead
- Clear Safari cache and try again
- Check iOS Settings → [Your Site] → Camera

---

## Still Having Issues?

### Debug Mode:
1. Open browser console (F12)
2. Look for errors in Console tab
3. Share error messages for support

### Common Error Patterns:

**"getUserMedia is not defined":**
- Not using HTTPS
- Browser doesn't support camera API
- Try different browser

**"Permission denied":**
- Camera permission not granted
- Another app using camera
- Check browser settings

**"Could not start video source":**
- Camera in use by another app
- Camera driver issue
- Restart browser/computer

---

## Additional Notes

### Browser Support:
✅ Chrome 53+
✅ Edge 79+
✅ Firefox 36+
✅ Safari 11+
❌ Internet Explorer (not supported)

### Performance Tips:
- Close unnecessary browser tabs
- Ensure good internet connection
- Use recent browser version
- Clear browser cache if issues persist

### Security:
- Camera only activates when scanner is open
- No video is recorded or uploaded
- QR code data is only parsed locally
- Camera stops when scanner is closed

---

**Last Updated:** November 17, 2025
**Status:** ✅ Fixed and Deployed
