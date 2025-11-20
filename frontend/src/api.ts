import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export interface Comment {
  id: string;
  text: string;
  likes?: number;
  isCorrect?: boolean;
}

export interface DailyChallengeData {
  roundId: string;
  videoLink: string;
  theme: string;
  comments: Comment[];
}

export interface RankingResult {
  score: number;
  userRanking: string[];
  correctRanking: Comment[];
}

export const getDailyChallenge = async (): Promise<DailyChallengeData> => {
  const response = await axios.get(`${API_URL}/daily-challenge`);
  return response.data;
};

export const submitRank = async (roundId: string, userRanking: string[]): Promise<RankingResult> => {
  const response = await axios.post(`${API_URL}/submit-rank`, {
    roundId,
    userRanking,
  });
  return response.data;
};

