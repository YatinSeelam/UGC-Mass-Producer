# Video Grid Layout Optimization System

## Problem Statement

Create an intelligent grid layout system that optimally arranges up to 9 demo videos (mix of 9:16 portrait and 16:9 landscape aspect ratios) in a responsive grid container, minimizing empty space and maximizing visual organization.

## Constraints

1. **Maximum Videos**: Limit to 9 demo videos total
2. **Aspect Ratios**:
   - **9:16 (Portrait/Long)**: Height = 3 × (16:9 video height)
   - **16:9 (Landscape/Wide)**: Height = 1 × (16:9 video height)
3. **Grid Configuration**:
   - Column width: `minmax(180px, 1fr)` (responsive)
   - Row height: `calc((180px * 9) / 16)` (height of one 16:9 video)
   - Gap: `0.875rem` between items
   - Grid flow: `row dense` (allows filling gaps)

## Layout Rules

### 9:16 (Portrait) Videos:
- **Spacing**: Normal grid spacing, side by side
- **Row Span**: 3 rows (full height)
- **Placement**: Can be placed in any column, but should not be placed below 16:9 videos
- **Priority**: Place 9:16 videos first in the layout algorithm

### 16:9 (Landscape) Videos:
- **Stacking**: Stack vertically in the same column (up to 3 videos per column)
- **Row Span**: 1 row each
- **Placement Logic**:
  - 1st 16:9 video → New column, row 1
  - 2nd 16:9 video → Same column as 1st, row 2 (stacked under)
  - 3rd 16:9 video → Same column as 1st & 2nd, row 3 (stacked under)
  - 4th 16:9 video → New column, row 1 (starts new stack)
  - Continue pattern: stack up to 3, then new column

## Optimization Goals

1. **Minimize Empty Space**: Fill gaps efficiently
2. **Maximize Column Utilization**: Use columns efficiently
3. **Visual Balance**: Distribute videos evenly when possible
4. **Responsive**: Layout should adapt to container width

## Algorithm Requirements

### Step 1: Classification
- Count total videos (max 9)
- Separate into two groups:
  - `portraitVideos`: All 9:16 videos
  - `landscapeVideos`: All 16:9 videos

### Step 2: Layout Planning
- Calculate optimal column count based on container width
- Plan placement order:
  1. Place all 9:16 videos first (normal spacing)
  2. Place 16:9 videos in stacks (3 per column max)

### Step 3: Grid Placement Algorithm
```
For each video in sorted order:
  If 9:16:
    - Find first available column that doesn't have 16:9 videos above
    - Place at row 1, span 3 rows
  If 16:9:
    - Find column with existing 16:9 videos (if < 3 in column)
    - If no such column exists, start new column
    - Place at appropriate row (1, 2, or 3 in that column)
```

### Step 4: Grid CSS Generation
- Generate grid template with explicit row/column placement
- Or use CSS Grid auto-placement with proper sorting

## Implementation Approach

### Option A: CSS Grid with Smart Sorting
- Sort videos: 9:16 first, then 16:9 grouped by upload order
- Use `grid-auto-flow: row dense`
- Let CSS Grid handle placement automatically

### Option B: Explicit Grid Placement
- Calculate exact grid positions for each video
- Use `grid-row` and `grid-column` explicitly
- More control but more complex

### Option C: Hybrid Approach
- Use CSS Grid with `row dense`
- Pre-sort videos optimally
- Track column usage to ensure proper stacking

## Example Scenarios

### Scenario 1: 2 Portrait + 3 Landscape
- Portrait 1 → Column 1, Rows 1-3
- Portrait 2 → Column 2, Rows 1-3
- Landscape 1 → Column 3, Row 1
- Landscape 2 → Column 3, Row 2
- Landscape 3 → Column 3, Row 3

### Scenario 2: 1 Portrait + 4 Landscape
- Portrait 1 → Column 1, Rows 1-3
- Landscape 1 → Column 2, Row 1
- Landscape 2 → Column 2, Row 2
- Landscape 3 → Column 2, Row 3
- Landscape 4 → Column 3, Row 1

### Scenario 3: 3 Portrait + 6 Landscape
- Portrait 1 → Column 1, Rows 1-3
- Portrait 2 → Column 2, Rows 1-3
- Portrait 3 → Column 3, Rows 1-3
- Landscape 1-3 → Column 4, Rows 1-3 (stacked)
- Landscape 4-6 → Column 5, Rows 1-3 (stacked)

## Code Structure

```typescript
interface LayoutConfig {
  maxVideos: 9
  columnWidth: 'minmax(180px, 1fr)'
  rowHeight: 'calc((180px * 9) / 16)'
  gap: '0.875rem'
}

function optimizeLayout(videos: DemoVideo[]): {
  sortedVideos: DemoVideo[]
  gridStyle: React.CSSProperties
  itemStyles: Record<string, React.CSSProperties>
} {
  // 1. Validate (max 9 videos)
  // 2. Classify by aspect ratio
  // 3. Sort optimally
  // 4. Calculate grid positions
  // 5. Return layout configuration
}
```

## Success Criteria

1. ✅ All videos fit within container without overflow
2. ✅ 16:9 videos stack properly (up to 3 per column)
3. ✅ 9:16 videos maintain normal spacing
4. ✅ Minimal empty space
5. ✅ Layout updates correctly when videos are added/removed
6. ✅ Responsive to container width changes

## Edge Cases to Handle

1. **All 9:16 videos**: Normal grid, no stacking needed
2. **All 16:9 videos**: Stack in columns of 3
3. **Mixed with more 16:9 than can fit in columns**: Start new columns
4. **Aspect ratio not detected yet**: Default to 1 row span, update when detected
5. **Container width changes**: Recalculate optimal layout





