# 📱 QR Code System for Feedback - Complete Guide

## Overview

The system now uses **QR code scanning** for students to submit feedback to stalls. Each stall has a unique QR code that students scan using their mobile camera.

---

## 🏗️ Architecture

### Backend Implementation

#### 1. **QR Code Generation** (`backend/src/utils/jwt.js`)

```javascript
const generateStallQR = async (stallId, eventId) => {
  // Create JSON data for student scanner
  const qrData = JSON.stringify({
    stallId,      // MongoDB ObjectId of the stall
    eventId,      // MongoDB ObjectId of the event
    type: 'stall',// Identifies this as a stall QR
    token         // JWT token for verification
  });

  const qrImage = await generateQRCodeImage(qrData);

  return {
    token,
    qrData,    // JSON string stored in database
    qrImage,   // Base64 image for display
  };
};
```

#### 2. **Stall Creation Flow** (`backend/src/controllers/adminController.js`)

When admin creates a stall:
1. Stall document is created in MongoDB
2. QR code is generated with actual stall ID
3. JSON data is stored in `stall.qrToken` field
4. QR image is returned to frontend

```javascript
exports.createStall = async (req, res, next) => {
  // Create stall
  const stall = await Stall.create({...req.body});
  
  // Generate QR with actual ID
  const qrData = await generateStallQR(stall._id.toString(), eventId);
  
  // Store JSON string
  stall.qrToken = qrData.qrData;
  await stall.save();
  
  // Return stall with QR image
  res.json({ stall, qrImage: qrData.qrImage });
};
```

#### 3. **QR Code Endpoint** (`/admin/stalls/:id/qrcode`)

Admins can retrieve stall QR codes anytime:
```javascript
GET /api/admin/stalls/:id/qrcode

Response:
{
  "success": true,
  "data": {
    "stallId": "507f1f77bcf86cd799439011",
    "stallName": "Tech Innovators Stall",
    "qrToken": "{\"stallId\":\"507f...\",\"eventId\":\"...\"}",
    "qrImage": "data:image/png;base64,iVBORw0KG..."
  }
}
```

---

### Frontend Implementation

#### 1. **Admin Dashboard** (`frontend/src/pages/Admin/Stalls.jsx`)

Features:
- ✅ View all stalls with QR icons
- ✅ Click QR icon to view/download QR code
- ✅ Modal displays large QR code
- ✅ Download button to save as PNG
- ✅ Print-friendly format

Usage:
```jsx
// Click QR icon next to any stall
<button onClick={() => showStallQR(stall)}>
  <QrCode /> View QR
</button>

// Modal shows QR code
<QRCodeSVG 
  value={stall.qrToken} 
  size={300} 
  level="H" 
/>
```

#### 2. **Student Feedback Scanner** (`frontend/src/pages/Student/Feedback.jsx`)

Features:
- ✅ Camera-based QR scanner
- ✅ Real-time scanning
- ✅ Automatic stall recognition
- ✅ Duplicate prevention
- ✅ Beautiful UI with animations

Flow:
```
1. Click "Open Camera to Scan Stall QR"
2. Camera opens with scanner overlay
3. Point at stall's QR code
4. Automatic detection and parsing
5. Validation (event match, no duplicates)
6. Feedback form opens
7. Rate 1-5 stars + comments
8. Submit feedback
```

Code:
```jsx
const handleScan = async (decodedText) => {
  // Parse QR data
  const qrData = JSON.parse(decodedText);
  const { stallId, eventId } = qrData;

  // Find stall
  const stall = stalls.find(s => s._id === stallId);
  
  // Check for duplicates
  const alreadyFeedback = myFeedbacks.find(f => f.stallId._id === stallId);
  if (alreadyFeedback) {
    toast.error('Already submitted feedback for this stall');
    return;
  }

  // Open feedback form
  setScannedStall(stall);
  toast.success(`Scanned: ${stall.name}!`);
};
```

---

## 📋 Step-by-Step Usage Guide

### For Admins:

#### Creating Stalls with QR Codes

1. **Login as Admin**
   ```
   Email: admin@event.com
   Password: admin123
   ```

2. **Navigate to Stalls Page**
   - Click "Stalls" in sidebar
   - Click "Create New Stall" button

3. **Fill Stall Details**
   ```
   Name: Tech Innovators Stall
   Department: Computer Science
   Description: Latest tech innovations
   Event: Select from dropdown
   Coordinator Name: John Doe
   Contact: +1234567890
   ```

4. **Submit**
   - QR code is automatically generated
   - QR image is displayed in success message

5. **View/Download QR Code**
   - Click QR icon next to stall in table
   - Modal shows large QR code
   - Click "Download QR Code" to save
   - Print and display at stall booth

#### Printing QR Codes

**Option 1: Individual Download**
1. Click QR icon → Download button
2. Save as PNG file
3. Print on A4 paper
4. Display at stall

**Option 2: Bulk Print** (Future feature)
- Export all QR codes as PDF
- Print multiple per page
- Cut and distribute

---

### For Stall Owners:

1. **Receive QR Code**
   - Admin provides printed QR code
   - Or download from email/portal

2. **Display QR Code**
   - Place at eye level
   - Good lighting
   - Clear visibility
   - Add sign: "Scan to Give Feedback"

3. **Best Practices**
   ```
   ✅ Print on white paper/cardboard
   ✅ Minimum 10cm x 10cm size
   ✅ Protect from damage (laminate)
   ✅ Multiple copies at booth
   ✅ Clear instructions for students
   ```

---

### For Students:

1. **Check-in at Event**
   - Scan your QR at gate
   - Get checked-in status

2. **Visit Stalls**
   - Explore different booths
   - Interact with stall owners

3. **Submit Feedback**
   - Open Student Portal → Feedback tab
   - Click "Open Camera to Scan Stall QR"
   - Point camera at stall's QR code
   - Wait for scan confirmation
   - Rate experience (1-5 stars)
   - Add optional comments
   - Click "Submit Feedback"

4. **View Submitted Feedbacks**
   - Scroll down to see all your feedbacks
   - Check which stalls you've reviewed
   - See your ratings and comments

---

## 🔧 Technical Details

### QR Code Data Format

```json
{
  "stallId": "507f1f77bcf86cd799439011",
  "eventId": "507f191e810c19729de860ea",
  "type": "stall",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Database Schema

```javascript
// Stall Model
{
  name: String,
  department: String,
  eventId: ObjectId,
  qrToken: String,  // Stores JSON string
  isActive: Boolean,
  stats: {
    totalFeedbacks: Number,
    averageRating: Number
  }
}
```

### Security

- ✅ JWT token embedded in QR
- ✅ Event ID validation
- ✅ Duplicate feedback prevention
- ✅ Check-in requirement
- ✅ Token expiry (365 days for stalls)

---

## 🎨 UI/UX Features

### Scanner Interface

```
┌─────────────────────────────┐
│  📱 Scan Stall QR Code      │
├─────────────────────────────┤
│                             │
│   ┌─────────────────┐      │
│   │                 │      │
│   │   CAMERA VIEW   │      │
│   │                 │      │
│   └─────────────────┘      │
│                             │
│  Point camera at QR code   │
│                             │
│  [Cancel Scan]             │
└─────────────────────────────┘
```

### Success State

```
┌─────────────────────────────┐
│  ✅ Stall Scanned!          │
├─────────────────────────────┤
│  Tech Innovators Stall      │
│  Computer Science           │
│                             │
│  ⭐⭐⭐⭐⭐               │
│  Rate your experience       │
│                             │
│  [Comments textarea]        │
│                             │
│  [Submit Feedback]          │
└─────────────────────────────┘
```

---

## 🐛 Troubleshooting

### QR Code Not Scanning

**Problem**: Scanner doesn't detect QR
**Solutions**:
1. Ensure good lighting
2. Hold camera steady
3. Adjust distance (15-30cm)
4. Clean camera lens
5. Check QR code quality

### Invalid QR Code Error

**Problem**: "Invalid QR code format"
**Solutions**:
1. Verify QR is for stalls (not student/volunteer)
2. Regenerate QR code from admin panel
3. Check event ID matches
4. Ensure QR code is not damaged

### Already Submitted Error

**Problem**: "Already submitted feedback for this stall"
**Solutions**:
- Each student can only give ONE feedback per stall
- This is intentional to prevent spam
- Check "My Submitted Feedbacks" section

### Not Checked In Error

**Problem**: "You must be checked-in"
**Solutions**:
1. Go to QR Code tab
2. Show QR at gate
3. Get scanned by volunteer
4. Return to Feedback tab

---

## 📊 Analytics & Reports

### Stall Performance

View in Admin Dashboard:
- Total feedbacks received
- Average rating (1-5 stars)
- Top rated stalls
- Feedback comments
- Trends over time

### Export Options

```bash
# Export all feedbacks
GET /api/admin/reports/feedbacks?eventId=xxx

# CSV format with:
- Student Name
- Stall Name
- Rating
- Comment
- Timestamp
```

---

## 🚀 Future Enhancements

### Planned Features

1. **Bulk QR Export**
   - Download all QR codes as PDF
   - Print multiple per page
   - Custom templates

2. **QR Analytics**
   - Track scan counts
   - Popular stalls
   - Peak scanning times

3. **Offline Support**
   - Cache QR codes
   - Sync when online
   - Progressive Web App

4. **Custom QR Designs**
   - Branded QR codes
   - Color customization
   - Logo embedding

---

## 📞 Support

### For Technical Issues

Contact: IT Support Team
Email: support@event.com

### For Event-Related Questions

Contact: Event Coordinators
Phone: +1234567890

---

## ✅ Checklist for Event Day

### Admin Tasks
- [ ] Create all stalls in system
- [ ] Download and print all QR codes
- [ ] Distribute to stall owners
- [ ] Test scanner with sample QR
- [ ] Brief volunteers on process

### Stall Owner Tasks
- [ ] Receive QR code from admin
- [ ] Display at booth prominently
- [ ] Add instruction sign
- [ ] Test with sample student
- [ ] Keep backup QR copy

### Student Instructions
- [ ] Check-in at gate (mandatory)
- [ ] Visit stalls
- [ ] Scan QR codes
- [ ] Submit honest feedback
- [ ] Check-out when leaving

---

**Made with ❤️ for seamless event feedback collection! 🎊**

Last Updated: November 15, 2025
Version: 2.0
