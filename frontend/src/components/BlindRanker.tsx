import React, { useState } from 'react';
import { useDraggable, useDroppable, DndContext } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import type { Comment } from '../api';
import clsx from 'clsx';

interface BlindRankerProps {
  comments: Comment[];
  onComplete: (ranking: string[]) => void;
}

const DraggableCard = ({ comment }: { comment: Comment }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: comment.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${isDragging ? 5 : 0}deg)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={clsx(
        "w-full max-w-sm bg-soviet-cream text-soviet-charcoal p-6 shadow-xl border-2 border-soviet-charcoal cursor-grab active:cursor-grabbing",
        isDragging ? "z-50" : "z-20"
      )}
    >
      <div className="font-soviet text-xl mb-2 text-soviet-red uppercase">Comment Intel</div>
      <p className="font-body font-bold text-lg leading-tight line-clamp-4">
        "{comment.text}"
      </p>
    </div>
  );
};

const DroppableSlot = ({ rank, filled }: { rank: number; filled: boolean }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `rank-${rank}`,
    disabled: filled,
  });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "h-24 w-full border-4 border-dashed flex items-center justify-center transition-colors relative overflow-hidden bg-soviet-charcoal/50",
        filled ? "border-soviet-red bg-soviet-cream text-soviet-charcoal border-solid" : 
        isOver ? "border-soviet-red bg-red-900/40" : "border-soviet-cream/50 text-soviet-cream/50"
      )}
    >
        <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
            <span className="font-soviet text-4xl opacity-50">#{rank}</span>
            {filled && <span className="font-soviet text-xl text-soviet-red uppercase -rotate-12 border-2 border-soviet-red px-2">Locked</span>}
        </div>
    </div>
  );
};

export const BlindRanker: React.FC<BlindRankerProps> = ({ comments, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [placements, setPlacements] = useState<(Comment | null)[]>([null, null, null, null, null]);

  const currentComment = comments[currentIndex];

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;

    if (over && over.id.toString().startsWith('rank-')) {
      const rankIndex = parseInt(over.id.toString().split('-')[1]) - 1;
      
      if (!placements[rankIndex]) {
        const newPlacements = [...placements];
        newPlacements[rankIndex] = currentComment;
        setPlacements(newPlacements);
        
        if (currentIndex < comments.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            const finalRanking = newPlacements.map(p => p ? p.id : "");
            onComplete(finalRanking);
        }
      }
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="relative z-20 w-full h-screen flex items-center">
        
        <div className="w-1/2 h-full ml-auto bg-soviet-charcoal border-l-4 border-soviet-red p-8 flex flex-col justify-center gap-12 shadow-2xl">
            
            <div className="flex flex-row gap-8 items-start justify-center">
                <div className="flex-1 flex flex-col items-center justify-center relative h-80">
                <AnimatePresence mode='wait'>
                    {currentComment && (
                    <motion.div
                        key={currentComment.id}
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="absolute w-full max-w-sm"
                    >
                        <DraggableCard comment={currentComment} />
                    </motion.div>
                    )}
                    {!currentComment && (
                        <div className="text-soviet-cream font-soviet text-2xl animate-pulse">Transmission Complete...</div>
                    )}
                </AnimatePresence>
                <div className="mt-72 text-center">
                    <div className="text-soviet-red font-soviet text-xl">Incoming... {comments.length - currentIndex} Remaining</div>
                </div>
                </div>

                <div className="flex-1 w-full max-w-md flex flex-col gap-4 bg-soviet-charcoal p-4 rounded-sm border-2 border-soviet-cream">
                    <h2 className="text-soviet-cream font-soviet text-3xl text-center mb-4 uppercase tracking-widest text-shadow-sm">Rank by Likes</h2>
                    {[1, 2, 3, 4, 5].map((rank) => (
                        <div key={rank} className="relative">
                            {placements[rank-1] ? (
                                <div className="h-24 w-full bg-soviet-cream border-4 border-soviet-red flex items-center px-4 relative">
                                    <span className="font-soviet text-4xl text-soviet-charcoal mr-4">#{rank}</span>
                                    <p className="font-body font-bold text-sm text-soviet-charcoal line-clamp-2 leading-tight">
                                        {placements[rank-1]?.text}
                                    </p>
                                </div>
                            ) : (
                                <DroppableSlot rank={rank} filled={false} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

        </div>
      </div>
    </DndContext>
  );
};
