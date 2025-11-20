import { useState, useEffect } from 'react';
import { getDailyChallenge, submitRank } from './api';
import type { DailyChallengeData, RankingResult } from './api';
import { DailyBriefing } from './components/DailyBriefing';
import { VideoPlayer } from './components/VideoPlayer';
import { BlindRanker } from './components/BlindRanker';
import { AfterActionReport } from './components/AfterActionReport';

function App() {
  const [gameState, setGameState] = useState<'briefing' | 'playing' | 'results'>('briefing');
  const [challengeData, setChallengeData] = useState<DailyChallengeData | null>(null);
  const [results, setResults] = useState<RankingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDailyChallenge();
  }, []);

  const fetchDailyChallenge = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDailyChallenge();
      setChallengeData(data);
    } catch (error) {
      console.error("Failed to fetch challenge", error);
      setError("Failed to establish secure connection to HQ.");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (challengeData) {
        setGameState('playing');
    } else {
        fetchDailyChallenge();
    }
  };

  const handleRankingComplete = async (ranking: string[]) => {
    if (!challengeData) return;
    
    setLoading(true);
    try {
      const res = await submitRank(challengeData.roundId, ranking);
      setResults(res);
      setGameState('results');
    } catch (error) {
      console.error("Failed to submit rank", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
     setGameState('briefing');
     setResults(null);
     setChallengeData(null);
     fetchDailyChallenge();
  };

  return (
    <div className="min-h-screen bg-soviet-charcoal text-soviet-cream font-body overflow-hidden relative">
      {/* Global Overlays */}
      <div className="scanlines"></div>
      <div className="noise-overlay"></div>

      {gameState === 'briefing' && (
        <DailyBriefing 
            onStart={handleStart} 
            theme={challengeData?.theme || null} 
            loading={loading} 
            error={error}
        />
      )}

      {gameState === 'playing' && challengeData && (
        <>
            <VideoPlayer videoLink={challengeData.videoLink} />
            <div className="relative z-20">
                <BlindRanker 
                    comments={challengeData.comments} 
                    onComplete={handleRankingComplete} 
                />
            </div>
        </>
      )}

      {gameState === 'results' && results && (
        <AfterActionReport result={results} onRestart={handleRestart} />
      )}
    </div>
  );
}

export default App;
