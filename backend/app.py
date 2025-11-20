from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.get_shorts import (
    InvalidGuessError,
    RoundNotFoundError,
    evaluate_guess,
    evaluate_ranking,
    get_game_round_data,
    get_ranking_round_data,
)
from services.theme_manager import get_daily_theme

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"Hello": "From the CommentGuesser API"}


@app.get("/api/get-game-round")
def get_game_round():
    game_data = get_game_round_data()
    return game_data


class GuessPayload(BaseModel):
    roundId: str
    commentId: str


@app.post("/api/submit-guess")
def submit_guess(payload: GuessPayload):
    try:
        result = evaluate_guess(payload.roundId, payload.commentId)
        return result
    except RoundNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except InvalidGuessError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/daily-challenge")
def get_daily_challenge():
    try:
        theme = get_daily_theme()
        round_data = get_ranking_round_data(theme)
        return round_data
    except Exception as e:
        print(f"Error getting daily challenge: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate daily challenge.")


class RankingPayload(BaseModel):
    roundId: str
    userRanking: List[str] # List of comment IDs


@app.post("/api/submit-rank")
def submit_rank(payload: RankingPayload):
    try:
        result = evaluate_ranking(payload.roundId, payload.userRanking)
        return result
    except RoundNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except InvalidGuessError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
