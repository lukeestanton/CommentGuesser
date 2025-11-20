from dotenv import load_dotenv

load_dotenv()

import os
import random
from typing import Dict, List, Optional
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


def _get_random_short(query: Optional[str] = None):
    default_search_terms = [
        "ludwig",
        "jschlatt",
        "squeex",
        "sambucha",
    ]
    
    search_query = query if query else random.choice(default_search_terms)

    params = {
        "part": "snippet",
        "q": search_query,
        "key": API_KEY,
        "maxResults": 50, 
        "type": "video",
        "videoDuration": "short",
        "order": "viewCount",
    }

    response = requests.get(SEARCH_URL, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()
    
    items = data.get("items", [])
    if not items:
        if query:
             print(f"No videos found for query '{query}'. Falling back to random.")
             return _get_random_short(None)
        return None, None

    random_video = random.choice(items)

    video_id = random_video["id"]["videoId"]
    title = random_video["snippet"]["title"]

    return video_id, title


def _get_top_comments(video_id: str, max_comments: int = 20) -> List[Dict]:
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
            
            if len(comment_text) < 5:
                continue

            comments.append({
                "id": comment_id,
                "text": comment_text,
                "points": like_count,
            })

        return comments

    except requests.exceptions.HTTPError as e:
        if e.response is not None:
            if e.response.status_code == 403 or "disabledComments" in str(e.response.content):
                print(f"Comments are disabled or forbidden for video {video_id}. Skipping.")
                return []
        raise


def get_game_round_data():
    """Fetch a random short with enough comments to form a guessing round."""

    while True:
        video_id, title = _get_random_short()
        if not video_id:
            continue
            
        print(f"Attempting to fetch comments for video: {title} (ID: {video_id})")

        comments = _get_top_comments(video_id)
        
        if not comments or len(comments) < 5: 
            continue
        
        sorted_comments = sorted(comments, key=lambda x: x["points"], reverse=True)

        top_comment = sorted_comments[0]
        
        other_comments = [c for c in sorted_comments[1:]]
        if not other_comments:
            continue
            
        distractor = random.choice(other_comments)
        
        options = [top_comment, distractor]
        random.shuffle(options)

        round_id = str(uuid4())
        ROUND_CACHE[round_id] = {
            "type": "guess_top",
            "video_id": video_id,
            "video_link": VIDEO_LINK + video_id,
            "title": title,
            "correct_comment_id": top_comment["id"],
            "options": options,
        }

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


def get_ranking_round_data(theme: str):
    """
    Fetch a short based on the theme and 5 comments for ranking.
    """
    attempts = 0
    while attempts < 10:
        attempts += 1
        video_id, title = _get_random_short(query=theme)
        if not video_id:
            continue

        print(f"Ranking Round: Fetching comments for {title} (Theme: {theme})")
        try:
            all_comments = _get_top_comments(video_id, max_comments=50)
        except Exception as e:
             print(f"Error fetching comments for {video_id}: {e}")
             continue

        if not all_comments:
             continue

        seen_text = set()
        unique_comments = []
        for c in all_comments:
            if c["text"] not in seen_text:
                unique_comments.append(c)
                seen_text.add(c["text"])

        if len(unique_comments) < 5:
            print(f"Not enough unique comments ({len(unique_comments)}) for {video_id}")
            continue
            
        selected_comments = random.sample(unique_comments[:20], 5)
        
        round_id = str(uuid4())
        ROUND_CACHE[round_id] = {
            "type": "ranking",
            "video_id": video_id,
            "video_link": VIDEO_LINK + video_id,
            "theme": theme,
            "comments": selected_comments,
        }
        
        if len(ROUND_CACHE) > 50:
             oldest_key = next(iter(ROUND_CACHE))
             ROUND_CACHE.pop(oldest_key, None)

        shuffled_options = selected_comments.copy()
        random.shuffle(shuffled_options)
        
        return {
            "roundId": round_id,
            "videoLink": VIDEO_LINK + video_id,
            "theme": theme,
            "comments": [
                {"id": c["id"], "text": c["text"]} 
                for c in shuffled_options
            ]
        }
    
    raise Exception("Failed to find a valid video for the daily theme after multiple attempts.")


def evaluate_guess(round_id: str, comment_id: str):
    round_payload = ROUND_CACHE.get(round_id)

    if not round_payload:
        raise RoundNotFoundError("Round not found or has expired.")
    
    if round_payload.get("type") == "ranking":
         raise InvalidGuessError("This round is a ranking round, use submit_rank instead.")

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

    ROUND_CACHE.pop(round_id, None)

    return {
        "isCorrect": is_correct,
        "selectedOptionId": comment_id,
        "options": revealed_options,
    }

def evaluate_ranking(round_id: str, user_ranking: List[str]):
    """
    user_ranking: List of comment IDs in order from 1st place (most likes) to 5th place (least likes).
    """
    round_payload = ROUND_CACHE.get(round_id)
    if not round_payload:
        raise RoundNotFoundError("Round not found or has expired.")

    if round_payload.get("type") != "ranking":
         raise InvalidGuessError("This round is not a ranking round.")
         
    real_comments = round_payload["comments"]
    sorted_real = sorted(real_comments, key=lambda x: x["points"], reverse=True)
    
    correct_order_ids = [c["id"] for c in sorted_real]
    
    total_deviation = 0
    for predicted_rank, comment_id in enumerate(user_ranking):
        try:
            actual_rank = correct_order_ids.index(comment_id)
            deviation = abs(predicted_rank - actual_rank)
            total_deviation += deviation
        except ValueError:
             pass
             
    normalized_score = max(0, 100 - (total_deviation * 8.33))
    
    ROUND_CACHE.pop(round_id, None)
    
    return {
        "score": int(normalized_score),
        "userRanking": user_ranking,
        "correctRanking": [
            {"id": c["id"], "text": c["text"], "likes": c["points"]}
            for c in sorted_real
        ]
    }
