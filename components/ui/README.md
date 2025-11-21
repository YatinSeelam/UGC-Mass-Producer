# Upload UI Component

## Setup Complete ✅

The following has been set up for the UploadCard component:

### Dependencies Installed
- ✅ `clsx` - For conditional class names
- ✅ `lucide-react` - For icons (X, ArrowDownCircle, CheckCircle, XCircle)
- ✅ `tailwindcss` - For styling
- ✅ `postcss` & `autoprefixer` - For CSS processing

### Project Structure
- ✅ TypeScript configured
- ✅ Path aliases configured (`@/*` points to project root)
- ✅ Tailwind CSS initialized
- ✅ `components/ui` folder created (shadcn/ui structure)

### Files Created
1. `/components/ui/upload-ui.tsx` - Main UploadCard component
2. `/components/ui/upload-demo.tsx` - Demo/example usage
3. `/tailwind.config.js` - Tailwind configuration
4. `/postcss.config.js` - PostCSS configuration

### Usage

```tsx
import { UploadCard } from '@/components/ui/upload-ui';

// Uploading state
<UploadCard
  status="uploading"
  progress={68}
  title="Just a minute..."
  description="Your file is uploading right now."
  primaryButtonText="Cancel"
  onPrimaryButtonClick={() => handleCancel()}
/>

// Success state
<UploadCard
  status="success"
  title="Your file was uploaded!"
  description="Your file was successfully uploaded."
  primaryButtonText="Copy Link"
  onPrimaryButtonClick={() => handleCopyLink()}
  secondaryButtonText="Done"
  onSecondaryButtonClick={() => handleDone()}
/>

// Error state
<UploadCard
  status="error"
  title="We are so sorry!"
  description="There was an error uploading your file."
  primaryButtonText="Retry"
  onPrimaryButtonClick={() => handleRetry()}
  secondaryButtonText="Cancel"
  onSecondaryButtonClick={() => handleCancel()}
/>
```

### Component Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `status` | `'uploading' \| 'success' \| 'error'` | Yes | Current upload status |
| `progress` | `number` | No | Upload progress (0-100), only for 'uploading' status |
| `title` | `string` | Yes | Card title |
| `description` | `string` | Yes | Card description text |
| `primaryButtonText` | `string` | Yes | Text for primary button |
| `onPrimaryButtonClick` | `() => void` | No | Primary button click handler |
| `secondaryButtonText` | `string` | No | Text for secondary button (success/error only) |
| `onSecondaryButtonClick` | `() => void` | No | Secondary button click handler |

### Styling

The component uses Tailwind CSS classes and automatically applies:
- **Blue theme** for uploading status
- **Green theme** for success status
- **Red theme** for error status

All styling is responsive and follows modern design principles.




