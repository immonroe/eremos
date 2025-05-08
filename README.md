# Eremos

Eremos is a mindfulness journaling app designed to help users reflect, grow, and receive personalized insights based on their daily entries. It blends thoughtful journaling with the power of AI to encourage mental clarity and emotional well-being.

![eremos](https://github.com/user-attachments/assets/8ff970f9-ed49-4304-b8af-2e4dec6929af)

## How It's Made:

**Tech used:** HTML, CSS, JavaScript, MongoDB, Express, EJS, Node.js, Gemini AI API

Eremos was built using the MEEN stack, combining server-side rendering with EJS templates and a clean, user-friendly interface. The app allows users to create journal entries, which are analyzed by Gemini AI to provide personalized inspiration and mental wellness insights. The backend is structured using the MVC (Model-View-Controller) architecture, making the codebase scalable and maintainable. Special care was taken to keep load times low and memory usage efficient, especially as the app grows with more users and data.

## Optimizations

To improve performance, unnecessary data loads were removed, and memory usage was streamlined. Templates were reused and partials implemented to reduce duplication. Routes and middleware were modularized to improve maintainability. As the project scales, more optimizations like lazy loading and caching are being considered.

## Lessons Learned:

Through building Eremos, I gained hands-on experience working with AI integration and learned how to optimize for performance across both front-end and back-end layers. I learned how to navigate and contribute effectively within a large, evolving codebase while adhering to MVC design principles. This project deepened my understanding of system design, architecture, and how to deliver a responsive and thoughtful user experience.

## Installation

1. Clone repo
2. run `npm install`

## Usage

1. run `node server.js`
2. Navigate to `localhost:8080`
