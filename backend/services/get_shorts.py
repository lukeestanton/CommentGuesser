from dotenv import load_dotenv

load_dotenv()

import os
import random
from typing import Dict, List
from uuid import uuid4

import requests

API_KEY = os.getenv("YOUTUBE_API_KEY")

if not API_KEY:
    raise EnvironmentError("YOUTUBE_API_KEY env variable not set.")

SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
COMMENT_THREAD_URL = "https://www.googleapis.com/youtube/v3/commentThreads"

VIDEO_LINK = "https://www.youtube.com/watch?v="

ROUND_CACHE: Dict[str, Dict] = {}


class RoundNotFoundError(Exception):
    """Raised when the round identifier cannot be located."""


class InvalidGuessError(Exception):
    """Raised when a guess references a comment outside of the round."""


def _get_random_short():
    search_terms = [
        "ludwig",
        "jschlatt",
        "squeex",
        "sambucha",
    ]

    params = {
        "part": "snippet",
        "q": random.choice(search_terms),
        "key": API_KEY,
        "maxResults": 200,  # Change to 1000 once db is setup
        "type": "video",
        "videoDuration": "short",
        "order": "viewCount",
    }

    response = requests.get(SEARCH_URL, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    random_video = random.choice(data.get("items", []))

    video_id = random_video["id"]["videoId"]
    title = random_video["snippet"]["title"]

    return video_id, title


def _get_top_comments(video_id: str, max_comments: int = 10) -> List[Dict]:
    params = {
        "part": "snippet",
        "videoId": video_id,
        "key": API_KEY,
        "order": "relevance",
        "maxResults": max_comments,
        "textFormat": "plainText",
    }

    comments: List[Dict] = []
    try:
        response = requests.get(COMMENT_THREAD_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        for item in data.get("items", []):
            top_level_comment = item["snippet"]["topLevelComment"]
            snippet = top_level_comment["snippet"]
            comment_text = snippet.get("textDisplay", "").strip()
            like_count = snippet.get("likeCount", 0)
            comment_id = top_level_comment.get("id")

            if not comment_text or not comment_id:
                continue

            comments.append({
                "id": comment_id,
                "text": comment_text,
                "points": like_count,
            })

        sorted_comments = sorted(
            comments, key=lambda item: item.get("points", 0), reverse=True
        )

        return sorted_comments

    except requests.exceptions.HTTPError as e:
        if e.response is not None and "disabledComments" in str(e.response.content):
            print(f"Comments are disabled for video {video_id}. Trying a new video.")
            return []
        raise


def get_game_round_data():
    """Fetch a random short with enough comments to form a guessing round."""

    while True:
        video_id, title = _get_random_short()
        print(f"Attempting to fetch comments for video: {title} (ID: {video_id})")

        comments = _get_top_comments(video_id)

        if not comments or len(comments) < 2:
            continue

        top_comment = comments[0]
        distractor_pool = [comment for comment in comments[1:] if comment["text"].strip()]

        if len(distractor_pool) < 1:
            continue

        distractors = random.sample(distractor_pool, 1)
        options = distractors + [top_comment]
        random.shuffle(options)

        round_id = str(uuid4())
        ROUND_CACHE[round_id] = {
            "video_id": video_id,
            "video_link": VIDEO_LINK + video_id,
            "title": title,
            "correct_comment_id": top_comment["id"],
            "options": options,
        }

        # Keep cache from growing unbounded
        if len(ROUND_CACHE) > 50:
            oldest_key = next(iter(ROUND_CACHE))
            ROUND_CACHE.pop(oldest_key, None)

        return {
            "roundId": round_id,
            "videoLink": VIDEO_LINK + video_id,
            "options": [
                {"commentId": option["id"], "text": option["text"]}
                for option in options
            ],
        }


def evaluate_guess(round_id: str, comment_id: str):
    round_payload = ROUND_CACHE.get(round_id)

    if not round_payload:
        raise RoundNotFoundError("Round not found or has expired.")

    option_lookup = {option["id"]: option for option in round_payload["options"]}

    if comment_id not in option_lookup:
        raise InvalidGuessError("Selected comment is not part of this round.")

    correct_comment_id = round_payload["correct_comment_id"]
    is_correct = comment_id == correct_comment_id

    revealed_options = [
        {
            "commentId": option["id"],
            "text": option["text"],
            "likes": option["points"],
            "isCorrect": option["id"] == correct_comment_id,
        }
        for option in round_payload["options"]
    ]

    revealed_options.sort(key=lambda option: option["likes"], reverse=True)

    correct_option = next(option for option in revealed_options if option["isCorrect"])

    ROUND_CACHE.pop(round_id, None)

    return {
        "isCorrect": is_correct,
        "selectedOptionId": comment_id,
        "options": revealed_options,
    }
