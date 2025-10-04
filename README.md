# Eremos

Eremos is a mindfulness journaling app designed to help users reflect, grow, and receive personalized insights based on their daily entries. It blends thoughtful journaling with the power of AI to encourage mental clarity and emotional well-being.

![eremos](https://github.com/user-attachments/assets/8ff970f9-ed49-4304-b8af-2e4dec6929af)

[Live Demo](https://eremos.up.railway.app/)

## How It's Made:

**Tech used:** HTML, CSS, JavaScript, MongoDB, Express, EJS, Node.js, Gemini AI API (2.5-flash)

Eremos was built using the MEEN stack, combining server-side rendering with EJS templates and a clean, user-friendly interface. The app allows users to create journal entries, which are analyzed by Gemini AI to provide personalized inspiration and mental wellness insights. The backend is structured using the MVC (Model-View-Controller) architecture, making the codebase scalable and maintainable. Special care was taken to keep load times low and memory usage efficient, especially as the app grows with more users and data.

## Project Structure

```
eremos/
├── app/
│ ├── controllers/ # Business logic separated by feature
│ │ ├── authController.js # Authentication (login, signup, logout)
│ │ ├── journalController.js # Journal entries & AI reflections
│ │ ├── profileController.js # User profile & search
│ │ ├── bookmarkController.js # Bookmark functionality
│ │ └── activityController.js # Activity tracking & stats
│ ├── middleware/
│ │ └── auth.js # Authentication middleware
│ ├── routes/ # Clean route definitions
│ │ ├── auth.js # Authentication routes
│ │ ├── journal.js # Journal entry routes
│ │ ├── profile.js # Profile & bookmark routes
│ │ └── index.js # Main route aggregator
│ ├── models/
│ │ └── user.js # User model
│ └── services/
│ └── aiService.js # AI service
├── config/
│ ├── database.js # MongoDB connection configuration
│ └── passport.js # Passport authentication strategies
├── views/ # EJS templates
├── public/ # Static assets (CSS, JS, images)
└── server.js # Application entry point
```

## Optimizations

To improve performance, unnecessary data loads were removed, and memory usage was streamlined. As the project scales, more optimizations will be considered (modular components such as partials, refactoring routes, adding more detailed schemas/routes for a more personalized experience, etc.)

## Lessons Learned:

Through building Eremos, I gained hands-on experience working with AI integration and learned how to optimize for performance across both front-end and back-end layers. I learned how to navigate and contribute effectively within a large, evolving codebase while adhering to MVC design principles. This project deepened my understanding of system design, architecture, and how to deliver a responsive and thoughtful user experience.

## Installation

1. Clone repo
2. run `npm install`

## Usage

1. run `node server.js`
2. Navigate to `localhost:3000`
