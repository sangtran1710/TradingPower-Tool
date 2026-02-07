# TradingPower DNA — User Manual (v9.2)

**TradingPower DNA** is a professional ScriptUI Panel for Adobe After Effects, built to automate financial content editing, standardize brand identity, and eliminate repetitive manual work.

---

## 1. Prerequisites

Before using TradingPower, make sure you have:

- **Adobe After Effects 2023** or later (v23.0+)
- **[Bebas Neue](https://fonts.google.com/specimen/Bebas+Neue)** font installed (both Regular and Bold weights)
- AE Preferences → General → **"Allow Scripts to Write Files and Access Network"** enabled
- The `presets/` folder located in the same directory as `TradingPower.jsx`

---

## 2. Tool Overview

- **Version:** v9.2
- **Core Purpose:** Automating titles, highlights, focus zooms, and professional motion graphics.

---

## 2. Interface Layout

The panel is organized into **2 Main Columns**:

### Column 1 (Design & Focus)
- **Highlights**: CIRCLE FX (reveal animation) and HIGHLIGHT BASIC (layer style presets).
- **Typography**: Lesson Titles (Generate Lesson) and Section Headers (Section Text).

### Column 2 (Motion & System)
- **Super Zoom**: Create Base Shape and Run Super Zoom (smooth camera focus).
- **Motion**: GOLD LINE (trim paths), Add Text (quick labels), and FADE IN/OUT.
- **System**: GENERATE MEME (fullscreen frames) and RUN FULL AUDIT (consistency check).

---

## 3. Core Functions Guide

### A. Typography (Titles & Labels)
- **GENERATE LESSON**: Creates a large lesson title with an automated background blur and dark overlay.
  - **Usage**: Type content in the "Lesson" box, click the button.
  - **Newbie Tip**: High-contrast text is handled automatically by the script.
- **SECTION TEXT**: Creates a branded section header (shape + animated text reveal).
  - **Usage**: Type content and click. The layer will be placed above your current selection.

### B. Highlighting (Visual Focus)
- **SUPER ZOOM (Requires 1 Shape Layer + 1 Video)**:
  - This is the "magic" button. It parents your video to a controller and zooms into a specific area you've outlined with a shape.
  - **Step-by-step**: 
    1. Draw a rectangle over the area you want to focus on.
    2. Select the **Shape** and the **Video** layer together.
    3. Click **RUN SUPER ZOOM**.
- **HIGHLIGHT BASIC**: Applies a professional "glow & blend" look to any shape you draw on the screen.

### C. Creative (Meme Frames)
- **GENERATE MEME**: Creates a cinematic fullscreen frame for quotes or funny segments.
  - **Preparation**: Select a GIF or Video in your **Project Panel** first.
  - **Usage**: Type your quote in the box and click.
  - **Newbie Note**: The script automatically handles the "Track Matte" (masking) so you don't have to manually clip the GIF into the frame.

### D. Motion & Helpers
- **GOLD LINE**: A "one-click" animated trendline. Perfect for drawing chart levels.
- **FADE IN / OUT**: Instantly adds smooth transparency transitions (0.4s duration) without manually clicking keyframes.

---

## 4. Required Presets (FFX Files)

The tool depends on a few preset files located in the `presets` folder. **Do not move or delete this folder.**

| Preset | Description |
|--------|-------------|
| `Highlight_LayerStyles.ffx` | The "look" for standard highlights. |
| `FullscreenText_TextLayerStyles.ffx` | Style for Meme text. |
| `Screen.ffx` | The mask shape for cropping Zoom/Meme frames. |
| `LoopGIF.ffx` | Logic to make GIFs loop indefinitely. |

---

## 5. Troubleshooting for Newbies

- **"Object is invalid" Error**: Usually happens if you deleted a layer that the script was using. Undo (Ctrl+Z) or restart the script.
- **Layers not appearing**: Check if your "Playhead" (Current Time Indicator) is at the start of the composition. Most functions start at the playhead.
- **Font looks wrong**: Ensure **Bebas Neue** is installed on your Windows/Mac system.
- **Zoom is in the wrong place**: Make sure your Shape Layer is exactly where you want the focus to be before clicking Run Super Zoom.

---

*Manual updated for TradingPower v9.2 Release.*
