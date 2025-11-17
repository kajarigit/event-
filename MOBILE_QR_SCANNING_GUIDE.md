# QR Scanner Mobile Scanning Guide

## Issue Fixed
Scanner camera opens but doesn't detect/scan QR codes on mobile devices.

---

## Improvements Deployed

### 1. **Mobile-Optimized Scanner Settings**
```javascript
✅ Changed qrbox: 250 (number instead of object)
✅ AspectRatio: 1.777778 (16:9 for mobile cameras)
✅ Added torch/flashlight button (if device supports)
✅ Added zoom slider (if device supports)
✅ Default zoom: 2x for better QR detection
✅ Support multiple QR code formats
```

### 2. **Scan Processing Improvements**
```javascript
✅ Prevent duplicate scan processing
✅ Better async scanner cleanup
✅ Enhanced success feedback with emoji
✅ Improved error messages
```

### 3. **User Experience**
```javascript
✅ Added helpful tip banner above camera
✅ "Point your camera at the stall's QR code"
✅ "Keep the QR code within the frame and hold steady"
✅ Better visual feedback during scanning
```

---

## How to Test (After 3-5 minutes deployment)

### Step 1: Clear Cache & Reload
```
Mobile Browser:
1. Menu → Settings → Clear browsing data
2. Select "Cached images and files"
3. Click Clear
4. Close and reopen browser
5. Go to your site
```

### Step 2: Open Scanner
```
1. Login as student
2. Student → Feedback
3. Select event
4. Ensure checked in
5. Click "Open Camera to Scan Stall QR"
```

### Step 3: Use New Features

**A. Flashlight/Torch (if available):**
- Look for flashlight icon in scanner UI
- Tap to turn on/off
- Helps in low light conditions

**B. Zoom Slider (if available):**
- Look for zoom slider in scanner UI
- Drag to adjust zoom level
- Default starts at 2x zoom
- Helps with small or far QR codes

**C. Camera Selection:**
- Tap "Select Camera" dropdown
- Choose different camera if available
- Front camera usually not recommended for QR scanning

### Step 4: Scan QR Code

**Best Practices:**
1. **Distance**: Hold QR code 6-12 inches from camera
2. **Lighting**: Ensure good lighting (use flashlight if dark)
3. **Steady**: Keep phone and QR code steady
4. **Frame**: Keep QR code within the purple border
5. **Focus**: Wait for camera to focus (may take 1-2 seconds)
6. **Quality**: Use high-quality QR codes (download from admin panel)

---

## Scanning Tips

### ✅ DO:
- Use well-lit areas
- Hold phone steady
- Keep QR code flat (not bent/wrinkled)
- Use printed QR codes when possible
- Wait 2-3 seconds for auto-focus
- Try different angles if not working
- Use zoom slider for small QR codes
- Use flashlight in dark areas

### ❌ DON'T:
- Don't move phone while scanning
- Don't use blurry/damaged QR codes
- Don't scan in direct sunlight (causes glare)
- Don't rush - let camera focus
- Don't scan from very far away
- Don't use extremely small QR codes
- Don't have multiple QR codes in frame

---

## Troubleshooting

### Scanner Opens But Nothing Happens

**Try These in Order:**

**1. Check Console Logs (Mobile Chrome):**
```
Desktop:
- Connect phone to computer via USB
- Open Chrome → chrome://inspect
- Click "inspect" on your device
- Look for [Feedback QR] logs

Or use remote debugging
```

**2. Regenerate QR Code:**
```
Admin Panel:
1. Go to Stalls
2. Click QR icon on stall
3. Wait for loading
4. Download fresh QR code
5. Try scanning new QR code
```

**3. Adjust Phone Settings:**
```
Camera Focus:
- Tap on screen to focus manually
- Move phone closer/farther
- Try different distance (6-12 inches optimal)

Zoom:
- Use zoom slider if available
- 2x-3x zoom works best for small QR codes

Light:
- Use flashlight button if dark
- Move to better lit area
- Avoid harsh overhead lights
```

**4. Try Different QR Code Display:**
```
Option A: Print QR Code
- Download QR from admin
- Print on white paper
- Scan printed version

Option B: Different Screen
- Display QR on laptop/tablet screen
- Increase brightness to 100%
- Avoid screen glare
```

**5. Clear App Cache:**
```
Chrome Mobile:
Settings → Site Settings → [Your Site] → Clear & Reset

Or try:
Menu → Settings → Privacy → Clear browsing data
```

**6. Use Different Camera:**
```
If phone has multiple cameras:
- Tap "Select Camera" dropdown
- Try rear camera (usually better)
- Front camera may have lower quality
```

---

## Expected Behavior After Fix

### When Scanner Opens:
```
1. Camera preview appears
2. Purple border shows scan area
3. Blue tip banner shows instructions
4. Flashlight button (if supported)
5. Zoom slider (if supported)
6. Camera selector dropdown
7. "Stop Scanning" / "Cancel Scan" button
```

### During Scanning:
```
Console shows:
[Feedback QR] Scanning... Waiting for QR code

When QR detected:
[Feedback QR] Raw scanned data: {"stallId":"...","eventId":"..."}
[Feedback QR] Parsed QR data: {stallId: "...", eventId: "...", type: "stall"}
[Feedback QR] Found stall: AI & ML Showcase
[Feedback QR] ✅ Scan successful! Stall: AI & ML Showcase
```

### After Successful Scan:
```
1. Camera stops automatically
2. Scanner closes
3. Success toast appears:
   "🎯 ✅ Scanned: AI & ML Showcase! Now give your feedback."
4. Green success banner shows stall details
5. Rating stars appear
6. Comment box appears
7. Submit button enabled
```

---

## Mobile-Specific Features

### Torch/Flashlight Button:
- **Appears**: If device has flashlight
- **Location**: Usually top-right of scanner
- **Icon**: Flashlight or torch icon
- **Behavior**: Toggle on/off with tap

### Zoom Slider:
- **Appears**: If device supports zoom
- **Location**: Usually bottom of scanner
- **Range**: 1x to device max zoom
- **Default**: 2x (optimal for QR codes)
- **Use**: Drag slider or tap +/- buttons

### Camera Selection:
- **Dropdown**: "Select Camera (3)" or similar
- **Options**: Front camera, Rear camera, etc.
- **Recommended**: Use rear camera for scanning
- **Remembers**: Last used camera for next time

---

## Testing Checklist

After deployment, test these scenarios:

- [ ] Scanner opens successfully
- [ ] Camera permission granted
- [ ] Purple scan box visible
- [ ] Blue tip banner shows
- [ ] Flashlight button works (if available)
- [ ] Zoom slider works (if available)
- [ ] Camera switches work
- [ ] QR code detected (check console logs)
- [ ] Success toast appears
- [ ] Scanner closes automatically
- [ ] Stall details shown
- [ ] Can submit feedback
- [ ] Cancel button works
- [ ] Multiple scans work

---

## Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "This is not a stall QR code" | Wrong QR type | Use stall QR from admin panel |
| "This QR code is for a different event" | Event mismatch | Select correct event in dropdown |
| "You have already submitted feedback" | Duplicate | Correct! Scan different stall |
| "Stall not found in this event" | Invalid stall | Regenerate QR from admin |
| "Invalid QR code format" | Corrupted/old QR | Download fresh QR code |
| "Failed to start camera" | No permission | Allow camera in browser settings |

---

## Performance Tips

### For Better Scanning Speed:

**1. QR Code Quality:**
- Download high-resolution QR (300x300 minimum)
- Print on clean white paper
- Avoid wrinkles or damage

**2. Phone Settings:**
- Clean camera lens
- Disable power saving mode
- Close background apps
- Ensure good battery level

**3. Environment:**
- Good lighting (not too bright/dark)
- Stable surface (table, wall)
- Minimal movement
- No screen glare

**4. Scanner Settings:**
- Use 2x-3x zoom for small QR codes
- Enable flashlight in dark areas
- Use rear camera (better quality)
- Keep QR code in center of frame

---

## Technical Details

### Scanner Configuration:
```javascript
{
  fps: 10,                          // 10 frames per second
  qrbox: 250,                       // 250px scan box
  aspectRatio: 1.777778,            // 16:9 for mobile
  rememberLastUsedCamera: true,     // UX improvement
  showTorchButtonIfSupported: true, // Flashlight
  showZoomSliderIfSupported: true,  // Zoom control
  defaultZoomValueIfSupported: 2,   // Start at 2x zoom
  supportedScanTypes: [0, 1],       // QR + other formats
}
```

### Scan Processing:
```javascript
1. Camera captures frame (10 fps)
2. QR detection algorithm runs
3. If QR found → decode to text
4. Parse JSON data
5. Validate type, event, stall
6. Check for duplicates
7. If all pass → Success!
8. Close scanner, show feedback form
```

---

## Browser Compatibility

### Mobile Browsers:
✅ Chrome 53+ (Android)
✅ Safari 11+ (iOS)
✅ Edge 79+ (Android)
✅ Firefox 36+ (Android)
✅ Samsung Internet 6.2+

### Features Support:
| Feature | Chrome | Safari | Edge | Firefox |
|---------|--------|--------|------|---------|
| QR Scanning | ✅ | ✅ | ✅ | ✅ |
| Torch/Flash | ✅ | ⚠️* | ✅ | ✅ |
| Zoom Slider | ✅ | ⚠️* | ✅ | ✅ |
| Camera Switch | ✅ | ✅ | ✅ | ✅ |

*Safari support varies by iOS version

---

## Still Not Working?

### Last Resort Solutions:

**1. Force Reload:**
```
Mobile Chrome: Menu → ⋮ → Settings → Site settings → [Your site] → Clear & reset
Then: Menu → ⋮ → Reload (or Ctrl+Shift+R on desktop)
```

**2. Try Different Device:**
- Test on another phone
- Test on tablet
- Test on desktop with webcam
- Helps identify if device-specific issue

**3. Check Browser Version:**
```
Chrome: Menu → ⋮ → Settings → About Chrome
Update if version < 100
```

**4. Contact Support:**
```
Provide:
- Phone model
- Browser name & version
- Console logs (if possible)
- Screenshot of error
- QR code being scanned
```

---

**Deployed:** November 17, 2025  
**Next Test:** After 3-5 minutes deployment time  
**Expected:** Scanner detects QR codes much faster on mobile  
**Focus:** Mobile camera optimization for better QR detection
