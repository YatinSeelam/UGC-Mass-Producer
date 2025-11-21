# UGC Generator MVP

A Next.js application for generating UGC (User Generated Content) video variants with AI-generated captions.

## Features

- **Step 1**: Upload one or more product demo videos
- **Step 2**: Select 0-3 creator templates (UGC personas)
- **Step 3**: Configure product details, audience, tone, and subtitle styles
- **Step 4**: Review and export all generated video variants with captions

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory:
```
OPENAI_API_KEY=your_openai_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `app/` - Next.js app directory with pages and API routes
- `components/` - React components for each step
- `types/` - TypeScript type definitions
- `app/api/transcribe/` - API route for video transcription (placeholder for now)
- `app/api/generate-captions/` - API route for ChatGPT caption generation

## Notes

- The transcription API currently returns a placeholder. You'll need to integrate a real transcription service (e.g., OpenAI Whisper) for production.
- Video rendering is not yet implemented - the app currently generates and exports captions only.
- All videos are processed in 9:16 format (1080×1920) as specified in the MVP requirements.






