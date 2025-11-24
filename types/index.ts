export interface DemoVideo {
  id: string;
  name: string;
  url: string;
  file: File | null;
  transcript?: string;
  uploadedAt: Date;
}

export interface CreatorTemplate {
  id: string;
  name: string;
  description: string;
  videoUrl: string | null;
  persona: string;
}

export interface SubtitleStyle {
  id: string;
  name: string;
  description: string;
}

export interface Variant {
  id: string;
  demoId: string;
  demoName: string;
  creatorTemplateId: string | null;
  creatorName: string;
  creatorVideoUrl?: string | null; // URL to creator template video for stitching
  subtitleStyle: string | null;
  subtitleEnabled: boolean;
  hook: string;
  caption: string;
  hashtags: string;
  cta: string;
  thumbnail?: string;
  selected: boolean;
  startTime?: number; // Start time in seconds (optional)
  duration?: number; // Duration in seconds (optional)
  captionStyleOverride?: CaptionStyle; // Per-variant caption style override
}

export interface CaptionStyle {
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: number; // 0-1, where 0 is transparent and 1 is opaque
  fontSize: number;
  // Normalized coordinates (0-1, relative to video dimensions)
  xPercent: number; // 0-1, center of caption box horizontally (0 = left, 0.5 = center, 1 = right)
  yPercent: number; // 0-1, center of caption box vertically (0 = top, 0.5 = center, 1 = bottom)
  widthPercent: number; // 0-1, width of caption box (0.8 = 80% of video width)
  paddingPx: number; // Padding in pixels (for background box)
  rotation?: number; // Rotation in degrees (0-360)
  // Legacy fields for backward compatibility (will be migrated)
  position?: 'bottom' | 'center' | 'top' | 'custom';
  customX?: number;
  customY?: number;
}

export interface GeneratedCaption {
  id: string;
  text: string;
  isEditing?: boolean;
  isRegenerating?: boolean;
}

export interface ExperimentData {
  demos: DemoVideo[];
  selectedCreators: string[];
  productDescription: string;
  audience: string;
  tone: string;
  captionsPerCombo: number;
  captionLength: 'short' | 'medium' | 'long'; // Caption length preference
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5'; // Video aspect ratio
  subtitleEnabled: boolean;
  subtitleStyle: string | null;
  captionStyle: CaptionStyle;
  variants: Variant[];
  // Persisted captions from Step 3
  generatedCaptions?: GeneratedCaption[];
  captionPrompt?: string;
}

