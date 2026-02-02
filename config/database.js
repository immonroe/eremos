require('dotenv').config();

const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;
const dbName = process.env.DB_NAME;

let url = process.env.DB_URL;
const usedDbUrl = Boolean(url);

if (url) {
    // Expand ${DB_USER}, ${DB_PASS}, ${DB_NAME} in DB_URL (dotenv does not expand variables)
    url = url
        .replace(/\$\{DB_USER\}/g, dbUser || '')
        .replace(/\$\{DB_PASS\}/g, dbPass || '')
        .replace(/\$\{DB_NAME\}/g, dbName || '');
}

if (!url) {
    url = `mongodb+srv://${dbUser}:${dbPass}@cluster0.y8wfsvj.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;
}

module.exports = {
    url,
    dbName: usedDbUrl ? undefined : dbName
};
