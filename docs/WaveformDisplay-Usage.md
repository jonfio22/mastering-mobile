# WaveformDisplay Component Usage Guide

## Overview

The `WaveformDisplay` component is a professional waveform visualization component built with WaveSurfer.js that integrates seamlessly with the audio store. It provides a hardware-inspired dark theme with VU meter green accents.

## Features

- **Professional Waveform Visualization**: High-quality audio waveform rendering
- **Click-to-Seek**: Click anywhere on the waveform to jump to that position
- **Zoom Controls**: Zoom in/out for detailed waveform inspection (1x to 100x)
- **Playback Sync**: Automatically syncs with audio store playback state
- **Loop Region Display**: Visual indication of loop regions
- **Responsive Design**: Mobile-friendly layout
- **Hardware Theme**: Dark theme with emerald/green VU meter colors
- **Time Display**: Shows current time and duration
- **Error Handling**: Graceful empty state when no audio is loaded

## Basic Usage

```tsx
import WaveformDisplay from '@/components/mastering/WaveformDisplay';

function MyComponent() {
  return <WaveformDisplay />;
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `height` | `number` | `128` | Height of the waveform in pixels |
| `className` | `string` | `''` | Additional CSS classes to apply |

## Examples

### Default Configuration

```tsx
<WaveformDisplay />
```

### Custom Height

```tsx
<WaveformDisplay height={256} />
```

### With Custom Styling

```tsx
<WaveformDisplay
  height={200}
  className="my-4 shadow-xl"
/>
```

### In a Layout

```tsx
function MasteringPage() {
  return (
    <div className="p-4 space-y-4">
      <AudioUploader />
      <WaveformDisplay height={180} />
      <AudioPlayer />
      <ProcessingChain />
    </div>
  );
}
```

## Integration with Audio Store

The component automatically connects to the audio store and responds to:

- **audioBuffer**: Generates the waveform visualization
- **currentTime**: Updates playback cursor position
- **duration**: Shows total duration
- **playbackState**: Shows playing/stopped indicator
- **loop**: Displays loop indicator badge
- **loopStart/loopEnd**: Renders loop region overlay
- **seek()**: Calls this when user clicks to seek

No manual integration required - just render the component!

## Behavior

### Empty State

When no audio is loaded, displays:
- AlertCircle icon
- "No audio loaded" message
- Instructions to upload audio

### Loading State

While audio is loading, displays:
- Loading spinner
- "Loading waveform..." message
- Backdrop blur effect

### Playing State

When audio is playing:
- Animated green indicator dot
- "PLAYING" label
- Progress cursor moves along waveform

### Loop Mode

When loop is enabled:
- "LOOP" badge displayed
- Green overlay showing loop region
- Borders at loop start/end points

## Zoom Controls

Three zoom buttons are provided:

1. **Zoom Out** (-): Decrease zoom level by 10x
2. **Zoom Level Display**: Shows current zoom (1x - 100x)
3. **Zoom In** (+): Increase zoom level by 10x
4. **Reset Zoom**: Return to 1x zoom level

Buttons are disabled when at min/max zoom levels.

## Time Display

- **Left Badge**: Current playback time (MM:SS.MS)
- **Right Badge**: Total duration (MM:SS.MS)
- Format includes milliseconds for precision

## Styling

### Colors

The component uses a hardware-inspired color palette:

- **Waveform**: `#10b981` (emerald-500)
- **Progress**: `#059669` (emerald-600)
- **Cursor**: `#34d399` (emerald-400)
- **Background**: `black` to `gray-900` gradient
- **Borders**: `gray-700` and `gray-800`
- **Loop Region**: `rgba(52, 211, 153, 0.1)` with emerald borders

### Effects

- Gradient overlays for depth
- Glass reflection effect
- Backdrop blur on loading
- Smooth transitions
- Animated playback indicator

## Mobile Responsiveness

The component adapts to mobile screens:

- Zoom label hidden on small screens (`hidden sm:inline`)
- Playback state label hidden on small screens
- Touch-friendly button sizes
- Responsive time badges
- Scrollable waveform when zoomed

## Performance Considerations

- WaveSurfer.js efficiently renders large audio files
- AudioBuffer conversion happens once on load
- Zoom updates are debounced via state
- Event listeners properly cleaned up on unmount
- No unnecessary re-renders (React hooks optimized)

## TypeScript

The component is fully typed with TypeScript:

```tsx
interface WaveformDisplayProps {
  height?: number;
  className?: string;
}
```

All audio store types are imported and used correctly.

## Error Handling

The component handles several error scenarios:

1. **No Audio Loaded**: Shows empty state with instructions
2. **Loading Errors**: Logged to console, prevents crashes
3. **WaveSurfer Errors**: Caught and logged via error handler
4. **AudioBuffer Conversion**: Try-catch wraps conversion logic

## Browser Compatibility

Requires browsers that support:
- Web Audio API
- AudioContext
- OfflineAudioContext
- ES6+ features

Tested on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile Safari
- Mobile Chrome

## Accessibility

Current accessibility features:
- Semantic HTML structure
- Clear visual feedback
- Keyboard navigation for controls
- Proper ARIA labels on buttons

Future improvements:
- Keyboard seeking
- Screen reader announcements
- Focus management

## Troubleshooting

### Waveform Not Appearing

1. Check that audio is loaded in store
2. Verify audioBuffer exists
3. Check browser console for errors
4. Ensure WaveSurfer.js is installed

### Seeking Not Working

1. Verify `seek()` function exists in store
2. Check that duration > 0
3. Ensure WaveSurfer is initialized (isReady = true)

### Zoom Not Working

1. Check that audio is loaded
2. Verify isReady state is true
3. Try resetting zoom to 1x

### Performance Issues

1. Reduce height for better performance
2. Consider limiting max zoom level
3. Ensure only one WaveformDisplay per page
4. Check for memory leaks in dev tools

## Future Enhancements

Potential improvements:

- [ ] Spectrogram view mode
- [ ] Multiple waveform colors/themes
- [ ] Minimap for navigation
- [ ] Markers/regions system
- [ ] Export waveform as image
- [ ] Keyboard shortcuts
- [ ] Touch gestures for zoom
- [ ] Vertical zoom (amplitude)
- [ ] Frequency analysis overlay

## Dependencies

- `wavesurfer.js@^7.11.1`: Core waveform library
- `@wavesurfer/react@^1.0.11`: React integration
- `lucide-react`: Icons
- `zustand`: State management

## Related Components

- **AudioPlayer**: Playback controls
- **AudioUploader**: File upload
- **VUMeter**: Level metering
- **LoopControls**: Loop region controls

## License

Part of the Mastering Mobile project.
