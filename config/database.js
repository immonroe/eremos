require('dotenv').config();

const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;
const dbName = process.env.DB_NAME;

module.exports = {
    url: `mongodb+srv://${dbUser}:${dbPass}@cluster0.y8wfsvj.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`,
    dbName: dbName
};
