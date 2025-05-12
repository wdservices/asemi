
"use client";

interface VideoPlayerProps {
  videoUrl: string;
  title?: string;
  onEnded?: () => void; // Callback for when video ends, for progress tracking
}

const VideoPlayer = ({ videoUrl, title = "Course Video" }: VideoPlayerProps) => {
  // Basic YouTube embed URL transformation
  let embedUrl = videoUrl;
  if (videoUrl.includes("youtube.com/watch?v=")) {
    const videoId = videoUrl.split("watch?v=")[1].split("&")[0];
    embedUrl = `https://www.youtube.com/embed/${videoId}`;
  } else if (videoUrl.includes("youtu.be/")) {
    const videoId = videoUrl.split("youtu.be/")[1].split("?")[0];
    embedUrl = `https://www.youtube.com/embed/${videoId}`;
  }
  // Add more providers like Vimeo if needed

  return (
    <div className="aspect-video w-full bg-black rounded-lg overflow-hidden shadow-lg">
      <iframe
        src={embedUrl}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="w-full h-full"
      ></iframe>
    </div>
  );
};

export default VideoPlayer;