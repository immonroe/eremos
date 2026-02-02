# Eremos

Eremos is a mindfulness journaling app designed to help users reflect, grow, and receive personalized insights based on their daily entries. It blends thoughtful journaling with the power of AI to encourage mental clarity and emotional well-being.

![eremos](https://github.com/user-attachments/assets/8ff970f9-ed49-4304-b8af-2e4dec6929af)

[Live Demo](https://eremos.up.railway.app/)

## How It's Made

**Tech used:** HTML, CSS, JavaScript, MongoDB, Express, EJS, Node.js, Gemini AI API (2.5-flash)

Eremos was built using the MEEN stack, combining server-side rendering with EJS templates and a clean, user-friendly interface. The app allows users to create journal entries, which are analyzed by Gemini AI to provide personalized inspiration and mental wellness insights. The backend is structured using the MVC (Model-View-Controller) architecture, making the codebase scalable and maintainable.

## Development environment (local run)

Use this to run the app locally and test changes before pushing.

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd eremos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Copy `.env.template` to `.env`:
     ```bash
     cp .env.template .env
     ```
   - Edit `.env` and set:
     - **`GEMINI_API_KEY`** - Your [Google AI / Gemini](https://ai.google.dev/) API key (required for AI reflections).
     - **`SESSION_SECRET`** - A long random string for session signing (e.g. `openssl rand -hex 32`). Required in production.
     - **Database** - Either:
       - **Option A:** `DB_URL` – Full MongoDB connection string (e.g. `mongodb://localhost:27017/eremos` for local, or Atlas URI).
       - **Option B:** `DB_USER`, `DB_PASS`, `DB_NAME` – For the default Atlas connection format (see `config/database.js`).

4. **Run the app**
   ```bash
   npm run dev
   ```
   Or, without nodemon: `npm start` or `node server.js`.

5. **Open** [http://localhost:3000](http://localhost:3000) (or the port in `PORT` if set).

**Optional - local MongoDB with Docker:**  
From the project root, run `docker-compose up -d` to start MongoDB. Then set `DB_URL=mongodb://localhost:27017/eremos` in `.env`. MongoDB Atlas remains the default when using `DB_USER`/`DB_PASS`/`DB_NAME`.

**Other deployment:**  
`deploy/Procfile` is for Railway/Heroku-style deployment. For local development, the single recommended way to run is `npm run dev` (see above).

**Bookmarks migration (one-time):**  
If you have existing journal entries with `isBookmarked: true` in the `messages` collection, run once: `node scripts/migrate-bookmarks.js` to copy them into the `bookmarks` collection. The script **creates a backup** in `scripts/backups/bookmarks-backup-<timestamp>.json` before migrating (IDs, dates, and full message snapshots) so you can restore if something goes wrong. Backup files are gitignored. The migration also creates a unique index on `bookmarks` for `(userId, messageId)`.

## Testing

Unit tests use [Jest](https://jestjs.io/). Run them to catch regressions (e.g. auth script path, DB URL expansion, resources, profile data attributes).

```bash
npm test
```

Watch mode (re-run on file changes):

```bash
npm run test:watch
```

Tests live in `config/__tests__/` (database, resources) and `__tests__/views.test.js` (view regression checks). Add new tests in `*.test.js` files next to the code or in a `__tests__` folder.

## Security

- **Secrets:** Never commit `.env`. Use `.env.template` as a guide only. Set `SESSION_SECRET` to a long random string in production (e.g. `openssl rand -hex 32`).
- **Session:** The app uses `SESSION_SECRET` from env; if unset, a dev fallback is used. Replace it in production.
- **Auth:** Passwords are hashed with bcrypt. The "Test Account" button on `/auth` fills demo credentials; disable or remove it in production.
- **Input:** EJS uses `<%= %>` (escaped) for user content; avoid `<%- %>` with unsanitized user input to prevent XSS.
- **HTTPS:** Use HTTPS in production; session cookies should be `secure` when you deploy (e.g. behind a reverse proxy).
- **Dependencies:** Run `npm audit` and address reported vulnerabilities when possible.

## Project Structure

```
eremos/
├── app/
│   ├── controllers/   # Business logic separated by feature
│   │   ├── authController.js
│   │   ├── journalController.js
│   │   ├── profileController.js
│   │   ├── bookmarkController.js
│   │   └── activityController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── journal.js
│   │   ├── profile.js
│   │   └── index.js
│   ├── models/
│   │   └── user.js
│   └── services/
│       └── aiService.js
├── config/
│   ├── database.js
│   └── passport.js
├── views/            # EJS templates
├── public/           # Static assets (CSS, JS, images)
└── server.js
```

## Optimizations

Performance and memory usage have been streamlined. As the project scales, further optimizations (modular partials, pagination, detailed schemas) can be added.

## Lessons Learned

Through building Eremos, I gained hands-on experience with AI integration, MVC design, and delivering a responsive user experience.
