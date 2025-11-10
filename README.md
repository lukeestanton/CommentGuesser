# Comment Guesser

Comment Guesser is a small web app that challenges you to identify which reply on a trending YouTube Short collected the most 
likes. The backend fetches real YouTube comment threads while the React frontend presents the round, tracks your streak, and 
reveals the results after each guess.

## Prerequisites

- **Python 3.11+** (for the FastAPI service)
- **Node.js 20+** (for the Vite dev server)
- A YouTube Data API v3 key stored in `YOUTUBE_API_KEY`

## Backend setup

1. Create and activate a virtual environment.
2. Install the dependencies:

   ```bash
   pip install fastapi uvicorn python-dotenv requests
   ```

3. Export your API key so the service can talk to YouTube:

   ```bash
   export YOUTUBE_API_KEY="your-key"
   ```

4. Run the API locally:

   ```bash
   uvicorn backend.app:app --reload --port 8000
   ```

   The API exposes:

   - `GET /api/get-game-round` – fetch a fresh video with four candidate comments.
   - `POST /api/submit-guess` – score a guess and reveal the like counts.

## Frontend setup

1. Install dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Start the Vite dev server:

   ```bash
   npm run dev
   ```

3. Create a `.env` file in `frontend/` if you need to override the backend location. For example:

   ```bash
   VITE_API_BASE_URL=http://localhost:8000
   ```
