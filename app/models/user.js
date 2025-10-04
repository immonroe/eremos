// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for our user model
var userSchema = mongoose.Schema({

    local            : {
        email        : String,
        password     : String
    },
    facebook         : {
        id           : String,
        token        : String,
        name         : String,
        email        : String
    },
    twitter          : {
        id           : String,
        token        : String,
        displayName  : String,
        username     : String
    },
    google           : {
        id           : String,
        token        : String,
        email        : String,
        name         : String
    }

});

// =============================================================================
// TODO: Enhanced User Schema - Future Improvements
// =============================================================================
// Uncomment and implement these enhancements when ready:

/*
var enhancedUserSchema = mongoose.Schema({
    // Basic info
    local: {
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        firstName: String,
        lastName: String,
        username: { type: String, unique: true, sparse: true }
    },
    
    // Social auth (keep existing)
    facebook: { 
        id: String, 
        token: String, 
        name: String, 
        email: String 
    },
    twitter: { 
        id: String, 
        token: String, 
        displayName: String, 
        username: String 
    },
    google: { 
        id: String, 
        token: String, 
        email: String, 
        name: String 
    },
    
    // Additional user data
    profile: {
        bio: String,
        avatar: String,
        timezone: { type: String, default: 'UTC' },
        preferences: {
            theme: { type: String, default: 'light' },
            notifications: { type: Boolean, default: true },
            aiReflections: { type: Boolean, default: true }
        }
    },
    
    // Account management
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    lastLogin: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Add indexes for performance
enhancedUserSchema.index({ 'local.email': 1 });
enhancedUserSchema.index({ 'local.username': 1 });
enhancedUserSchema.index({ 'profile.preferences.theme': 1 });
*/

// =============================================================================
// TODO: Enhanced Message Schema - Future Improvements
// =============================================================================
// Create this as a new file: app/models/message.js

/*
var messageSchema = mongoose.Schema({
    text: { type: String, required: true },
    aiReflection: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isBookmarked: { type: Boolean, default: false },
    
    // Additional useful fields
    mood: { 
        type: String, 
        enum: ['happy', 'sad', 'neutral', 'excited', 'anxious', 'grateful'] 
    },
    tags: [String],
    wordCount: Number,
    isPrivate: { type: Boolean, default: true }
});

// Add indexes for performance
messageSchema.index({ createdBy: 1, createdAt: -1 });
messageSchema.index({ createdBy: 1, isBookmarked: 1 });
messageSchema.index({ text: 'text' }); // For text search
messageSchema.index({ mood: 1 });
messageSchema.index({ tags: 1 });

module.exports = mongoose.model('Message', messageSchema);
*/

// =============================================================================
// TODO: Additional Schemas - Future Improvements
// =============================================================================

// User Sessions (for better session management)
/*
var sessionSchema = mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sessionId: String,
    createdAt: Date,
    lastActivity: Date,
    ipAddress: String,
    userAgent: String
});

module.exports = mongoose.model('Session', sessionSchema);
*/

// User Preferences (if you want to separate from user schema)
/*
var preferencesSchema = mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    journalSettings: {
        defaultMood: String,
        enableAI: Boolean,
        reminderTime: String
    },
    privacySettings: {
        shareEntries: Boolean,
        allowAnalytics: Boolean
    }
});

module.exports = mongoose.model('Preferences', preferencesSchema);
*/

// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);