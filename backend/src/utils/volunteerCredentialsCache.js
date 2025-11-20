// Temporary in-memory storage for newly created volunteer credentials
// In production, consider using Redis or secure temporary database table
const volunteerCredentialsCache = new Map();

module.exports = {
  // Store volunteer credentials after creation
  storeVolunteerCredentials: (volunteerId, credentials) => {
    volunteerCredentialsCache.set(volunteerId, {
      ...credentials,
      createdAt: new Date(),
      // Auto-expire after 24 hours
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
  },

  // Get volunteer credentials for download
  getVolunteerCredentials: (volunteerId) => {
    const credentials = volunteerCredentialsCache.get(volunteerId);
    if (credentials && credentials.expiresAt > new Date()) {
      return credentials;
    }
    return null;
  },

  // Get all volunteer credentials for batch download
  getAllVolunteerCredentials: () => {
    const now = new Date();
    const allCredentials = [];
    
    for (const [volunteerId, credentials] of volunteerCredentialsCache.entries()) {
      if (credentials.expiresAt > now) {
        allCredentials.push(credentials);
      } else {
        // Remove expired credentials
        volunteerCredentialsCache.delete(volunteerId);
      }
    }
    
    return allCredentials;
  },

  // Clear all credentials (for testing or cleanup)
  clearAllCredentials: () => {
    volunteerCredentialsCache.clear();
  },

  // Clear expired credentials
  clearExpiredCredentials: () => {
    const now = new Date();
    for (const [volunteerId, credentials] of volunteerCredentialsCache.entries()) {
      if (credentials.expiresAt <= now) {
        volunteerCredentialsCache.delete(volunteerId);
      }
    }
  }
};