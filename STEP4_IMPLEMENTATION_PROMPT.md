# Step 4 Video Rendering & Export Implementation Prompt

## Context & Current State

This is a Next.js 14 UGC (User-Generated Content) video generator application. The app has 4 steps:
1. **Step 1**: Users upload demo videos (MP4/MOV files)
2. **Step 2**: Users select creator personas/styles
3. **Step 3**: Users configure product details and generate AI captions
4. **Step 4**: Users review variants and export (THIS IS WHAT NEEDS TO BE IMPLEMENTED)

## Current Problem with Step 4

The `Step4Review` component (`components/Step4Review.tsx`) currently:
- Shows a **placeholder gradient** instead of the actual uploaded video
- Displays captions as **overlay text** on the placeholder (not rendered into the video)
- Export button only exports JSON/CSV files (text data), not actual video files
- No way to preview the actual video with captions burned in

## What Needs to Be Implemented

### 1. Display Actual Videos in Preview

**Current code location**: `components/Step4Review.tsx`, lines 140-216

**What to change**:
- Replace the placeholder `<div>` (lines 150-161) with an actual `<video>` element
- The video source should come from the uploaded demo video
- Each variant has a `demoId` field that links to the original demo video
- The demo videos are stored in `experimentData.demos` array (passed from parent component)
- Each `DemoVideo` has:
  - `id`: matches `variant.demoId`
  - `url`: blob URL created from the uploaded file (`URL.createObjectURL(file)`)
  - `file`: the actual File object

**Implementation details**:
- Find the matching demo video: `const demoVideo = demos.find(d => d.id === variant.demoId)`
- Use `demoVideo.url` as the video source
- Make the video playable (controls, autoplay on hover, etc.)
- Maintain the 9:16 aspect ratio (vertical video format)

### 2. Render Captions as Overlay on Video Preview

**Current code location**: `components/Step4Review.tsx`, lines 184-215

**What to change**:
- Keep the caption overlay functionality (it's already working visually)
- But ensure it's positioned correctly over the actual video element
- The caption should use the `captionStyle` prop which has:
  - `textColor`: hex color for text
  - `backgroundColor`: rgba color for background
  - `fontSize`: number in pixels
  - `position`: 'top' | 'center' | 'bottom'

**Implementation details**:
- The overlay div should be positioned absolutely over the video
- Use the existing positioning logic (lines 190-192) but ensure it works with the video element
- Display the full caption text (not truncated) in the overlay
- Make sure the overlay doesn't interfere with video playback

### 3. Pass Demo Videos to Step4Review Component

**Current code location**: `app/page.tsx`, lines 114-120

**What to change**:
- The `Step4Review` component currently only receives `variants` and `captionStyle`
- It needs access to the `demos` array to find the matching video files
- Update the component props to include `demos: DemoVideo[]`

**Implementation details**:
```typescript
// In app/page.tsx, update Step4Review call:
<Step4Review
  variants={experimentData.variants}
  captionStyle={experimentData.captionStyle}
  demos={experimentData.demos}  // ADD THIS
  onUpdate={updateVariants}
  onBack={handleBack}
/>

// In components/Step4Review.tsx, update interface:
interface Step4ReviewProps {
  variants: Variant[]
  captionStyle: CaptionStyle
  demos: DemoVideo[]  // ADD THIS
  onUpdate: (variants: Variant[]) => void
  onBack: () => void
}
```

### 4. Export Actual Video Files with Captions Burned In

**Current code location**: `components/Step4Review.tsx`, lines 45-86

**What to change**:
- The `handleExport` function currently only exports text files (CSV/JSON)
- Need to implement actual video rendering with captions burned into the video
- When user clicks "Download videos + captions", it should:
  1. For each selected variant, render the demo video with the caption overlay
  2. Use a video rendering library (like `remotion`, `ffmpeg.wasm`, or `canvas` + `MediaRecorder`)
  3. Export as MP4 files that can be downloaded

**Recommended approach**:
- **Option A (Client-side)**: Use `ffmpeg.wasm` to render videos in the browser
  - Pros: No server needed, works offline
  - Cons: Large bundle size, slower processing
- **Option B (Server-side)**: Create API route that uses `ffmpeg` on the server
  - Pros: Faster, smaller client bundle
  - Cons: Requires server with ffmpeg installed
- **Option C (Hybrid)**: Use Canvas API + MediaRecorder for simple overlays
  - Pros: Native browser APIs, no dependencies
  - Cons: Limited video processing capabilities

**Implementation details for Option B (Recommended)**:
1. Create new API route: `app/api/render-video/route.ts`
2. Accept POST request with:
   - `demoId`: ID of the demo video
   - `caption`: Text to overlay
   - `captionStyle`: Style configuration
   - `subtitleEnabled`: Boolean
   - `subtitleStyle`: Subtitle style ID
3. Use `fluent-ffmpeg` or similar to:
   - Load the video file
   - Add text overlay with specified style
   - Render to MP4
   - Return the rendered video file
4. In `Step4Review`, when export is clicked:
   - Show loading state
   - For each selected variant, call the API
   - Download each rendered video file
   - Or create a ZIP file with all videos

**Alternative simpler approach (if server-side is complex)**:
- Use `remotion` library for client-side video rendering
- Or use `html2canvas` + `MediaRecorder` to record the video preview with overlay

### 5. Loading States & Error Handling

**What to add**:
- Show loading spinner when videos are being rendered/exported
- Handle errors gracefully (video not found, rendering failed, etc.)
- Show progress for batch exports (e.g., "Rendering 3 of 10 videos...")

## Data Structure Reference

### Variant Object
```typescript
{
  id: string
  demoId: string           // Links to DemoVideo.id
  demoName: string
  creatorTemplateId: string | null
  creatorName: string
  subtitleStyle: string | null
  subtitleEnabled: boolean
  hook: string
  caption: string          // The text to overlay on video
  hashtags: string
  cta: string
  thumbnail?: string
  selected: boolean
}
```

### DemoVideo Object
```typescript
{
  id: string               // Matches variant.demoId
  name: string
  url: string              // Blob URL: "blob:http://localhost:3000/..."
  file: File | null        // Original File object
  transcript?: string
  uploadedAt: Date
}
```

### CaptionStyle Object
```typescript
{
  textColor: string        // e.g., "#ffffff"
  backgroundColor: string  // e.g., "rgba(0, 0, 0, 0.7)"
  fontSize: number         // e.g., 16
  position: 'bottom' | 'center' | 'top'
}
```

## Technical Requirements

1. **Video Format**: Support MP4/MOV files (already handled in Step 1)
2. **Aspect Ratio**: Maintain 9:16 (vertical) format
3. **Caption Rendering**: 
   - Text should be readable (contrast, size)
   - Support multi-line captions
   - Respect position settings (top/center/bottom)
4. **Performance**: 
   - Lazy load videos (only load when visible)
   - Optimize video preview (don't load full quality for preview)
   - Batch export should show progress
5. **Browser Compatibility**: Support modern browsers (Chrome, Firefox, Safari, Edge)

## Files to Modify

1. `components/Step4Review.tsx` - Main component (display videos, export functionality)
2. `app/page.tsx` - Pass demos prop to Step4Review
3. `app/api/render-video/route.ts` - NEW FILE: Server-side video rendering endpoint
4. `package.json` - Add dependencies if needed (e.g., `fluent-ffmpeg`, `@ffmpeg/ffmpeg`, etc.)

## Testing Checklist

- [ ] Videos display correctly in preview (not placeholders)
- [ ] Captions overlay correctly on videos
- [ ] Caption styles (color, size, position) work correctly
- [ ] Export single video works
- [ ] Export multiple videos works
- [ ] Loading states show during export
- [ ] Error handling works (missing video, rendering failure)
- [ ] Exported videos have captions burned in
- [ ] Exported videos are playable in standard video players

## Additional Notes

- The app uses Next.js 14 with App Router
- All components are client-side ('use client')
- File uploads are stored as File objects in memory (not persisted to disk)
- Consider memory management for large video files
- For production, you may want to upload videos to cloud storage (S3, etc.) instead of keeping in memory






