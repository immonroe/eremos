/**
 * One-time migration: copy messages with isBookmarked: true into the bookmarks collection.
 * Creates a backup JSON file in scripts/backups/ before migrating so you can restore if needed.
 *
 * Run from project root: node scripts/migrate-bookmarks.js
 * Requires .env with DB connection (DB_URL or DB_USER/DB_PASS/DB_NAME).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const configDB = require('../config/database.js');

const BACKUPS_DIR = path.join(__dirname, 'backups');

function toPlain(obj) {
    if (obj == null) return obj;
    if (obj instanceof Date) return obj.toISOString();
    if (typeof obj === 'object' && typeof obj.toHexString === 'function') return obj.toString();
    if (Array.isArray(obj)) return obj.map(toPlain);
    if (typeof obj === 'object') {
        const out = {};
        for (const k of Object.keys(obj)) out[k] = toPlain(obj[k]);
        return out;
    }
    return obj;
}

async function run() {
    await mongoose.connect(configDB.url, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = mongoose.connection.db;
    const messages = db.collection('messages');
    const bookmarks = db.collection('bookmarks');

    const legacyBookmarked = await messages.find({ isBookmarked: true }).toArray();

    if (legacyBookmarked.length === 0) {
        console.log('No messages with isBookmarked: true found. Nothing to migrate.');
        await mongoose.disconnect();
        return;
    }

    // 1. Backup: write a copy of what we're about to migrate
    if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUPS_DIR, `bookmarks-backup-${timestamp}.json`);
    const backup = {
        createdAt: new Date().toISOString(),
        note: 'Backup before migrating bookmarks from messages.isBookmarked to bookmarks collection. Use to restore if needed.',
        count: legacyBookmarked.length,
        items: legacyBookmarked.map(doc => ({
            userId: doc.createdBy?.toString(),
            messageId: doc._id?.toString(),
            createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
            messageSnapshot: toPlain(doc)
        }))
    };
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
    console.log(`Backup written to ${backupPath} (${legacyBookmarked.length} bookmarks).`);

    // 2. Migrate into bookmarks collection
    let count = 0;
    for (const doc of legacyBookmarked) {
        const existing = await bookmarks.findOne({
            userId: doc.createdBy,
            messageId: doc._id
        });
        if (!existing) {
            await bookmarks.insertOne({
                userId: doc.createdBy,
                messageId: doc._id,
                createdAt: doc.createdAt || new Date()
            });
            count++;
        }
    }

    try {
        await bookmarks.createIndex({ userId: 1, messageId: 1 }, { unique: true });
    } catch (e) {
        if (!e.message || !e.message.includes('already exists')) throw e;
    }

    console.log(`Migrated ${count} bookmarks into the bookmarks collection.`);
    await mongoose.disconnect();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
