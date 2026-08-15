# ElevateAI

ElevateAI is an AI-powered application designed to provide intelligent and interactive assistance using modern AI technologies. The project combines a React frontend with a Node.js/Express backend that handles API requests and AI-powered functionality.

## Features

- AI-powered interaction
- Clean and user-friendly interface
- Backend API integration
- Integration with AI services such as Groq and xAI
- Environment-based configuration for API keys
- Modular frontend and backend structure

## Tech Stack

- **Frontend:** React.js, HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **AI APIs:** Groq, xAI
- **Version Control:** Git & GitHub

## Project Structure

```text
ElevateAI/
│
├── backend/
│   ├── ...
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md
```
Getting Started
1. Clone the Repository
git clone https://github.com/SnikithaD2/ElevateAI.git
cd ElevateAI
2. Set Up the Backend

Navigate to the backend directory:

cd backend

Install the required dependencies:

npm install
3. Configure Environment Variables

Create a .env file inside the backend directory:

GROQ_API_KEY=your_groq_api_key
XAI_API_KEY=your_xai_api_key

Replace the placeholder values with your own API keys.

Never commit the .env file to GitHub.

4. Start the Backend

From the backend directory, run:

npm start

The backend will start on the configured local port.

5. Set Up the Frontend

Open a new terminal and navigate to the frontend directory:

cd frontend

Install the required dependencies:

npm install
6. Start the Frontend

Run:

npm start

The frontend will be available at:

http://localhost:3000
Environment Variables
Variable	Description
GROQ_API_KEY	API key used to access Groq AI services
XAI_API_KEY	API key used to access xAI services
Available Frontend Scripts
npm start

Runs the React application in development mode.

npm test

Runs the test runner in interactive watch mode.

npm run build

Creates an optimized production build in the build folder.

Security

API keys and other sensitive credentials should always be stored in environment variables.

The .env file is intentionally excluded from Git using .gitignore.

Never share or commit API keys publicly.

Future Improvements
Add user authentication
Improve AI response handling
Add conversation history
Add more AI model options
Improve UI/UX
Deploy frontend and backend
Add error handling and logging
Author

Snikitha Grandhe

License

This project is created for educational and development purposes.



**One thing:** make sure your `.gitignore` contains this:


```text
backend/.env
```

That way your API keys won't accidentally get pushed again.
