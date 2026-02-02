jest.mock('dotenv', () => ({ config: jest.fn() }));

describe('config/database', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.DB_URL;
    delete process.env.DB_USER;
    delete process.env.DB_PASS;
    delete process.env.DB_NAME;
  });

  it('expands ${DB_USER}, ${DB_PASS}, ${DB_NAME} in DB_URL', () => {
    process.env.DB_URL = 'mongodb://${DB_USER}:${DB_PASS}@host/${DB_NAME}';
    process.env.DB_USER = 'myuser';
    process.env.DB_PASS = 'mypass';
    process.env.DB_NAME = 'mydb';

    const config = require('../database');

    expect(config.url).toBe('mongodb://myuser:mypass@host/mydb');
    expect(config.dbName).toBeUndefined();
  });

  it('uses empty string for missing env vars in DB_URL expansion', () => {
    process.env.DB_URL = 'mongodb://${DB_USER}:${DB_PASS}@host/${DB_NAME}';
    process.env.DB_USER = 'u';
    // DB_PASS and DB_NAME not set

    const config = require('../database');

    expect(config.url).toBe('mongodb://u:@host/');
  });

  it('builds URL from DB_USER, DB_PASS, DB_NAME when DB_URL is not set', () => {
    process.env.DB_USER = 'user';
    process.env.DB_PASS = 'pass';
    process.env.DB_NAME = 'dbname';

    const config = require('../database');

    expect(config.url).toContain('mongodb+srv://user:pass@');
    expect(config.url).toContain('/dbname?');
    expect(config.dbName).toBe('dbname');
  });
});
