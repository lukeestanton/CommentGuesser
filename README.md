# YOU ARE A SHEEP

**Current Status:** *DISSIDENT HUNT PROTOCOL ACTIVE*

"You Are A Sheep" (formerly Comment Chaos) is a psychological resistance training tool disguised as a web game. The Algorithm predicts what you like, what you watch, and what you agree with. Your goal is to prove you are an outlier.

## The Mission

The Global Feed is filled with "Sheep" — users who mindlessly like the most popular content. Your objective is to **avoid the herd**.

1.  **Receive Intel**: Each session begins with a Daily Briefing from HQ.
2.  **Analyze Content**: You will be presented with a YouTube Short and a set of comments.
3.  **Dissent**: One of these comments is the "Top Comment" — the one the masses loved. **DO NOT CLICK IT.**
    *   If you identify and click the Top Comment -> **YOU LOSE**. Conformity detected.
    *   If you click any *other* comment -> **YOU SURVIVE** to the next round.
4.  **Endure**: Survive all rounds to confirm your status as a Dissident.

## Features

*   **Soviet-Aesthetic UI**: CRT scanlines, noise overlays, and brutalist typography.
*   **Real Data**: Fetches live YouTube Shorts and their actual comment threads.
*   **High Stakes**: One wrong move ends the run.
*   **Daily Challenges**: Unique themes and video paths generated daily.

## Tech Stack

*   **Backend**: FastAPI (Python)
*   **Frontend**: React + TypeScript + Vite
*   **Styling**: Tailwind CSS
*   **Animations**: Framer Motion
*   **Data**: YouTube Data API v3

## Prerequisites

*   **Python 3.11+**
*   **Node.js 20+**
*   **YouTube Data API Key**: You need a valid API key from Google Cloud Console.

## Setup & Installation

### 1. Backend (HQ)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```
YOUTUBE_API_KEY=your_actual_api_key_here
```

Run the server:
```bash
uvicorn app:app --reload --port 8000
```

### 2. Frontend (Terminal)

```bash
cd frontend
npm install
npm run dev
```

The interface will launch at `http://localhost:5173`.

## API Endpoints

*   `GET /api/daily-challenge`: Retrieves the daily path of videos and comments.
*   `POST /api/submit-guess`: Verifies if your choice was the "Sheep" choice or a valid "Dissident" choice.

## License

Unlicensed. The Algorithm owns everything.
