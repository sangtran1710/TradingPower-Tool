# TradingPower DNA — User Manual (v9.2)

**TradingPower DNA** is a professional ScriptUI Panel for Adobe After Effects, designed to automate financial content creation, standardize brand identity, and eliminate repetitive editing tasks.

---

## 1. Prerequisites

Before using the tool, ensure you have:
- **Adobe After Effects 2023** or later.
- **[Bebas Neue](https://fonts.google.com/specimen/Bebas+Neue)** fonts installed (Regular & Bold weights).
- **Permissions**: Go to Preferences > Scripting & Expressions and enable **"Allow Scripts to Write Files and Access Network"**.
- **Resources**: The `presets/` folder must be in the same directory as `TradingPower.jsx`.

---

## 2. Interface Layout

The panel is organized into two primary columns for efficiency:

### Left Column: Typography & Focus
- **Highlights**: Add animated circle reveals or apply basic glow styles to shapes.
- **Typography**: Generate branded Lesson titles, Section headers, and quick-add text layers.

### Right Column: Motion & Creative
- **Super Zoom Tool**: Create camera focus effects on charts or specific details.
- **Motion**: Draw trendlines (Gold Line), and quickly apply Fade In/Out transitions.
- **Creative & System**: Generate fullscreen meme frames and run a full composition audit.

---

## 3. Core Functions Guide

### A. Typography (Titles & Labels)
- **GENERATE LESSON**: Creates a high-impact lesson title with an automated background blur and dark overlay.
  - **Usage**: Type your title in the "Lesson" box and click.
- **SECTION TEXT**: Creates a branded section header with a shape background and animated text reveal.
  - **Usage**: Type your section name and click. It will be placed above your current selection.

### B. Highlighting (Visual Focus)
- **SUPER ZOOM (Requires 1 Shape Layer + 1 Video)**:
  - This "magic" button creates a controller that zooms into a specific area.
  - **Step-by-step**: 
    1. Use the **Rectangle Tool (Q)** to draw a shape over the area you want to focus on.
    2. Select **both** the Shape layer and your Video layer (Ctrl+Click).
    3. Click **RUN SUPER ZOOM**.
- **HIGHLIGHT BASIC**: Instantly applies a professional "glow & blend" style to any selected shape.

### C. Creative (Meme Frames)
- **GENERATE MEME**: Creates a cinematic fullscreen frame for quotes or social media clips.
  - **Preparation**: Select a GIF or Video in your **Project Panel** first.
  - **Usage**: Type your quote/caption in the box and click.
  - **Note**: The script handles all track matting and masking automatically.

### D. Motion & Helpers
- **GOLD LINE**: Draws an animated trendline with trim paths from the playhead position.
- **FADE IN / OUT**: Adds smooth transparency transitions (0.4s) to the selected layer without manual keyframing.

---

## 4. Required Presets (FFX Files)

The tool depends on the following presets in the `presets/` folder:

| Preset | Description |
|--------|-------------|
| `Highlight_LayerStyles.ffx` | The visual style for standard highlights |
| `FullscreenText_TextLayerStyles.ffx` | Typography style for Meme frames |
| `Screen.ffx` | Mask shape for Zoom and Meme frame cropping |
| `LoopGIF.ffx` | Expression logic to enable infinite GIF looping |

---

## 5. Troubleshooting

| Issue | Potential Cause | Solution |
|-------|-----------------|----------|
| **"Object is invalid"** | A layer the script was referencing was deleted. | Undo (Ctrl+Z) or restart the script. |
| **Nothing appears** | Playhead is at the end of the comp or no comp is active. | Move the playhead to where you want the layer to start. |
| **Fonts look wrong** | Bebas Neue is not installed or active. | Download and install Bebas Neue from Google Fonts. |
| **Zoom is off-center** | The shape layer was moved after creation. | Reselect the shape and video, then click Run Super Zoom again. |
| **Presets not found** | The `presets/` folder is missing or renamed. | Ensure `presets/` is in the same folder as the script. |

---

*Manual updated for TradingPower v9.2 Release.*
