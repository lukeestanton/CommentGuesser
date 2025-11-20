import React from 'react';
import type { RankingResult } from '../api';
import { motion } from 'framer-motion';

interface AfterActionReportProps {
  result: RankingResult;
  onRestart: () => void;
}

export const AfterActionReport: React.FC<AfterActionReportProps> = ({ result, onRestart }) => {
  const { score, userRanking, correctRanking } = result;
  
  const getDeviation = (commentId: string, actualRankIndex: number) => {
    const userRankIndex = userRanking.indexOf(commentId);
    return userRankIndex - actualRankIndex;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-soviet-charcoal/95 relative z-30 p-4 overflow-y-auto">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-4xl w-full bg-soviet-cream text-soviet-charcoal p-8 shadow-2xl border-4 border-soviet-red"
      >
        <div className="flex justify-between items-start mb-8 border-b-4 border-soviet-charcoal pb-4">
            <div>
                <h1 className="text-5xl md:text-7xl font-soviet text-soviet-charcoal uppercase">Report</h1>
                <div className="text-xl font-mono">Date: {new Date().toLocaleDateString()}</div>
            </div>
            <div className="text-right">
                 <div className="text-2xl font-soviet uppercase text-soviet-red">Score</div>
                 <div className="text-6xl font-soviet">{score}/100</div>
            </div>
        </div>

        <div className="space-y-4 mb-8">
            <div className="grid grid-cols-12 gap-2 font-soviet text-xl border-b-2 border-soviet-charcoal pb-2">
                <div className="col-span-1">#</div>
                <div className="col-span-7">Comment</div>
                <div className="col-span-2 text-right">Likes</div>
                <div className="col-span-2 text-center">Diff</div>
            </div>
            
            {correctRanking.map((comment, index) => {
                const deviation = getDeviation(comment.id, index);
                const userRank = userRanking.indexOf(comment.id) + 1;
                
                return (
                    <div key={comment.id} className="grid grid-cols-12 gap-2 items-center border-b border-gray-300 py-2">
                        <div className="col-span-1 font-soviet text-2xl">{index + 1}</div>
                        <div className="col-span-7 font-body text-sm font-bold leading-tight">
                            {comment.text}
                            <div className="text-xs text-gray-500 mt-1">
                                You ranked: #{userRank}
                            </div>
                        </div>
                        <div className="col-span-2 text-right font-mono">
                            {comment.likes?.toLocaleString()}
                        </div>
                        <div className="col-span-2 text-center">
                            {deviation === 0 ? (
                                <span className="bg-green-600 text-white px-2 py-1 text-xs font-bold uppercase">Perfect</span>
                            ) : (
                                <span className={`px-2 py-1 text-xs font-bold uppercase ${Math.abs(deviation) > 2 ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black'}`}>
                                    {deviation > 0 ? `-${deviation}` : `+${Math.abs(deviation)}`}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="flex justify-center">
             <button 
                onClick={onRestart}
                className="bg-soviet-charcoal text-soviet-cream font-soviet text-2xl px-8 py-4 uppercase hover:bg-black transition-colors"
             >
                Re-Deploy
             </button>
        </div>
        
      </motion.div>
    </div>
  );
};

