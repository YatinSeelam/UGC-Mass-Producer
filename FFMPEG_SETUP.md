# FFmpeg Setup Instructions

The video rendering API requires FFmpeg to be installed on your system. Follow the instructions below for your operating system.

## macOS

```bash
brew install ffmpeg
```

## Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

## Linux (CentOS/RHEL)

```bash
sudo yum install ffmpeg
```

## Windows

1. Download FFmpeg from: https://ffmpeg.org/download.html
2. Extract the zip file
3. Add the `bin` folder to your system PATH:
   - Open System Properties → Environment Variables
   - Add the path to FFmpeg's `bin` folder to the PATH variable
4. Restart your terminal/IDE

## Verify Installation

After installing, verify FFmpeg is available:

```bash
ffmpeg -version
```

You should see version information. If you get a "command not found" error, FFmpeg is not properly installed or not in your PATH.

## Troubleshooting

- **"FFmpeg not found" error**: Make sure FFmpeg is installed and in your system PATH
- **Permission errors**: On Linux/macOS, you may need to use `sudo` for installation
- **Node.js can't find FFmpeg**: Restart your development server after installing FFmpeg


