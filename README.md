# TradingPower Tool v9.2
[![After Effects](https://img.shields.io/badge/After%20Effects-2023%2B-9999FF)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

![TradingPower Tool UI](docs/ui_screenshot.png)

**TradingPower Tool** is a powerful ScriptUI Panel for Adobe After Effects, specifically designed to automate the creation of high-quality trading and financial education videos. It standardizes brand identity (Bebas Neue fonts, Gold #c18d21 palette) and accelerates local editing workflows.

## Key Features

- **Typography & Titles**: Generate standardized Lesson titles, Section headers, and quick text reveal animations.
- **Dynamic Highlights**: Circle FX reveals and basic highlight presets for charting.
- **Super Zoom Tool**: Intelligent zoom-in/out logic for focal points.
- **Fullscreen Memes**: Quickly generate branded fullscreen overlays with GIF and text integration.
- **Motion Helpers**: Gold line (Trim Paths) drawings and fade animations.
- **Audit System**: Run a full composition audit to ensure consistency with brand guidelines.

## Requirements

- **Adobe After Effects 2023** or later.
- **Bebas Neue** font installed.
- **Permissions**: Enable "Allow Scripts to Write Files and Access Network" in AE Preferences > General.

## Installation

> [!IMPORTANT]
> **Do NOT use** `File > Scripts > Install ScriptUI Panel`. This AE feature only copies the `.jsx` file and will skip the required `presets/` folder, causing the script to fail.

1. Download or clone this repository.
2. Copy **both** `TradingPower.jsx` **and** the `presets/` folder into your ScriptUI Panels directory:
   - **Windows:** `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`
   - **macOS:** `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`
3. Your folder structure must look like this:
   ```
   ScriptUI Panels/
   ├── TradingPower.jsx
   └── presets/
       ├── Highlight_LayerStyles.ffx
       ├── FullscreenText_TextLayerStyles.ffx
       ├── Screen.ffx
       ├── LoopGIF.ffx
       └── ...
   ```
4. Restart After Effects.
5. Open the tool from **Window → TradingPower.jsx**.

## Quick Start

1. **Create a Title**: Type "Bitcoin Analysis" in the **Lesson** box → click **GENERATE LESSON**.
2. **Try Super Zoom**:
   - Use the Rectangle Tool (**Q**) to draw a shape over a chart area.
   - **Ctrl+Click** to select both the Shape layer and your Video layer.
   - Click **RUN SUPER ZOOM**.
3. **Add a Highlight**: Draw any shape on screen → click **HIGHLIGHT BASIC**.

## Required Presets

The `presets/` folder contains `.ffx` files that the script depends on. **Keep this folder next to the script at all times.**

| Preset | Purpose |
|--------|---------|
| `Highlight_LayerStyles.ffx` | Glow & blend look for highlights |
| `FullscreenText_TextLayerStyles.ffx` | Text style for fullscreen meme frames |
| `Screen.ffx` | Mask shape for Zoom/Meme frame cropping |
| `LoopGIF.ffx` | Enables infinite GIF looping |

---

## Detailed Manual
For a full breakdown of every feature and troubleshooting steps, see the [User Manual (English)](TradingPower_Guidelines_EN.md).

## License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
