# UGC Generator - Complete Flow Documentation

## Overview
The UGC Generator is a 4-step workflow application that helps users create User-Generated Content (UGC) videos with AI-generated captions. Users upload demo videos, select creator personas, generate captions, customize them, and export the final clips.

---

## **STEP 1: UPLOAD** 📤

### **User Actions:**
1. **Upload Video Files**
   - User clicks the upload area or drags & drops video files
   - Can upload multiple video files
   - Supported formats: MP4, MOV, AVI, etc.

2. **Video Processing**
   - Each uploaded video is automatically processed:
     - File is read and stored in browser memory
     - Video URL is created using `URL.createObjectURL()`
     - Video metadata is extracted (duration, dimensions)
     - Aspect ratio is detected (9:16 portrait or 16:9 landscape)

3. **Transcription (Background)**
   - When a video is uploaded, it's automatically sent to `/api/transcribe`
   - Currently returns a placeholder transcript
   - In production, would use OpenAI Whisper API or similar
   - Transcript is stored with the video for caption generation

4. **Video Preview & Management**
   - Each uploaded video appears as a thumbnail card
   - User can:
     - **Play/Pause** the video in the thumbnail
     - **Seek** through the video using progress bar
     - **Mute/Unmute** audio
     - **Remove** videos they don't want
   - Videos are displayed in a grid layout

5. **Navigation**
   - Click **"Next"** button to proceed to Step 2
   - Button is enabled once at least one video is uploaded

### **Data Stored:**
```typescript
demos: DemoVideo[] = [
  {
    id: string,              // Unique ID
    name: string,            // File name
    url: string,             // Blob URL
    file: File,              // Original file object
    transcript?: string,     // Generated transcript
    uploadedAt: Date        // Upload timestamp
  }
]
```

### **State Management:**
- Videos stored in parent component (`experimentData.demos`)
- Updated via `updateDemos()` callback
- Persists across step navigation

---

## **STEP 2: CREATORS** 👥

### **User Actions:**
1. **Browse Creator Templates**
   - User sees a carousel of creator persona templates
   - Each template shows:
     - Creator name (e.g., "Female – Hype", "Male – Gym Bro")
     - Preview video/image
     - Description of the persona style

2. **Select Creators**
   - User can select **1-3 creator personas**
   - Click on a creator card to toggle selection
   - Selected creators are highlighted
   - Maximum of 3 creators can be selected
   - If 3 are selected, other creators are disabled

3. **Creator Personas Available:**
   - **Female – Hype**: Energetic, Gen-Z friendly, uses trending slang, enthusiastic
   - **Female – Calm Aesthetic**: Minimalist, trustworthy, soothing tone
   - **Male – Gym Bro**: Fitness-focused, direct, motivational, results-driven
   - **Neutral**: Professional, balanced brand voice

4. **Navigation**
   - Click **"Back"** to return to Step 1
   - Click **"Next"** to proceed to Step 3

### **Data Stored:**
```typescript
selectedCreators: string[] = [
  'female-hype',    // Example: Selected creator IDs
  'male-gym',
  // etc.
]
```

### **State Management:**
- Selected creators stored in `experimentData.selectedCreators`
- Updated via `updateSelectedCreators()` callback
- Used in Step 3 to generate captions with different personas

---

## **STEP 3: CONFIGURE & GENERATE** ⚙️

### **Layout:**
The step is divided into **3 columns**:
- **Left**: Video Preview with live caption overlay
- **Center**: Generated Captions list
- **Right**: Configuration panel (Prompt, Settings, Style controls)

### **User Actions:**

#### **A. Enter Product Description (Prompt)**
1. User types a description of their product/service in the textarea
2. This prompt is used by AI to generate relevant captions
3. Example: "A fitness app that helps you track workouts and nutrition"

#### **B. Configure Settings**
1. **Number of Captions** (`# Captions`)
   - User selects how many captions to generate (1-10)
   - Default: 3
   - This determines how many variants are created

2. **Caption Style Settings**
   - **Text Color**: Color picker for caption text
   - **Font**: Font family selector (System Default, Arial, Helvetica, Georgia)
   - **Background Toggle**: Enable/disable caption background
   - **Background Color**: If enabled, color picker for background
   - **Background Opacity**: Slider (0-100%) to control transparency

3. **Caption Position** (via Preview)
   - User can **drag** the caption in the preview to reposition it
   - User can **resize** the caption by dragging corner handles
   - User can **rotate** the caption using the rotation handle
   - Changes update in real-time in the preview

#### **C. Generate Captions**
1. User clicks **"Generate"** button
2. **API Call**: `POST /api/generate-captions`
   - Sends:
     - Demo videos (with transcripts)
     - Selected creators
     - Product description
     - Number of captions per combo
     - Caption length preference
   
3. **Backend Processing**:
   - Creates tasks for each combination:
     - For each demo video
     - For each selected creator
     - For each caption number (1 to numCaptions)
   - Example: 1 demo × 2 creators × 3 captions = 6 tasks
   
4. **AI Generation** (Parallel):
   - Each task calls OpenAI GPT-4o-mini
   - Uses different "angles" for each caption to ensure uniqueness:
     - Problem-focused
     - Transformation-focused
     - Question-based
     - Bold claim
     - Humor
     - Urgency/FOMO
     - Story-based
     - Comparison
     - Emotional appeal
     - Surprising fact
   - Each caption uses the creator's persona style
   - Returns JSON with caption text

5. **Results Display**:
   - Generated captions appear in the center panel
   - Each caption is displayed as a card
   - User can see all generated captions

#### **D. Manage Captions**
1. **Select Caption**
   - Click on a caption card to preview it
   - Selected caption appears in the left preview with overlay
   - Preview updates in real-time

2. **Edit Caption**
   - Click **pencil icon** on a caption
   - Caption becomes editable (textarea)
   - User can modify the text
   - Press **Enter** or click outside to save
   - Preview updates immediately

3. **Delete Caption**
   - Click **X icon** on a caption
   - Caption is removed from the list
   - If it was selected, first remaining caption becomes selected

4. **Regenerate Caption**
   - Click **refresh icon** on a caption
   - Calls API again to generate a new caption for that slot
   - Replaces the existing caption text
   - Maintains the same creator persona

#### **E. Customize Caption Style (Live Preview)**
1. **Position Caption**:
   - Click and drag the caption box in the preview
   - Position updates in real-time
   - Coordinates stored as percentages (xPercent, yPercent)

2. **Resize Caption**:
   - Drag corner handles to resize
   - Font size scales proportionally
   - Width percentage updates

3. **Rotate Caption**:
   - Drag the rotation handle (below caption)
   - Rotation angle updates in degrees
   - Caption rotates in real-time

4. **Style Changes**:
   - All style changes (color, background, opacity) update immediately
   - Preview reflects changes in real-time
   - Changes are stored in `captionStyle` state

#### **F. Navigate to Review**
1. Click **"Next"** button
2. **Variant Creation**:
   - If variants already exist: Updates existing variants with current caption text
   - If new: Creates variants from captions
   - Each variant includes:
     - Demo video reference
     - Creator template reference
     - Caption text
     - Caption style settings
     - Selection status (all selected by default)

3. **State Transfer**:
   - Variants passed to parent via `onGenerate()`
   - Navigates to Step 4 (Review)

### **Data Stored:**
```typescript
generatedCaptions: GeneratedCaption[] = [
  {
    id: string,
    text: string,
    isEditing?: boolean,
    isRegenerating?: boolean
  }
]

captionStyle: CaptionStyle = {
  textColor: '#ffffff',
  backgroundColor: '#000000',
  backgroundOpacity: 0.7,
  fontSize: 16,
  xPercent: 0.5,        // Horizontal position (0-1)
  yPercent: 0.85,       // Vertical position (0-1)
  widthPercent: 0.8,    // Width (0-1)
  paddingPx: 20,
  rotation: 0           // Degrees
}

variants: Variant[] = [
  {
    id: string,
    demoId: string,
    demoName: string,
    creatorTemplateId: string | null,
    creatorName: string,
    caption: string,
    selected: boolean,
    captionStyleOverride?: CaptionStyle  // Per-variant style
  }
]
```

---

## **STEP 4: REVIEW & EXPORT** 📋

### **Layout:**
The step is divided into **2 columns**:
- **Left**: Large video preview with controls
- **Right**: Caption editor + Generated clips grid

### **User Actions:**

#### **A. Review Generated Clips**
1. **Clip Thumbnails Display**:
   - All generated variants shown as thumbnails in a grid (3 columns)
   - Each thumbnail shows:
     - Video frame (from demo video)
     - **Caption embedded on canvas** (matches preview exactly)
     - Checkbox in top-left (selection)
     - Blue border if currently selected/playing

2. **Select Clip**:
   - Click on a thumbnail to select it
   - Selected clip appears in the left preview
   - Preview shows the full video with caption overlay
   - Selected clip gets blue border highlight

3. **Toggle Selection**:
   - Click checkbox to include/exclude from export
   - Selected clips have blue checkmark
   - Unselected clips have empty checkbox

#### **B. Edit Captions (Review Section)**
1. **Caption Editor Panel**:
   - Shows "Edit Caption" section at top right
   - Displays current clip number (e.g., "Clip 2")
   - Textarea shows the caption text for selected clip

2. **Edit Caption Text**:
   - User types in the textarea
   - Changes update **live** in:
     - Left preview (immediately)
     - Thumbnail canvas (re-renders with new caption)
     - Variant data (saved to state)
   - When navigating back to Config, changes are preserved

3. **Caption Positioning** (via Preview):
   - User can drag/resize/rotate caption in the preview
   - Changes update **live** in:
     - Preview (immediate)
     - All thumbnails (re-render with new position)
     - Variant's `captionStyleOverride` (saved per-variant)

#### **C. Video Preview Controls**
1. **Playback Controls**:
   - **Play/Pause** button
   - **Timeline scrubber**: Click or drag to seek
   - **Time display**: Shows current time / total duration
   - **Volume slider**: Adjust audio volume
   - **Aspect ratio selector**: Switch between 9:16, 16:9, 1:1, 4:5

2. **Preview Features**:
   - Shows creator video + demo video combined
   - Caption overlay matches exactly what will be exported
   - Real-time updates when caption text or style changes

#### **D. Export Clips**
1. **Export Process**:
   - Click **"Download"** button
   - Only selected clips are exported
   - Creates a ZIP file containing:
     - Video files (one per selected variant)
     - `captions.csv` file with metadata

2. **Export Contents**:
   - **Videos**: Original demo videos (not rendered with captions yet - MVP)
   - **CSV File**: Contains:
     - Filename
     - Demo Name
     - Creator Name
     - Caption Text
     - Hashtags (if any)
     - CTA (if any)

3. **Export Progress**:
   - Shows modal with progress bar
   - Displays "Processing X of Y..."
   - Closes automatically when complete

#### **E. Navigation**
- Click **"Back"** to return to Step 3 (Config)
- All edits are preserved when navigating back

### **Data Flow:**
- Variants stored in `experimentData.variants`
- Each variant can have:
  - Custom caption text (editable)
  - Custom caption style override (per-variant positioning)
  - Selection status (for export)

---

## **DATA FLOW DIAGRAM**

```
┌─────────────────────────────────────────────────────────────┐
│                    PARENT COMPONENT                         │
│              (app/ugc-generator/page.tsx)                    │
│                                                              │
│  experimentData: {                                          │
│    demos: DemoVideo[]          ← Step 1                     │
│    selectedCreators: string[]   ← Step 2                     │
│    captionStyle: CaptionStyle   ← Step 3                     │
│    variants: Variant[]          ← Step 3 → Step 4            │
│    generatedCaptions: []        ← Step 3                     │
│  }                                                            │
└─────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
    Step1Upload   Step2Creators   Step3Config   Step4Review
         │              │              │              │
         │              │              │              │
    ┌────┴────┐   ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
    │ Upload  │   │ Select  │   │ Generate│   │ Review  │
    │ Videos  │   │Creators │   │Captions │   │ & Export│
    └─────────┘   └─────────┘   └─────────┘   └─────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ API: Generate│
                    │   Captions   │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  OpenAI API  │
                    │  GPT-4o-mini  │
                    └──────────────┘
```

---

## **KEY TECHNICAL DETAILS**

### **Caption Generation Algorithm:**
1. **Task Creation**: For each (demo × creator × captionNumber) combination
2. **Parallel Processing**: All tasks run simultaneously using `Promise.allSettled()`
3. **Uniqueness**: Each caption uses a different "angle" to ensure variety
4. **Persona Matching**: Captions match the selected creator's style
5. **Length Control**: Captions respect the length requirement (short/medium/long)

### **Caption Style System:**
- **Global Style**: Applied to all captions by default
- **Variant Override**: Each variant can have custom positioning/styling
- **Normalized Coordinates**: Uses percentages (0-1) for positioning
- **Real-time Updates**: Changes propagate immediately to all previews

### **State Persistence:**
- All data persists in parent component state
- Navigating between steps preserves all data
- Can go back and modify previous steps
- Changes in Review sync back to Config when navigating back

### **Canvas Rendering (Thumbnails):**
- Each thumbnail uses HTML5 Canvas
- Renders video frame + caption as a single image
- Matches preview exactly (same positioning, styling)
- Updates in real-time when caption changes

---

## **USER JOURNEY SUMMARY**

1. **Upload** → User uploads demo videos
2. **Select** → User chooses 1-3 creator personas
3. **Generate** → AI creates unique captions for each combo
4. **Customize** → User edits captions and positions them
5. **Review** → User reviews all clips, makes final edits
6. **Export** → User downloads selected clips as ZIP

---

## **FUTURE ENHANCEMENTS** (Not Yet Implemented)

- **Video Rendering**: Actually burn captions into video files (currently exports originals)
- **Real Transcription**: Integrate OpenAI Whisper API for actual video transcription
- **Batch Export**: Export all variants at once with captions rendered
- **Template Library**: Save and reuse caption styles
- **Analytics**: Track which captions perform best


