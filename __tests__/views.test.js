const fs = require('fs');
const path = require('path');

describe('views (regression)', () => {
  it('auth.ejs loads theme script with absolute path /auth.js (fixes theme toggle on /auth)', () => {
    const authEjs = fs.readFileSync(
      path.join(__dirname, '../views/auth.ejs'),
      'utf8'
    );
    expect(authEjs).toContain('src="/auth.js"');
    expect(authEjs).not.toMatch(/src="auth\.js"/);
  });

  it('profile history cards have data-id for delete/bookmark buttons', () => {
    const profileEjs = fs.readFileSync(
      path.join(__dirname, '../views/profile.ejs'),
      'utf8'
    );
    expect(profileEjs).toContain('data-id="<%= message._id %>"');
  });
});
