# Digital Second Brain

Digital Second Brain is a full-stack web application designed to enhance personal productivity and organization. It features AI-powered note-taking, habit tracking, and task management functionalities.

## Features

- **AI Integration**: Utilizes OpenAI's Gemini model for advanced AI-driven functionalities.
- **Note Management**: Create, edit, and organize notes efficiently.
- **Habit Tracking**: Track and analyze habits to improve productivity.
- **Secure Authentication**: Implements JWT-based authentication for secure user access.
- **Responsive Design**: Built with React and Vite for a seamless user experience.

## Tech Stack

### Backend
- **Node.js**
- **Express.js**
- **MongoDB**

### Frontend
- **React**
- **Vite**

### AI
- **OpenAI Gemini Model**

## Installation

### Prerequisites
- Node.js installed on your system
- MongoDB database connection

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/Surajjoshi2004/digital-secondbrain.git
   ```

2. Navigate to the backend directory and install dependencies:
   ```bash
   cd digital-secondbrain/backend
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the `backend` directory and add the following:
   ```env
   PORT=5000
   MONGODB_URI=<your_mongodb_connection_string>
   JWT_SECRET=<your_jwt_secret>
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:3000
   ENABLE_GEMINI_FEATURES=false
   GEMINI_API_KEY=<your_gemini_api_key>
   GEMINI_MODEL=gemini-2.5-flash-lite
   ```

4. Start the backend server:
   ```bash
   npm start
   ```

5. Navigate to the frontend directory and install dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

6. Start the frontend development server:
   ```bash
   npm run dev
   ```

7. Open your browser and navigate to `http://localhost:3000`.

## Folder Structure

### Backend
- `controllers/`: Handles application logic for various features.
- `models/`: Defines MongoDB schemas.
- `routes/`: API endpoints for the application.
- `middleware/`: Custom middleware for authentication, error handling, and security.
- `services/`: Contains reusable service logic.
- `utils/`: Utility functions and error handling.

### Frontend
- `src/components/`: React components for the user interface.
- `public/`: Static assets.

## Deployment

The application is configured for deployment on Netlify. Ensure that the environment variables are set correctly in the deployment settings.

## License

This project is licensed under the MIT License.