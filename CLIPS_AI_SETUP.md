# Clips AI Setup Guide

This project uses Clips AI to automatically segment long videos into clips using AI-powered transcription.

## Prerequisites

1. **Python 3.8+** - Make sure Python 3 is installed on your system
2. **FFmpeg** - Required for video processing
3. **libmagic** - Required for file type detection

## Installation Steps

### 1. Install Python Dependencies

We highly recommend using a virtual environment to avoid dependency conflicts:

```bash
# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install Clips AI and dependencies
pip install -r requirements.txt
```

Or install directly:

```bash
pip install clipsai
pip install git+https://github.com/m-bain/whisperx.git
```

### 2. Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows:**
Download from [FFmpeg website](https://ffmpeg.org/download.html) and add to PATH

### 3. Install libmagic

**macOS:**
```bash
brew install libmagic
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install libmagic1
```

**Windows:**
```bash
pip install python-magic-bin
```

### 4. Configure Python Command (Optional)

If your Python command is not `python3`, you can set an environment variable:

```bash
# In your .env.local file
PYTHON_COMMAND=python3
```

Or if you're using a virtual environment:

```bash
PYTHON_COMMAND=/path/to/venv/bin/python
```

## Testing the Setup

You can test if Clips AI is working by running the Python script directly:

```bash
python3 scripts/clip_video.py /path/to/your/video.mp4
```

## Usage

1. Navigate to the "Clip Long Videos" section on the dashboard
2. Upload a long-form video (podcasts, interviews, speeches, etc.)
3. Click "Find Clips" to automatically segment the video
4. Review the generated clips with their start/end times

## Troubleshooting

### "Python not found" error
- Make sure Python 3 is installed and in your PATH
- Try setting `PYTHON_COMMAND` in `.env.local` to your Python path

### "clipsai not installed" error
- Make sure you've installed the Python dependencies
- Check that you're using the correct Python environment

### "FFmpeg not found" error
- Install FFmpeg and ensure it's in your system PATH
- Test by running `ffmpeg -version` in your terminal

### Processing takes too long
- Large videos may take several minutes to process
- The API has a 5-minute timeout
- Consider processing shorter videos or splitting them first

## Notes

- Clips AI is designed for audio-centric, narrative-based videos
- The clipping algorithm analyzes transcripts to identify natural clip segments
- Processing time depends on video length and system performance




