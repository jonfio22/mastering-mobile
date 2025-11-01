# WaveformDisplay - Quick Reference

## Import
```tsx
import WaveformDisplay from '@/components/mastering/WaveformDisplay';
```

## Basic Usage
```tsx
<WaveformDisplay />
```

## With Props
```tsx
<WaveformDisplay
  height={200}
  className="my-4"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `height` | number | 128 | Height in pixels |
| `className` | string | '' | CSS classes |

## Features

✓ Auto-connects to audio store
✓ Click waveform to seek
✓ Zoom 1x - 100x
✓ Shows playback position
✓ Loop region display
✓ VU meter green theme
✓ Mobile responsive
✓ Empty state handling
✓ Loading state

## Colors

- Waveform: `#10b981` (emerald-500)
- Progress: `#059669` (emerald-600)
- Cursor: `#34d399` (emerald-400)
- Background: `gray-900` → `black`

## Controls

- **Zoom In** - Increase zoom by 10x
- **Zoom Out** - Decrease zoom by 10x
- **Reset** - Back to 1x zoom
- **Click Waveform** - Seek to position

## States

**Empty**: No audio loaded
**Loading**: Processing audio
**Ready**: Waveform visible
**Playing**: Green pulsing dot
**Looping**: "LOOP" badge shown

## Store Integration

Reads:
- `audioBuffer` - Waveform data
- `currentTime` - Playback position
- `duration` - Total length
- `playbackState` - Playing/stopped
- `loop` - Loop enabled
- `loopStart/End` - Loop region

Calls:
- `seek(time)` - When clicked

## Files

- Component: `src/components/mastering/WaveformDisplay.tsx`
- Tests: `src/components/mastering/WaveformDisplay.test.tsx`
- Docs: `docs/WaveformDisplay-Usage.md`
- Examples: `docs/WaveformDisplay-Example.tsx.example`

## Dependencies

- wavesurfer.js ^7.11.1
- @wavesurfer/react ^1.0.11
- lucide-react (icons)

## TypeScript

Fully typed, zero errors.

## Browser Support

Chrome, Firefox, Safari, Edge (latest)
Mobile Safari, Mobile Chrome

## Performance

- One-time AudioBuffer conversion
- Efficient rendering via WaveSurfer.js
- Optimized re-renders
- Proper cleanup

## Troubleshooting

**No waveform?**
→ Check audioBuffer in store

**Seeking broken?**
→ Verify seek() exists in store

**Zoom not working?**
→ Wait for isReady state

**Slow loading?**
→ Large files take time to convert

## Next Steps

1. Import component
2. Add to your page
3. Load audio via AudioUploader
4. Component handles the rest

No configuration needed!
