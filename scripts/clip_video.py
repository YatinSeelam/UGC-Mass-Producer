#!/usr/bin/env python3
"""
Clips AI integration script for video clipping
This script uses Clips AI to transcribe and find clips in long videos
"""

import sys
import json
import os
from pathlib import Path

try:
    from clipsai import ClipFinder, Transcriber
except ImportError:
    print(json.dumps({"error": "clipsai not installed. Please run: pip install clipsai"}))
    sys.exit(1)


def transcribe_and_find_clips(video_path: str):
    """
    Transcribe a video and find clips using Clips AI
    
    Args:
        video_path: Path to the video file
        
    Returns:
        Dictionary with transcription and clips data
    """
    try:
        # Check if file exists
        if not os.path.exists(video_path):
            return {
                "error": f"Video file not found: {video_path}"
            }
        
        # Initialize transcriber
        print("Starting transcription...", file=sys.stderr)
        transcriber = Transcriber()
        
        # Transcribe the video
        transcription = transcriber.transcribe(audio_file_path=video_path)
        
        # Initialize clip finder
        print("Finding clips...", file=sys.stderr)
        clipfinder = ClipFinder()
        
        # Find clips
        clips = clipfinder.find_clips(transcription=transcription)
        
        # Format clips data
        clips_data = []
        for i, clip in enumerate(clips):
            clips_data.append({
                "id": i + 1,
                "start_time": clip.start_time,
                "end_time": clip.end_time,
                "duration": clip.end_time - clip.start_time,
            })
        
        # Get transcription segments if available
        segments = []
        if hasattr(transcription, 'segments'):
            for segment in transcription.segments:
                segments.append({
                    "start": segment.get('start', 0),
                    "end": segment.get('end', 0),
                    "text": segment.get('text', ''),
                })
        
        return {
            "success": True,
            "clips": clips_data,
            "segments": segments,
            "total_clips": len(clips_data),
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "error_type": type(e).__name__
        }


def main():
    """Main entry point for the script"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python clip_video.py <video_path>"}))
        sys.exit(1)
    
    video_path = sys.argv[1]
    
    result = transcribe_and_find_clips(video_path)
    
    # Output JSON result
    print(json.dumps(result, indent=2))
    
    if "error" in result:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()




