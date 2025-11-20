import React from 'react';

interface VideoPlayerProps {
  videoLink: string;
  onEnded?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoLink }) => {
  const videoId = videoLink.split('v=')[1];
  
  return (
    <div className="fixed inset-y-0 left-0 w-1/2 z-0 overflow-hidden bg-black">
        <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]"></div>
        
        <div className="absolute inset-0 bg-soviet-red mix-blend-overlay opacity-10 z-10 pointer-events-none"></div>

      <iframe
        className="w-full h-full object-contain"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&disablekb=1&fs=0&loop=1&modestbranding=1&playsinline=1&rel=0&showinfo=0&mute=0&playlist=${videoId}`}
        title="Background Video"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    </div>
  );
};
