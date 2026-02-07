// TradingPower Tool v9.2 – Panel: Smart Highlight, Super Focus, Highlight Basic (preset Layer Styles), Section Text, etc.
// Install: AE File > Scripts > Install ScriptUI Panel, or copy to ScriptUI Panels folder.
{
    // When run from Controller: __TP_NO_UI = true (no UI). When opened from Window: show panel.
    if (typeof __TP_NO_UI === "undefined") __TP_NO_UI = false;

    /** Version string for panel title and undo/alert. Update here then copy to ScriptUI Panels. */
    var TRADINGPOWER_VERSION_TEXT = "TradingPower Tool v9.2";

    /** Get base folder of the script to locate presets relatively */
    var SCRIPT_FILE = new File($.fileName);
    var SCRIPT_FOLDER_PATH = SCRIPT_FILE.exists ? SCRIPT_FILE.parent.absoluteURI : "";
    var PRESETS_FOLDER_NAME = "presets";

    /** Helper to get preset file, trying relative path first, then fallback to developer's OneDrive for backward compatibility */
    function getPresetFile(filename) {
        var relativeFile = new File(SCRIPT_FOLDER_PATH + "/" + PRESETS_FOLDER_NAME + "/" + filename);
        if (relativeFile.exists) return relativeFile;

        // Fallback to original hardcoded paths (developer's local environment only)
        var fallbackPaths = [
            "C:/Users/ADMIN/OneDrive/Tài liệu/Adobe/After Effects 2025/User Presets/",
            "C:/Users/ADMIN/OneDrive/Documents/Adobe/After Effects 2025/User Presets/"
        ];
        for (var i = 0; i < fallbackPaths.length; i++) {
            var f = new File(fallbackPaths[i] + filename);
            if (f.exists) return f;
        }

        // Return the relative path File object (caller checks .exists before use)
        return relativeFile;
    }

    /** Path constants replaced by dynamic File objects */
    var HIGHLIGHT_LAYERSTYLES_PRESET = getPresetFile("Highlight_LayerStyles.ffx");
    var FULLSCREEN_TEXT_LAYERSTYLES_PRESET = getPresetFile("FullscreenText_TextLayerStyles.ffx");
    // var FULLSCREEN_GIF_LAYERSTYLES_PRESET = getPresetFile("FullscreenText_GIFLayerStyles.ffx"); // Reserved for future use
    var SCREEN_PRESET = getPresetFile("Screen.ffx");
    var LOOP_GIF_PRESET = getPresetFile("LoopGIF.ffx");

    // ---------------------------------------------------------------------------------
    // BRAND VISUAL IDENTITY (v1.6)
    // ---------------------------------------------------------------------------------
    var BRAND = {
        colors: {
            gold: [193 / 255, 141 / 255, 33 / 255],     // #c18d21
            darkBlue: [16 / 255, 41 / 255, 69 / 255],   // #102945
            lightBlue: [12 / 255, 31 / 255, 52 / 255],  // #0c1f34
            grey: [179 / 255, 179 / 255, 179 / 255],    // #b3b3b3
            white: [1, 1, 1]
        },
        fonts: {
            header: "BebasNeue", // PostScript name
            body: "Roboto-Regular"
        }
    };

    // ---------------------------------------------------------------------------------
    // HELPERS & ROBUSTNESS (v5.7.2)
    // ---------------------------------------------------------------------------------
    function safeGetProp(parent, name) {
        if (!parent || !parent.property) return null;
        try { return parent.property(name); } catch (e) { return null; }
    }
    function safeGetVal(parent, name, def) {
        var p = safeGetProp(parent, name);
        if (!p || !p.value) return def;
        return p.value;
    }
    function safeSetMatte(target, matte, type) {
        if (!target || !matte) return;
        try {
            if (parseFloat(app.version) >= 23.0) {
                target.trackMatteLayer = matte;
                target.trackMatteType = type;
            } else {
                target.setTrackMatte(matte, type);
            }
        } catch (e) {
            try { target.setTrackMatte(matte, type); } catch (e2) { }
        }
    }

    /** Get active comp */
    function getActiveComp() {
        var comp = app.project && app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            alert("Please select a composition.");
            return null;
        }
        return comp;
    }

    /** Get selected layers as an Array */
    function getSelectedLayers(comp) {
        if (!comp) return [];
        var sel = comp.selectedLayers;
        if (!sel || sel.length === 0) {
            // *** UPDATE: No alert; caller handles. ***
            return [];
        }
        var layers = [];
        for (var i = 0; i < sel.length; i++) {
            layers.push(sel[i]);
        }
        return layers;
    }

    /** Find footage item by name */
    function findFootageItemByName(name) {
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof FootageItem && item.name == name) {
                return item;
            }
        }
        return null;
    }

    /** Create adjustment layer */
    function addAdjustment(comp, name) {
        var layer = comp.layers.addSolid([0, 0, 0], name || "Adjustment", comp.width, comp.height, comp.pixelAspect, comp.duration);
        layer.adjustmentLayer = true;
        layer.guideLayer = false;
        return layer;
    }

    /** Move layer to top */
    function safeMoveBefore(layer, comp) {
        try { layer.moveBefore(comp.layer(1)); } catch (e) { }
    }

    /** Get layer to insert above: first selected layer, or null (then new layer goes to top). Call before adding any new layers. */
    function getInsertBeforeLayer(comp) {
        try {
            if (comp.selectedLayers && comp.selectedLayers.length >= 1) return comp.selectedLayers[0];
        } catch (e) { }
        return null;
    }

    /** Move newly created layer: above selected layer if insertRef given, else to top. Ensures new layer appears at playhead (caller sets startTime/inPoint). */
    function moveNewLayerToInsertPosition(layer, insertRef) {
        if (!layer) return;
        try {
            if (insertRef && layer !== insertRef) layer.moveBefore(insertRef);
            else layer.moveToBeginning();
        } catch (e) { }
    }

    /** Restore selection to insertRef so new layers don't stay expanded. Optionally try collapse-all (AE may not support via script). */
    function restoreSelectionAfterInsert(comp, insertRef) {
        try {
            if (comp && insertRef) comp.selectedLayers = [insertRef];
            try {
                var cmdId = 0;
                if (typeof app.findMenuCommandId === "function") cmdId = app.findMenuCommandId("Collapse All");
                if (cmdId && typeof app.executeCommand === "function") app.executeCommand(cmdId);
            } catch (e2) { }
        } catch (e) { }
    }


    /** Get comp center */
    function getCompCenter(comp) {
        return [comp.width / 2, comp.height / 2];
    }


    // ---------------------------------------------------------------------------------
    // TEXT FUNCTIONS (Locked)
    // ---------------------------------------------------------------------------------

    function snapText(text) {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }
        app.beginUndoGroup("Snap Text with Markers");
        try {
            var insertRef = getInsertBeforeLayer(comp);
            var textLayer = comp.layers.addText(text);
            textLayer.inPoint = comp.time;

            // --- Customizations from user ---
            textLayer.property("Position").setValue([120, 540]);
            textLayer.property("Scale").setValue([200, 200]);

            try {
                var textProp = textLayer.property("Source Text");
                var textDoc = textProp.value;
                textDoc.font = BRAND.fonts.header;
                textDoc.justification = ParagraphJustification.LEFT_JUSTIFY;
                textProp.setValue(textDoc);
            } catch (e) { }

            // --- Original Animation Logic (from SlideDoc) ---
            var animator = textLayer.Text.Animators.addProperty("ADBE Text Animator");
            animator.name = "Line Selector";
            var opacityAnimator = animator.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity");
            opacityAnimator.setValue(0);
            var selector = animator.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
            selector.property("Start").setValue(0);
            selector.property("End").setValue(100);
            selector.property("Offset").setValue(0);

            var markerProperty = textLayer.property("Marker");
            var words = text.split(" ");

            // *** UPDATE: +40% duration (slower) ***
            // Original: 0.045
            var markerInterval = 0.063; // (0.045 * 1.4)

            for (var i = 0; i < words.length; i++) {
                var marker = new MarkerValue(words[i]);
                markerProperty.setValueAtTime(comp.time + i * markerInterval, marker);
            }

            var expression =
                "var markers = thisComp.layer(thisLayer.index).marker;\n" +
                "var wordIndex = 0;\n" +
                "if (markers.numKeys > 0) {\n" +
                "    for (var i = 1; i <= markers.numKeys; i++) {\n" +
                "        if (time >= markers.key(i).time) {\n" +
                "            wordIndex = i;\n" +
                "        } else {\n" +
                "            break;\n" +
                "        }\n" +
                "    }\n" +
                "}\n" +
                "wordIndex;";
            selector.property("Start").expression = expression;

            var advanced = selector.property("Advanced");
            advanced.property("Units").setValue(2);
            advanced.property("Based On").setValue(3);
            advanced.property("Smoothness").setValue(0);

            moveNewLayerToInsertPosition(textLayer, insertRef);
            restoreSelectionAfterInsert(comp, insertRef);
        } catch (err) {
            alert("Error in snapText: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }


    /** Fast and Delicate Fade */
    function applyFade(type) {
        var comp = getActiveComp();
        if (!comp) return;
        var selectedLayers = getSelectedLayers(comp);
        if (selectedLayers.length === 0) {
            alert("Please select at least one layer.");
            return;
        }

        app.beginUndoGroup("Apply Fade " + type);
        try {
            var duration = 0.4;
            var currentTime = comp.time;
            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                var opacity = layer.property("ADBE Transform Group").property("ADBE Opacity");

                if (type === "in") {
                    opacity.setValueAtTime(currentTime, 0);
                    opacity.setValueAtTime(currentTime + duration, 100);
                } else {
                    opacity.setValueAtTime(currentTime, 100);
                    opacity.setValueAtTime(currentTime + duration, 0);
                }
                setEasyEase(opacity, currentTime);
                setEasyEase(opacity, currentTime + duration);
            }
        } catch (err) {
            alert("Error in applyFade: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    /* --- ASSET CREATORS --- */

    /** Centralized Font Applier (v5.1). tracking: optional, +70 for Bebas. */
    function applyBebasFont(layer, size, isBold, tracking) {
        if (!layer || !layer.property("Source Text")) return;
        try {
            var textProp = layer.property("Source Text");
            var textDoc = textProp.value;
            if (!textDoc) return;

            var fontName = isBold ? "BebasNeue-Bold" : "BebasNeue-Regular";
            textDoc.font = fontName;
            textDoc.fontSize = size || 60;
            textDoc.fillColor = [1, 1, 1];
            textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
            if (tracking != null && tracking !== undefined) textDoc.tracking = Number(tracking);

            textProp.setValue(textDoc);

            if (textProp.value.font.indexOf("Bebas") === -1) {
                textDoc.font = isBold ? "Bebas Neue" : "Bebas Neue";
                textProp.setValue(textDoc);
            }
        } catch (e) { /* Silent fail */ }
    }

    /** Add a standard Gold Line with Trim Paths (v5.1 - Safe Move) */
    function addGoldLine() {
        var comp = getActiveComp();
        if (!comp) return;

        app.beginUndoGroup("Add Gold Line");
        try {
            var insertRef = getInsertBeforeLayer(comp);
            var playhead = comp.time;
            var shapeLayer = comp.layers.addShape();
            shapeLayer.name = "THANH GOLD (TRIM)";
            shapeLayer.label = 6;
            shapeLayer.startTime = playhead;
            shapeLayer.property("Position").setValue([comp.width / 2, comp.height / 2]);

            var lineGroup = shapeLayer.property("Contents").addProperty("ADBE Vector Group");
            var pathGroup = lineGroup.property("Contents").addProperty("ADBE Vector Shape - Group");

            var shape = pathGroup.property("Path").value;
            shape.vertices = [[0, 0], [200, 0]];
            pathGroup.property("Path").setValue(shape);

            var stroke = lineGroup.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
            stroke.property("Color").setValue(BRAND.colors.gold);
            stroke.property("Stroke Width").setValue(6);
            stroke.property("Line Cap").setValue(2);

            var trim = lineGroup.property("Contents").addProperty("ADBE Vector Filter - Trim");
            trim.property("End").setValueAtTime(playhead, 0);
            trim.property("End").setValueAtTime(playhead + 0.5, 100);
            setEasyEase(trim.property("End"), playhead);
            setEasyEase(trim.property("End"), playhead + 0.5);

            try {
                var glow = shapeLayer.property("ADBE Effect Parade").addProperty("ADBE Glo2");
                if (glow) {
                    glow.property("Glow Radius").setValue(8);
                    glow.property("Glow Intensity").setValue(0.8);
                    glow.property("Glow Threshold").setValue(0);
                }
            } catch (e) { }

            moveNewLayerToInsertPosition(shapeLayer, insertRef);
            restoreSelectionAfterInsert(comp, insertRef);
        } catch (err) {
            alert("Error in Gold Line: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    /** Add Trading Labels with full text, Bebas Neue & Glow (v4.5) – null-safe property paths */
    function addTradingLabel(type) {
        var comp = getActiveComp();
        if (!comp) return;

        var fullText = "";
        switch (type) {
            case "HH": fullText = "Higher High"; break;
            case "HL": fullText = "Higher Low"; break;
            case "LH": fullText = "Lower High"; break;
            case "LL": fullText = "Lower Low"; break;
            default: fullText = type;
        }

        app.beginUndoGroup("Add Label " + fullText);
        try {
            var textLayer = comp.layers.addText(fullText);
            textLayer.name = "LABEL_" + type;
            textLayer.label = 11;
            textLayer.startTime = comp.time;
            textLayer.outPoint = textLayer.inPoint + 5;

            var centerPos = [comp.width / 2, comp.height / 2];
            var offset = 0;
            for (var i = 1; i <= comp.numLayers; i++) {
                if (comp.layer(i).name === textLayer.name) offset += 40;
            }
            var posProp = textLayer.property("ADBE Transform Group");
            if (posProp) posProp = posProp.property("ADBE Position");
            if (posProp) posProp.setValue([centerPos[0] + offset, centerPos[1] + offset]);

            applyBebasFont(textLayer, 70, true, 70);

            var glow = null;
            try { glow = textLayer.property("ADBE Effect Parade").addProperty("ADBE Glo2"); } catch (e) { }
            if (!glow) try { glow = textLayer.Effects.addProperty("ADBE Glo2"); } catch (e2) { }
            if (glow) {
                try { glow.property("Glow Threshold").setValue(60); } catch (e) { }
                try { glow.property("Glow Radius").setValue(40); } catch (e) { }
                try { glow.property("Glow Intensity").setValue(1.5); } catch (e) { }
            }

            var opacity = textLayer.property("ADBE Transform Group");
            if (opacity) opacity = opacity.property("ADBE Opacity");
            if (opacity) {
                opacity.setValueAtTime(comp.time, 0);
                opacity.setValueAtTime(comp.time + 0.4, 100);
            }
        } catch (err) {
            alert("Error in addTradingLabel: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    // (Removed addZoneBox)




    // (Removed addHoleFX)

    // (Removed addFullscreenText)

    /** Add a Focus Circle / Glow Point - v5.1 */
    function addFocusCircle() {
        var comp = getActiveComp();
        if (!comp) return;

        app.beginUndoGroup("Add Focus Circle");
        try {
            var insertRef = getInsertBeforeLayer(comp);
            var shapeLayer = comp.layers.addShape();
            shapeLayer.name = "FOCUS CIRCLE";
            shapeLayer.label = 9;
            shapeLayer.startTime = comp.time;
            shapeLayer.outPoint = shapeLayer.inPoint + 5;

            var contents = shapeLayer.property("Contents");
            var shapeGroup = contents.addProperty("ADBE Vector Group");
            var ellipse = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
            ellipse.property("Size").setValue([150, 150]);

            var stroke = shapeGroup.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
            stroke.property("Color").setValue(BRAND.colors.gold);
            stroke.property("Stroke Width").setValue(5);

            var glow = shapeLayer.Effects.addProperty("ADBE Glo2");
            glow.property("Glow Threshold").setValue(60);
            glow.property("Glow Radius").setValue(50);

            shapeLayer.property("Position").setValue([comp.width / 2, comp.height / 2]);
            moveNewLayerToInsertPosition(shapeLayer, insertRef);
            restoreSelectionAfterInsert(comp, insertRef);

        } catch (err) {
            alert("Error in addFocusCircle: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    /** PRECIS PRO PRICE CALLOUT - v4.5 (Expression Controlled) */
    function addProPriceCallout(text) {
        var comp = getActiveComp();
        if (!comp) return;

        app.beginUndoGroup("Pro Price Callout");
        try {
            var insertRef = getInsertBeforeLayer(comp);
            var playhead = comp.time;
            var animDur = 0.5;

            // 1. MASTER NULL
            var masterNull = comp.layers.addNull();
            masterNull.name = "MASTER_NULL [CALLOUT]";
            masterNull.label = 6;
            masterNull.property("Position").setValue([comp.width / 2, comp.height / 2]);
            masterNull.startTime = playhead;

            // Expression Controls
            var colorFx = masterNull.Effects.addProperty("ADBE Color Control");
            colorFx.name = "Line Color";
            colorFx.property("Color").setValue(BRAND.colors.gold);

            var lenFx = masterNull.Effects.addProperty("ADBE Slider Control");
            lenFx.name = "Line Length";
            lenFx.property("Slider").setValue(150);

            var rotFx = masterNull.Effects.addProperty("ADBE Angle Control");
            rotFx.name = "Line Rotation";
            rotFx.property("Angle").setValue(-45);

            var posFx = masterNull.Effects.addProperty("ADBE Point Control");
            posFx.name = "Text Position";
            posFx.property("Point").setValue([20, -20]);

            var glowFx = masterNull.Effects.addProperty("ADBE Slider Control");
            glowFx.name = "Glow Intensity";
            glowFx.property("Slider").setValue(1.5);

            // 2. SHAPE_LINE
            var lineLayer = comp.layers.addShape();
            lineLayer.name = "SHAPE_LINE";
            lineLayer.parent = masterNull;
            lineLayer.property("Position").setValue([0, 0]);

            var lineGroup = lineLayer.property("Contents").addProperty("ADBE Vector Group");
            var path = lineGroup.property("Contents").addProperty("ADBE Vector Shape - Group");

            // Expression for Path: Link end point to Slider length
            path.property("Path").expression =
                "var len = parent.effect('Line Length')('Slider');\n" +
                "var shape = value;\n" +
                "shape.vertices = [[0,0], [len, 0]];\n" +
                "shape;";

            // Expression for Rotation: Link to Angle Control
            lineLayer.property("Rotation").expression = "parent.effect('Line Rotation')('Angle')";

            var stroke = lineGroup.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
            stroke.property("Color").expression = "parent.effect('Line Color')('Color')";
            stroke.property("Stroke Width").setValue(4);
            stroke.property("Line Cap").setValue(2); // Round Cap

            var trim = lineGroup.property("Contents").addProperty("ADBE Vector Filter - Trim");
            trim.property("End").setValueAtTime(playhead, 0);
            trim.property("End").setValueAtTime(playhead + animDur, 100);

            // 3. TEXT_CONTENT
            var textLayer = comp.layers.addText(text || "$50,000");
            textLayer.name = "TEXT_CONTENT";
            textLayer.parent = masterNull;
            textLayer.label = 11;

            textLayer.property("Position").expression = "parent.effect('Text Position')('Point')";
            applyBebasFont(textLayer, 60, true);

            // Linear Wipe Logic
            var wipe = textLayer.Effects.addProperty("ADBE Linear Wipe");
            wipe.property("Transition Completion").setValueAtTime(playhead + 0.2, 100);
            wipe.property("Transition Completion").setValueAtTime(playhead + 0.2 + animDur, 0);
            wipe.property("Feather").setValue(60);
            wipe.property("Wipe Angle").expression = "l = thisLayer.parent.effect('Line Rotation')('Angle'); l + 90;";

            // Glow Intensity Link
            var glow = textLayer.Effects.addProperty("ADBE Glo2");
            glow.property("Glow Intensity").expression = "parent.effect('Glow Intensity')('Slider')";
            glow.property("Glow Radius").setValue(30);

            // Position Logic: block (masterNull, textLayer, lineLayer) above selected
            lineLayer.moveBefore(comp.layer(1));
            textLayer.moveBefore(lineLayer);
            masterNull.moveBefore(textLayer);
            moveNewLayerToInsertPosition(masterNull, insertRef);
            restoreSelectionAfterInsert(comp, insertRef);
        } catch (err) {
            alert("Error in Pro Callout: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    /** Add a Symbol Badge */
    function addSymbolBadge(symbol) {
        var comp = getActiveComp();
        if (!comp) return;

        app.beginUndoGroup("Add Symbol Badge");
        try {
            var textLayer = comp.layers.addText(symbol || "BTC/USDT");
            textLayer.name = "Symbol Badge";
            textLayer.startTime = comp.time;
            textLayer.outPoint = comp.time + 5; // Force 5s

            applyBebasFont(textLayer, 60, true);

            // Add a background box
            var bgLayer = comp.layers.addShape();
            bgLayer.name = "Badge BG";
            bgLayer.startTime = comp.time;
            bgLayer.outPoint = comp.time + 5;
            bgLayer.property("Position").setValue([150, 100]);

            var rect = bgLayer.property("Contents").addProperty("ADBE Vector Group").property("Contents").addProperty("ADBE Vector Shape - Rect");
            rect.property("Size").setValue([200, 60]);
            var fill = bgLayer.property("Contents").property(1).property("Contents").addProperty("ADBE Vector Graphic - Fill");
            fill.property("Color").setValue(BRAND.colors.darkBlue); // BRAND DARK BLUE
            bgLayer.property("Opacity").setValue(90);

            textLayer.parent = bgLayer;
            bgLayer.property("Position").setValue([150, 100]);
            bgLayer.moveAfter(textLayer);

        } catch (err) {
            alert("Error in addSymbolBadge: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }



    /**
     * Fullscreen Text (Meme): 4-layer setup at playhead per Audit_Fullscreen_Text.txt.
     * User: enter text in input, select GIF in Project, click GENERATE MEME.
     * Script creates one SCREEN shape layer from preset (Screen.ffx); GIF/Text/Blur/Dark all track matte to that single SCREEN.
     * GIF loop: apply preset LoopGIF.ffx (no script Time Remap logic).
     * Presets: FullscreenText_TextLayerStyles.ffx (text), Screen.ffx (SCREEN), LoopGIF.ffx (GIF loop).
     */
    function addMemeFrame(text, footageItem) {
        var comp = getActiveComp();
        if (!comp) return;

        var footage = (footageItem instanceof FootageItem || footageItem instanceof CompItem) ? footageItem : null;
        if (!footage) {
            var selectedItems = app.project.selection;
            if (selectedItems.length > 0 && (selectedItems[0] instanceof FootageItem || selectedItems[0] instanceof CompItem))
                footage = selectedItems[0];
        }
        if (!footage) {
            alert("Please select a GIF (or video) in the Project panel, then click GENERATE MEME.");
            return;
        }

        var content = (text !== undefined && text !== null && String(text).replace(/^\s+|\s+$/g, "").length > 0)
            ? String(text).replace(/^\s+|\s+$/g, "")
            : "THE MARKET MOVES IN CYCLES";
        var playhead = comp.time;
        var duration = 10.55;
        var memeSpan = Math.max(duration, comp.duration - playhead);
        var cW = comp.width;
        var cH = comp.height;
        var center = [cW / 2, cH / 2];
        var textY = cH * (358 / 1080);
        var gifY = cH * (781 / 1080);

        app.beginUndoGroup("Fullscreen Text (Meme)");
        try {
            var insertRef = getInsertBeforeLayer(comp);
            // Layer 5 (bottom): Dark overlay 70% – opacity 0→70 @ 0.48s (no fade out; user adds)
            var darkBg = comp.layers.addSolid([0.13, 0.16, 0.27], "Dark Royal Blue Solid 1", cW, cH, comp.pixelAspect, comp.duration);
            darkBg.startTime = playhead;
            darkBg.outPoint = playhead + memeSpan;
            darkBg.property("ADBE Transform Group").property("ADBE Anchor Point").setValue(center);
            darkBg.property("ADBE Transform Group").property("ADBE Position").setValue(center);
            var darkOp = darkBg.property("ADBE Transform Group").property("ADBE Opacity");
            darkOp.setValueAtTime(playhead, 0);
            darkOp.setValueAtTime(playhead + 0.483, 70);
            setEasyEase(darkOp, playhead);
            setEasyEase(darkOp, playhead + 0.483);

            // Layer 4: Blur overlay – Gaussian 20, opacity 0→100 @ 0.15s (no fade out; user adds)
            var blurAdj = comp.layers.addSolid([1, 1, 1], "Adjustment Layer 1", cW, cH, comp.pixelAspect, comp.duration);
            blurAdj.adjustmentLayer = true;
            blurAdj.startTime = playhead;
            blurAdj.outPoint = playhead + memeSpan;
            blurAdj.property("ADBE Transform Group").property("ADBE Anchor Point").setValue(center);
            blurAdj.property("ADBE Transform Group").property("ADBE Position").setValue(center);
            var blurEff = blurAdj.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
            try { blurEff.property("ADBE Gaussian Blur 2-0001").setValue(20); } catch (e) { try { blurEff.property("Blurriness").setValue(20); } catch (e2) { } }
            var blurOp = blurAdj.property("ADBE Transform Group").property("ADBE Opacity");
            blurOp.setValueAtTime(playhead, 0);
            blurOp.setValueAtTime(playhead + 0.15, 100);
            setEasyEase(blurOp, playhead);
            setEasyEase(blurOp, playhead + 0.15);

            // Layer 2: Text – BebasNeueBold 100, gold fill, justification 7415, tracking 0, Glow (Threshold 153, Radius 20), Animator Offset 0→100 (0.5–8.717s), exit opacity 10.05→10.533
            var safeContent = content.length > 0 ? content : "THE MARKET MOVES IN CYCLES";
            var textLayer = comp.layers.addText(safeContent);
            textLayer.name = safeContent.substring(0, 50);
            textLayer.startTime = playhead;
            textLayer.inPoint = playhead + 0.5;
            textLayer.outPoint = playhead + memeSpan;
            textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([cW / 2, textY]);
            var tProp = textLayer.property("Source Text");
            var tDoc = tProp.value;
            tDoc.font = "BebasNeueBold";
            tDoc.fontSize = 100;
            tDoc.fillColor = [0.76862, 0.57648, 0.17255];
            try { tDoc.justification = 7415; } catch (e) { tDoc.justification = ParagraphJustification.CENTER_JUSTIFY; }
            tDoc.tracking = 0;
            tProp.setValue(tDoc);
            var glowEff = textLayer.property("ADBE Effect Parade").addProperty("ADBE Glo2");
            try { glowEff.property("ADBE Glo2-0001").setValue(2); } catch (e) { }
            try { glowEff.property("ADBE Glo2-0002").setValue(153); } catch (e) { }
            try { glowEff.property("ADBE Glo2-0003").setValue(20); } catch (e) { glowEff.property("Glow Radius").setValue(20); }
            try { glowEff.property("ADBE Glo2-0004").setValue(0.5); } catch (e) { }
            // Text reveal: same as Section Text – Animator 1 (base opacity 0) + Animator 2 (Range End 0→100). Duration scales with text length.
            var revealDurFullscreen = Math.max(2, Math.min(10, 1.5 + safeContent.length * 0.04));
            var revealStartFullscreen = playhead + 0.5;
            var revealEndFullscreen = revealStartFullscreen + revealDurFullscreen;
            var animBaseMeme = textLayer.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
            animBaseMeme.name = "Animator 1";
            var selBaseMeme = animBaseMeme.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
            if (selBaseMeme) {
                try { selBaseMeme.property("ADBE Text Percent Start").setValue(0); } catch (e) { try { selBaseMeme.property("ADBE Text Selector Start").setValue(0); } catch (e2) { } }
                try { selBaseMeme.property("ADBE Text Percent End").setValue(100); } catch (e) { try { selBaseMeme.property("ADBE Text Selector End").setValue(100); } catch (e2) { } }
            }
            try {
                var opBaseMeme = animBaseMeme.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity");
                if (opBaseMeme) opBaseMeme.setValue(0);
            } catch (e) { }
            var animRevealMeme = textLayer.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
            animRevealMeme.name = "Animator 2";
            var selRevealMeme = animRevealMeme.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
            if (selRevealMeme) {
                try { selRevealMeme.property("ADBE Text Percent Start").setValue(0); } catch (e) { try { selRevealMeme.property("ADBE Text Selector Start").setValue(0); } catch (e2) { } }
                try { selRevealMeme.property("Advanced").property("Based On").setValue(1); } catch (e) { }
                var endPropMeme = selRevealMeme.property("ADBE Text Percent End");
                if (!endPropMeme) endPropMeme = selRevealMeme.property("ADBE Text Selector End");
                if (endPropMeme) {
                    try {
                        endPropMeme.setValueAtTime(revealStartFullscreen, 0);
                        endPropMeme.setValueAtTime(revealEndFullscreen, 100);
                        setEasyEase(endPropMeme, revealStartFullscreen);
                        setEasyEase(endPropMeme, revealEndFullscreen);
                    } catch (eEnd) {
                        endPropMeme.setValue(100);
                    }
                }
            }
            try {
                var animOpMeme = animRevealMeme.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity");
                if (animOpMeme) animOpMeme.setValue(100);
            } catch (eOpacity) { }
            if (FULLSCREEN_TEXT_LAYERSTYLES_PRESET.exists) {
                try {
                    for (var sl = 1; sl <= comp.numLayers; sl++) comp.layer(sl).selected = false;
                    textLayer.selected = true;
                    textLayer.applyPreset(FULLSCREEN_TEXT_LAYERSTYLES_PRESET);
                } catch (ePreset) { }
            }

            // Layer 1 (top): GIF – position bottom third, opacity 0@2.95 100@3.7 (no fade out; user adds). Loop via preset LoopGIF.ffx.
            var memeLayer = comp.layers.add(footage);
            memeLayer.name = footage.name || "GIF";
            memeLayer.startTime = playhead;
            memeLayer.inPoint = playhead + 0.5;
            memeLayer.outPoint = playhead + Math.max(comp.duration, 60);
            memeLayer.property("ADBE Transform Group").property("ADBE Position").setValue([cW / 2, gifY]);
            var gifH = memeLayer.height || 400;
            var maxGifH = cH * 0.35;
            var scaleVal = Math.min(100, (maxGifH / gifH) * 100);
            memeLayer.property("ADBE Transform Group").property("ADBE Scale").setValue([scaleVal, scaleVal, 100]);
            if (LOOP_GIF_PRESET.exists) {
                try {
                    for (var gl = 1; gl <= comp.numLayers; gl++) comp.layer(gl).selected = false;
                    memeLayer.selected = true;
                    memeLayer.applyPreset(LOOP_GIF_PRESET);
                } catch (eLoop) { }
            }
            memeLayer.outPoint = playhead + Math.max(comp.duration, 60);
            var gifOp = memeLayer.property("ADBE Transform Group").property("ADBE Opacity");
            gifOp.setValueAtTime(playhead + 2.95, 0);
            gifOp.setValueAtTime(playhead + 3.7, 100);
            setEasyEase(gifOp, playhead + 2.95);
            setEasyEase(gifOp, playhead + 3.7);
            var screenLayer = null;
            try {
                if (SCREEN_PRESET.exists) {
                    screenLayer = comp.layers.addShape();
                    screenLayer.name = "SCREEN";
                    screenLayer.startTime = playhead;
                    screenLayer.inPoint = playhead;
                    screenLayer.outPoint = playhead + memeSpan;
                    for (var sl = 1; sl <= comp.numLayers; sl++) comp.layer(sl).selected = false;
                    screenLayer.selected = true;
                    screenLayer.applyPreset(SCREEN_PRESET);
                    safeSetMatte(memeLayer, screenLayer, TrackMatteType.ALPHA);
                    safeSetMatte(textLayer, screenLayer, TrackMatteType.ALPHA);
                    safeSetMatte(blurAdj, screenLayer, TrackMatteType.ALPHA);
                    safeSetMatte(darkBg, screenLayer, TrackMatteType.ALPHA);
                }
            } catch (eMatte) { }

            // Order top→bottom: 1.GIF, 2.Text, 3.Adjustment Layer, 4.Dark Blue, 5.Screen
            if (screenLayer) moveNewLayerToInsertPosition(screenLayer, insertRef);
            moveNewLayerToInsertPosition(darkBg, insertRef);
            moveNewLayerToInsertPosition(blurAdj, insertRef);
            moveNewLayerToInsertPosition(textLayer, insertRef);
            moveNewLayerToInsertPosition(memeLayer, insertRef);
            restoreSelectionAfterInsert(comp, insertRef);
        } catch (err) {
            alert("Error in Fullscreen Text (Meme): " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    // ---------------------------------------------------------------------------------
    // SUPER ZOOM – Chọn 1 Shape + 1 Video. Null Scale keyframes (60fps): frame 0→100%, 40→130%, 265→130%, 300→100%; Masking/Screen/Blur không fade.
    // 1. Null at tâm Shape, parent Video + Shape + Blur. Scale theo keyframe data (0/40/265/300), Easy Ease.
    // 2. Masking, 3. Screen, 4. Gaussian Blur: cùng timeline với Null (startTime = playhead), opacity 100%. Thứ tự: Screen, Gaussian Blur, Masking, Video.
    // ---------------------------------------------------------------------------------
    function addSuperZoom() {
        var comp = getActiveComp();
        if (!comp) return;

        var sel = comp.selectedLayers;
        if (!sel || sel.length !== 2) {
            alert("Select exactly 2 layers: 1 Shape Layer (fill 0C1F34) and 1 Video Layer, then click Super Zoom.");
            return;
        }
        var shapeLayer = null;
        var videoLayer = null;
        for (var s = 0; s < sel.length; s++) {
            var ly = sel[s];
            if (ly instanceof ShapeLayer) shapeLayer = ly;
            else if (!ly.nullLayer && !(ly instanceof TextLayer)) videoLayer = ly;
        }
        if (!shapeLayer || !videoLayer) {
            alert("Selection must include 1 Shape Layer and 1 Video Layer.");
            return;
        }

        var playhead = comp.time;
        var fps = comp.frameRate || 30;
        var zoomDurTotal = 5.0; // User requested back to 5s
        var zoomInEnd = zoomDurTotal / 2;
        var fadeDur = 5; // Buffer for layer outpoint
        var span = zoomDurTotal + fadeDur; // Fixed duration (approx 10s) instead of extending to end of comp

        function addRectMaskToLayer(layer, leftC, topC, widthC, heightC, inverted) {
            try {
                var maskProp = layer.property("ADBE Mask Parade");
                if (!maskProp) maskProp = layer.property("Masks");
                if (!maskProp) return;
                var m = maskProp.addProperty("ADBE Mask Atom");
                var mShape = m.property("ADBE Mask Shape");
                var sh = mShape.value;
                var l = leftC, t = topC, w = Math.max(1, widthC), h = Math.max(1, heightC);
                sh.vertices = [[l, t], [l + w, t], [l + w, t + h], [l, t + h]];
                sh.inTangents = []; sh.outTangents = [];
                sh.closed = true;
                mShape.setValue(sh);
                try { layer.mask(maskProp.numProperties).inverted = !!inverted; } catch (e2) { }
                try { if (typeof layer.mask(maskProp.numProperties).maskMode !== "undefined") layer.mask(maskProp.numProperties).maskMode = MaskMode.ADD; } catch (e3) { }
            } catch (e) { }
        }

        var r = { left: 0, top: 0, width: 200, height: 100 };
        try { r = shapeLayer.sourceRectAtTime(playhead, false); } catch (e) { }
        // Logic: Place Null at visual center of shape WITHOUT modifying shape's transform
        var shapeAnchorComp = [comp.width / 2, comp.height / 2];
        try {
            // Calculate visual center in Local Space
            var localCenter = [r.left + r.width / 2, r.top + r.height / 2];

            // Use toComp to get absolute position in Comp Space
            // toComp expects a 3D point if the layer is 3D, or 2D/3D depending on layer type.
            // We'll safely construct the point.
            if (shapeLayer.threeDLayer) {
                shapeAnchorComp = shapeLayer.toComp([localCenter[0], localCenter[1], 0]);
            } else {
                shapeAnchorComp = shapeLayer.toComp([localCenter[0], localCenter[1]]);
            }
        } catch (e) {
            // Fallback: use shape's current position if toComp fails
            try { shapeAnchorComp = shapeLayer.property("ADBE Transform Group").property("ADBE Position").value; } catch (e2) { }
        }

        app.beginUndoGroup("Super Zoom Final Fix");
        try {
            // 1. Null Collect at tâm Shape; parent Video + Shape; keyframe Scale (và Position nếu cần) 15–20 frames, Easy Ease
            var nullCollect = comp.layers.addNull();

            // Fix: Move Null to the position of the selected layers (above the topmost one)
            var topLayer = shapeLayer;
            if (videoLayer && videoLayer.index < shapeLayer.index) topLayer = videoLayer;
            if (topLayer) nullCollect.moveBefore(topLayer);
            nullCollect.name = "Null Collect";
            nullCollect.startTime = playhead;
            nullCollect.outPoint = playhead + span;
            var nullT = nullCollect.property("ADBE Transform Group");
            nullT.property("ADBE Position").setValue(shapeAnchorComp);
            nullT.property("ADBE Anchor Point").setValue([50, 50]);
            var fpsNull = 60;
            // New 3s Timing (180 frames total)
            // 0 -> 21 (0.35s): Zoom In
            // 21 -> 145 (2.4s): Hold
            // 145 -> 180 (3.0s): Zoom Out
            var tInStart = playhead;
            var tInEnd = playhead + 21 / fpsNull;
            var tOutStart = playhead + 145 / fpsNull;
            var tOutEnd = playhead + 180 / fpsNull;

            nullT.property("ADBE Scale").setValueAtTime(tInStart, [100, 100]);
            nullT.property("ADBE Scale").setValueAtTime(tInEnd, [130, 130]);
            nullT.property("ADBE Scale").setValueAtTime(tOutStart, [130, 130]);
            nullT.property("ADBE Scale").setValueAtTime(tOutEnd, [100, 100]);

            setEasyEase(nullT.property("ADBE Scale"), tInStart);
            setEasyEase(nullT.property("ADBE Scale"), tInEnd);
            setEasyEase(nullT.property("ADBE Scale"), tOutStart);
            setEasyEase(nullT.property("ADBE Scale"), tOutEnd);

            videoLayer.parent = nullCollect;
            shapeLayer.parent = nullCollect;

            // 2. Đổi tên Shape → Masking; Center Anchor Done; Mask Inverted; Stroke; Glow
            shapeLayer.name = "Masking";

            // Ensure Mask exists
            var maskingHasMask = shapeLayer.property("ADBE Mask Parade") && shapeLayer.property("ADBE Mask Parade").numProperties > 0;
            if (!maskingHasMask) {
                // Add mask (Inverted = true based on request)
                addRectMaskToLayer(shapeLayer, r.left, r.top, Math.max(1, r.width), Math.max(1, r.height), true);
            }

            // Force Inverted Mask settings
            try {
                var maskParade = shapeLayer.property("ADBE Mask Parade");
                if (maskParade && maskParade.numProperties > 0) {
                    var m = shapeLayer.mask(1);
                    m.inverted = true; // Request: "xong thì nó bật Inverted"
                    try { if (typeof m.maskMode !== "undefined") m.maskMode = MaskMode.ADD; } catch (e) { }
                }
            } catch (e) { }
            shapeLayer.startTime = playhead;
            shapeLayer.inPoint = playhead; // Fix timeline offset
            shapeLayer.outPoint = playhead + zoomDurTotal + fadeDur;
            shapeLayer.enabled = true;
            // shapeLayer.property("ADBE Transform Group").property("ADBE Opacity").setValue(70); // Handled by Keyframes now

            // Add Fill to Masking Layer?
            // User Data: Fill #3 Color: 12, 31, 52 (Alpha 12/255 ~ 4.7%)
            // Only add if Shape Layer is native shape, otherwise if footage, Fill effect needed.
            // "addRectMaskToLayer" implies it might be a Solid or Footage with Mask? 
            // BUT initial creation logic uses 'addShape' for ScreenMatte, but Masking comes from SELECTED LAYER.
            // If selected is Video/Image, we can't add Vector Fill. Use "Fill" effect.
            // Actually, let's skip Shape Fill update on "Masking" layer unless we know it's a Shape.
            // Assuming Masking keeps original content but just has Stroke/Glow/Opacity.
            var fadeStart = playhead;

            var strokeEff = null;
            try { strokeEff = shapeLayer.Effects.addProperty("ADBE Stroke Effect"); } catch (e) {
                try { strokeEff = shapeLayer.Effects.addProperty("Stroke"); } catch (e2) { }
            }
            if (strokeEff) {
                strokeEff.name = "Stroke";
                try { strokeEff.property("Path").setValue(1); } catch (e) { }
                try { strokeEff.property("All Masks").setValue(false); } catch (e) { }
                try { strokeEff.property("Stroke Sequentially").setValue(true); } catch (e) { }
                // Color: 236, 118, 3
                try { strokeEff.property("Color").setValue([236 / 255, 118 / 255, 3 / 255]); } catch (e) { }
                try { strokeEff.property("Brush Size").setValue(4); } catch (e) { try { strokeEff.property("Brush Scale").setValue(4); } catch (e2) { } }
                try { strokeEff.property("Brush Hardness").setValue(79); } catch (e) { }
                try { strokeEff.property("Opacity").setValue(100); } catch (e) { }
                try { strokeEff.property("Start").setValue(0); } catch (e) { }
                try { strokeEff.property("Spacing").setValue(15); } catch (e) { }
                try { strokeEff.property("Paint Style").setValue(1); } catch (e) { }
                var endProp = null;
                try { endProp = strokeEff.property("End"); } catch (e) { }
                if (endProp) {
                    var fpsKey = 60;
                    // Adjusted to fit 3s duration (180 frames)
                    // Fade In: 0 -> 48 frames (0.8s) - slightly faster than 60
                    // Hold: Until near end
                    // Fade Out: Last ~40-50 frames

                    var t0 = fadeStart + 0;
                    var t1 = fadeStart + 48 / fpsKey;      // 0.8s Fade In
                    var t2 = fadeStart + 130 / fpsKey;     // 2.16s Start Fade Out
                    var t3 = fadeStart + 180 / fpsKey;     // 3.0s End

                    endProp.setValueAtTime(t0, 0);
                    endProp.setValueAtTime(t1, 100);
                    endProp.setValueAtTime(t2, 100);
                    endProp.setValueAtTime(t3, 0);

                    setEasyEase(endProp, t0);
                    setEasyEase(endProp, t1);
                    setEasyEase(endProp, t2);
                    setEasyEase(endProp, t3);

                    // SYNC OPACITY WITH STROKE END
                    // User Data: Opacity 0 -> 75 -> 75 -> 0
                    var opProp = shapeLayer.property("ADBE Transform Group").property("ADBE Opacity");
                    if (opProp) {
                        opProp.setValueAtTime(t0, 0);
                        opProp.setValueAtTime(t1, 75);
                        opProp.setValueAtTime(t2, 75);
                        opProp.setValueAtTime(t3, 0);
                    }
                }
            }

            var glowEff = null;
            try { glowEff = shapeLayer.property("ADBE Effect Parade").addProperty("ADBE Glo2"); } catch (e) { }
            if (!glowEff) try { glowEff = shapeLayer.Effects.addProperty("ADBE Glo2"); } catch (e2) { }
            if (glowEff) {
                // Fix for Glow Threshold issue (User sees 9.8% when set to 25).
                // AE seems to treat this as 0-255 scale in this context? 
                // 25 input -> 9.8% displayed implies 25/255 = 0.098.
                // Target: 25% displayed. 
                // Required input: 25 * 2.55 = 63.75.
                // Also adding loop to ensure we find the property by Name or MatchName.
                var threshSet = false;
                for (var i = 1; i <= glowEff.numProperties; i++) {
                    var p = glowEff.property(i);
                    if (p.name === "Glow Threshold" || p.matchName === "ADBE Glo2-0002") {
                        try { p.setValue(153); threshSet = true; } catch (e) { }
                    }
                }
                // Fallback direct calls if loop failed or just to be safe
                if (!threshSet) {
                    try { glowEff.property("Glow Threshold").setValue(153); } catch (e) { // 60% * 2.55 = 153
                        try { glowEff.property(2).setValue(153); } catch (e2) { }
                    }
                }

                try { glowEff.property("Glow Radius").setValue(10); } catch (e) { }
                try { glowEff.property("Glow Intensity").setValue(1); } catch (e) { }
                try { glowEff.property("Composite Original").setValue(2); } catch (e) { }
            }


            var blurLayer = shapeLayer.duplicate();
            blurLayer.name = "Gaussian Blur";
            blurLayer.adjustmentLayer = true;
            blurLayer.parent = nullCollect; // Inherited from duplicate, but explicit for clarity
            blurLayer.moveAfter(shapeLayer); // Order: Masking > Blur > Video
            try { blurLayer.trackMatteLayer = null; } catch (e) { } // Explicitly No Matte as requested
            try { blurLayer.setTrackMatte(TrackMatteType.NO_TRACK_MATTE); } catch (e) { } // For newer AE versions

            // Remove existing effects (Stroke, Glow) from duplicate
            var blurEffParade = blurLayer.property("ADBE Effect Parade");
            if (blurEffParade) {
                for (var ei = blurEffParade.numProperties; ei >= 1; ei--) {
                    try { blurEffParade.property(ei).remove(); } catch (e) { }
                }
            }
            // Add Gaussian Blur
            var gaussBlur = null;
            try { gaussBlur = blurLayer.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2"); } catch (e) { }
            if (!gaussBlur) try { gaussBlur = blurLayer.Effects.addProperty("ADBE Gaussian Blur 2"); } catch (e2) { }
            if (gaussBlur) {
                try { gaussBlur.property("ADBE Gaussian Blur 2-0001").setValue(30); } catch (e) { try { gaussBlur.property("Blurriness").setValue(30); } catch (e2) { } }
            }
            // Keep Opacity Keyframes from Masking Layer (0->75->75->0) as requested ("giống Masking Layer luôn")

            // Reordering already handled by moveAfter above.

            // 5. Setup Screen Matte (Shared Matte Source)
            var screenLayer = comp.layers.addShape();
            screenLayer.name = "Screen Matte";
            screenLayer.enabled = false;
            screenLayer.startTime = playhead;
            screenLayer.outPoint = playhead + zoomDurTotal + fadeDur;
            screenLayer.locked = false;

            var sg = screenLayer.property("Contents").addProperty("ADBE Vector Group");
            var rect = sg.property("Contents").addProperty("ADBE Vector Shape - Rect");
            rect.property("Size").setValue([r.width, r.height]);
            rect.property("Position").setValue([r.left + r.width / 2, r.top + r.height / 2]);
            var fill = sg.property("Contents").addProperty("ADBE Vector Graphic - Fill");
            fill.property("Color").setValue([1, 1, 1, 1]);

            // Set Screen Matte Scale to 90% as requested
            screenLayer.property("ADBE Transform Group").property("ADBE Scale").setValue([90, 90]);

            // screenLayer.parent = nullCollect; // REMOVED as requested: Screen Matte should NOT be parented to Null.

            // ORDERING layers:
            // Requested: Null -> Screen Matte -> Masking -> Blur -> Video (Top to Bottom)

            // 1. Screen Matte below Null
            screenLayer.moveAfter(nullCollect);

            // 2. Masking below Screen Matte
            shapeLayer.moveAfter(screenLayer);

            // 3. Blur below Masking
            blurLayer.moveAfter(shapeLayer);

            // 4. Video below Blur
            videoLayer.moveAfter(blurLayer);

            // TRACK MATTES (AE 2025 Shared Matte Feature)
            // Masking: Track Matte -> Screen Matte (Alpha)
            safeSetMatte(shapeLayer, screenLayer, TrackMatteType.ALPHA);

            // Blur: NO TRACK MATTE (Requested by user)
            try { blurLayer.trackMatteLayer = null; } catch (e) { }
            try { blurLayer.setTrackMatte(TrackMatteType.NO_TRACK_MATTE); } catch (e) { }

            // Video: Track Matte -> Screen Matte (Alpha) to crop content to 90% box
            safeSetMatte(videoLayer, screenLayer, TrackMatteType.ALPHA);

            restoreSelectionAfterInsert(comp, nullCollect);
        } catch (err) {
            alert("Super Zoom Error: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    // ---------------------------------------------------------------------------------
    /** Tool: Circle Highlight (Circular Masking Effect) */
    function addCircle() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return;

        app.beginUndoGroup("Add Circle Highlight");
        try {
            var playhead = comp.time;
            var fps = 60;
            var size = 200; // Default size

            // 1. Create Shape Layer (Circle)
            var circleLayer = comp.layers.addShape();
            circleLayer.name = "Circle Highlight";

            var contents = circleLayer.property("ADBE Root Vectors Group");
            var circleGroup = contents.addProperty("ADBE Vector Group");
            circleGroup.name = "Circle";

            var ellipse = circleGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Ellipse");
            ellipse.property("ADBE Vector Ellipse Size").setValue([size, size]);

            // No Fill, just Stroke and Glow (using effects like the user requested)
            // Add a temporary mask for the Stroke effect to work on
            var mask = circleLayer.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
            mask.name = "Mask 1";
            var maskShape = mask.property("ADBE Mask Shape");
            var myShape = new Shape();
            // Simple circular path - Reversed for Counter-Clockwise
            myShape.vertices = [[-size / 2, 0], [0, size / 2], [size / 2, 0], [0, -size / 2]];
            myShape.inTangents = [[0, -size / 4], [-size / 4, 0], [0, size / 4], [size / 4, 0]];
            myShape.outTangents = [[0, size / 4], [size / 4, 0], [0, -size / 4], [-size / 4, 0]];
            myShape.closed = true;
            maskShape.setValue(myShape);

            // 2. Add Effects (Stroke & Glow)
            var strokeEff = null;
            try { strokeEff = circleLayer.Effects.addProperty("ADBE Stroke Effect"); } catch (e) {
                try { strokeEff = circleLayer.Effects.addProperty("Stroke"); } catch (e2) { }
            }
            if (strokeEff) {
                strokeEff.name = "Stroke";
                try { strokeEff.property("Path").setValue(1); } catch (e) { }
                try { strokeEff.property("Color").setValue([236 / 255, 76 / 255, 3 / 255]); } catch (e) { } // Orange
                try { strokeEff.property("Brush Size").setValue(4); } catch (e) { try { strokeEff.property("Brush Scale").setValue(4); } catch (e2) { } }
                try { strokeEff.property("Brush Hardness").setValue(79); } catch (e) { }
                try { strokeEff.property("Paint Style").setValue(2); } catch (e) { } // On Transparent
            }

            var glowEff = null;
            try { glowEff = circleLayer.Effects.addProperty("ADBE Glo2"); } catch (e) {
                try { glowEff = circleLayer.Effects.addProperty("Glow"); } catch (e2) { }
            }
            if (glowEff) {
                glowEff.name = "Glow";
                try { glowEff.property("Glow Threshold").setValue(60); } catch (e) { }
                try { glowEff.property("Glow Radius").setValue(10); } catch (e) { }
                try { glowEff.property("Glow Intensity").setValue(1); } catch (e) { }
                try { glowEff.property("Composite Original").setValue(2); } catch (e) { } // Behind
            }

            // 3. Animation (Matching User's Stroke Data: 0-48-229-280)
            if (strokeEff) {
                var endProp = null;
                try { endProp = strokeEff.property("End"); } catch (e) { }
                if (endProp) {
                    var t0 = playhead + 0 / fps;
                    var t1 = playhead + 48 / fps;
                    var t2 = playhead + 229 / fps;
                    var t3 = playhead + 280 / fps;

                    endProp.setValueAtTime(t0, 0);
                    endProp.setValueAtTime(t1, 100);
                    endProp.setValueAtTime(t2, 100);
                    endProp.setValueAtTime(t3, 0);

                    setEasyEase(endProp, t0);
                    setEasyEase(endProp, t1);
                    setEasyEase(endProp, t2);
                    setEasyEase(endProp, t3);
                }
            }

            circleLayer.startTime = playhead;
            circleLayer.guideLayer = true; // Make it a guide layer by default if needed, or keeping it normal
            circleLayer.moveToBeginning();
            circleLayer.selected = true;

        } catch (err) {
            // alert("Circle error: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    // ---------------------------------------------------------------------------------
    // BRIGHTNESS – (REMOVED as requested)
    // ---------------------------------------------------------------------------------

    /** Helper: Create full screen rectangle for Super Zoom (Color #0C1F34) */
    function createZoomShape() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return;

        // Capture selection BEFORE creating new layer (which changes selection)
        var targetLayer = null;
        if (comp.selectedLayers.length > 0) {
            targetLayer = comp.selectedLayers[0];
        }

        app.beginUndoGroup("Create Zoom Shape");
        try {
            var r = comp.layers.addShape();
            r.name = "Focus Shape (0C1F34)";
            var c = r.property("Contents").addProperty("ADBE Vector Group");
            var rect = c.property("Contents").addProperty("ADBE Vector Shape - Rect");
            rect.property("Size").setValue([comp.width, comp.height]);
            rect.property("Position").setValue([0, 0]);
            var fill = c.property("Contents").addProperty("ADBE Vector Graphic - Fill");
            fill.property("Color").setValue([12 / 255, 31 / 255, 52 / 255, 1]);
            r.label = 13; // Royal Blue

            // Timing & Order
            r.startTime = comp.time;

            if (targetLayer) {
                r.moveBefore(targetLayer); // Place above originally selected layer
            }
        } catch (err) { } finally {
            app.endUndoGroup();
        }
    }


    // ---------------------------------------------------------------------------------
    // HIGHLIGHT BASIC – Draw a shape for highlight area, select it, then run. Sets left-center anchor, applies Layer Styles preset, scale 0→100→100→0. Requires Highlight_LayerStyles.ffx in User Presets.
    // ---------------------------------------------------------------------------------
    function addHighlightBasic() {
        var comp = getActiveComp();
        if (!comp) return;

        app.beginUndoGroup("Highlight Basic " + (typeof TRADINGPOWER_VERSION_TEXT !== "undefined" ? TRADINGPOWER_VERSION_TEXT : "TradingPower Tool v9.1"));
        try {
            var playhead = comp.time;
            var fps = 60;
            try { fps = comp.frameRate; } catch (e) { }
            var frame0 = 0;
            var frame50 = 50 / fps;
            var frame241 = 241 / fps;
            var frame291 = 291 / fps;

            var shapeLayer = null;
            var selected = comp.selectedLayers;
            for (var i = 0; i < selected.length; i++) {
                if (selected[i] instanceof ShapeLayer) {
                    shapeLayer = selected[i];
                    break;
                }
            }
            if (!shapeLayer) {
                alert("Draw a shape for the highlight area (rect or path), select it, then click Highlight Basic.");
                return;
            }

            var tGroup = shapeLayer.property("ADBE Transform Group");
            if (!tGroup) return;
            var oldAnchor = [0, 0];
            var oldPos = [comp.width / 2, comp.height / 2];
            try { oldAnchor = tGroup.property("ADBE Anchor Point").value; } catch (e) { }
            try { oldPos = tGroup.property("ADBE Position").value; } catch (e) { }

            var bounds = { left: 0, top: 0, width: 100, height: 100 };
            try { bounds = shapeLayer.sourceRectAtTime(playhead, false); } catch (e) { }
            var leftCenter = [bounds.left, bounds.top + bounds.height / 2];
            tGroup.property("ADBE Anchor Point").setValue(leftCenter);
            var newPos = [oldPos[0] + (oldAnchor[0] - leftCenter[0]), oldPos[1] + (oldAnchor[1] - leftCenter[1])];
            try { tGroup.property("ADBE Position").setValue(newPos); } catch (e) { }

            if (HIGHLIGHT_LAYERSTYLES_PRESET.exists) {
                try {
                    for (var sl = 1; sl <= comp.numLayers; sl++) comp.layer(sl).selected = false;
                    shapeLayer.selected = true;
                    shapeLayer.applyPreset(HIGHLIGHT_LAYERSTYLES_PRESET);
                } catch (ePreset) {
                    alert("Highlight Basic: apply preset failed.\n" + (ePreset.toString ? ePreset.toString() : String(ePreset)));
                }
            } else {
                alert("Highlight Basic: preset file not found.\nMake sure " + HIGHLIGHT_LAYERSTYLES_PRESET.name + " is in the 'presets' folder next to the script.");
            }

            var sProp = shapeLayer.property("ADBE Transform Group").property("ADBE Scale");
            sProp.setValueAtTime(playhead + frame0, [0, 100, 100]);
            sProp.setValueAtTime(playhead + frame50, [100, 100, 100]);
            sProp.setValueAtTime(playhead + frame241, [100, 100, 100]);
            sProp.setValueAtTime(playhead + frame291, [0, 100, 100]);
            setEasyEase(sProp, playhead + frame0);
            setEasyEase(sProp, playhead + frame50);
            setEasyEase(sProp, playhead + frame241);
            setEasyEase(sProp, playhead + frame291);

        } catch (err) {
            alert("Error in Highlight Basic: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    // ---------------------------------------------------------------------------------
    // SECTION TEXT – Per Audit_Section_Text. Text: BebasNeueBold 70, fill, justification 7413, tracking 0, Animator End 0→100 reveal. No Layer Styles on text.
    // Shape: anchor to center (Ctrl+Alt+Home), then to left-edge center for horizontal scale; apply Highlight_LayerStyles.ffx, Scale 0→100 BEZIER 0.833s, exit opacity 5.433→5.933.
    // ---------------------------------------------------------------------------------
    function addSectionText(textStr, fromAudit) {
        var comp = getActiveComp();
        if (!comp) return;

        app.beginUndoGroup("Add Section Text " + (typeof TRADINGPOWER_VERSION_TEXT !== "undefined" ? TRADINGPOWER_VERSION_TEXT : "TradingPower Tool v9.1"));
        try {
            var insertRef = getInsertBeforeLayer(comp);
            var A = fromAudit || {};
            var duration = A.duration != null ? A.duration : 5.933;
            var entryDur = A.entryDur != null ? A.entryDur : 0.833;
            var revealDur = A.revealDur != null ? A.revealDur : (entryDur + 0.5);   // 0.5s slower than shape scale
            var exitStart = A.exitStart != null ? A.exitStart : 5.433;
            var exitEnd = A.exitEnd != null ? A.exitEnd : 5.933;
            var center = (A.position && A.position.length >= 2) ? [A.position[0], A.position[1]] : [comp.width / 2, comp.height / 2];
            var playhead = comp.time;
            var fillColor = (A.fillColor && A.fillColor.length >= 3) ? A.fillColor : [0.98, 0.96, 0.9];
            var shapeFill = (A.shapeFill && A.shapeFill.length >= 3) ? A.shapeFill : [0.925, 0.463, 0.012];
            var tracking = A.tracking != null ? A.tracking : 0;

            var textLayer = comp.layers.addText(textStr);
            textLayer.name = String(textStr).substring(0, 80);
            textLayer.startTime = playhead;
            textLayer.outPoint = playhead + duration;

            var tProp = textLayer.property("Source Text");
            var tDoc = tProp.value;
            tDoc.font = "BebasNeueBold";
            tDoc.fontSize = 70;
            try { tDoc.justification = 7413; } catch (e) { tDoc.justification = ParagraphJustification.CENTER_JUSTIFY; }
            tDoc.fillColor = fillColor;
            try { tDoc.tracking = tracking; } catch (e) { }
            tProp.setValue(tDoc);

            var rectText = textLayer.sourceRectAtTime(playhead + 0.5, false);
            var anchorLeft = [rectText.left, rectText.top + rectText.height / 2];
            textLayer.property("ADBE Transform Group").property("ADBE Anchor Point").setValue(anchorLeft);
            // Text position set after shape position

            var paddingH = 80;
            var paddingV = 40;
            var boxWidth = rectText.width + (paddingH * 2);
            var boxHeight = rectText.height + (paddingV * 2);

            var shapeLayer = comp.layers.addShape();
            shapeLayer.name = "Shape Layer 7";
            shapeLayer.startTime = playhead;
            shapeLayer.outPoint = playhead + duration;
            shapeLayer.moveAfter(textLayer);

            var sg = shapeLayer.property("Contents").addProperty("ADBE Vector Group");
            var rectShape = sg.property("Contents").addProperty("ADBE Vector Shape - Rect");
            rectShape.property("Size").setValue([boxWidth, boxHeight]);
            rectShape.property("Roundness").setValue(20);

            var stroke = sg.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
            stroke.property("Color").setValue([1, 1, 1, 1]);
            stroke.property("Stroke Width").setValue(5);

            var fill = sg.property("Contents").addProperty("ADBE Vector Graphic - Fill");
            fill.property("Color").setValue([shapeFill[0], shapeFill[1], shapeFill[2], 1]);

            var tGroup = shapeLayer.property("ADBE Transform Group");
            var bounds = { left: 0, top: 0, width: boxWidth, height: boxHeight };
            try { bounds = shapeLayer.sourceRectAtTime(playhead, false); } catch (e) { }
            var centerAnchor = [bounds.left + bounds.width / 2, bounds.top + bounds.height / 2];   // shape center (Ctrl+Alt+Home)
            var leftCenterAnchor = [bounds.left, bounds.top + bounds.height / 2];                 // left-edge center for horizontal scale
            var oldAnchor = [0, 0];
            var oldPos = [0, 0];
            try { oldAnchor = tGroup.property("ADBE Anchor Point").value; } catch (e) { }
            try { oldPos = tGroup.property("ADBE Position").value; } catch (e) { }
            // Step 1: Anchor to shape center (Ctrl+Alt+Home)
            tGroup.property("ADBE Anchor Point").setValue(centerAnchor);
            tGroup.property("ADBE Position").setValue([oldPos[0] + (oldAnchor[0] - centerAnchor[0]), oldPos[1] + (oldAnchor[1] - centerAnchor[1])]);
            var posAfterCenter = tGroup.property("ADBE Position").value;
            // Step 2: Anchor to left-edge center for horizontal scale
            tGroup.property("ADBE Anchor Point").setValue(leftCenterAnchor);
            tGroup.property("ADBE Position").setValue([posAfterCenter[0] + (centerAnchor[0] - leftCenterAnchor[0]), posAfterCenter[1] + (centerAnchor[1] - leftCenterAnchor[1])]);
            // Final position: left edge at center[0]-boxWidth/2, vertical center at center[1]
            var shapePos = [center[0] - boxWidth / 2, center[1]];
            tGroup.property("ADBE Position").setValue(shapePos);
            // Text position = shape position + (20, 0)
            textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([shapePos[0] + 20, shapePos[1]]);
            // Scale text 110%
            var textScale = textLayer.property("ADBE Transform Group").property("ADBE Scale");
            try { textScale.setValue([110, 110, 100]); } catch (e) { textScale.setValue([110, 110]); }

            if (HIGHLIGHT_LAYERSTYLES_PRESET.exists) {
                try {
                    for (var sl = 1; sl <= comp.numLayers; sl++) comp.layer(sl).selected = false;
                    shapeLayer.selected = true;
                    shapeLayer.applyPreset(HIGHLIGHT_LAYERSTYLES_PRESET);
                } catch (ePreset) { }
            }

            var sProp = shapeLayer.property("ADBE Transform Group").property("ADBE Scale");
            sProp.setValueAtTime(playhead, [0, 100, 100]);
            sProp.setValueAtTime(playhead + entryDur, [100, 100, 100]);
            setEasyEase(sProp, playhead);
            setEasyEase(sProp, playhead + entryDur);

            // Base: Animator 1 — Opacity 0 for all text (for reveal)
            var animBase = textLayer.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
            animBase.name = "Animator 1";
            var selBase = animBase.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
            if (selBase) {
                try { selBase.property("ADBE Text Percent Start").setValue(0); } catch (e) { try { selBase.property("ADBE Text Selector Start").setValue(0); } catch (e2) { } }
                try { selBase.property("ADBE Text Percent End").setValue(100); } catch (e) { try { selBase.property("ADBE Text Selector End").setValue(100); } catch (e2) { } }
            }
            try {
                var opBase = animBase.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity");
                if (opBase) opBase.setValue(0);
            } catch (e) { }
            // Reveal: Animator 2 — Range End 0→100 + Opacity 100 (left-to-right)
            var anim = textLayer.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
            anim.name = "Animator 2";
            var selector = anim.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
            if (selector) {
                try { selector.property("ADBE Text Percent Start").setValue(0); } catch (e) { try { selector.property("ADBE Text Selector Start").setValue(0); } catch (e2) { } }
                try { selector.property("Advanced").property("Based On").setValue(1); } catch (e) { }
                var endProp = selector.property("ADBE Text Percent End");
                if (!endProp) endProp = selector.property("ADBE Text Selector End");
                if (endProp) {
                    try {
                        endProp.setValueAtTime(playhead, 0);
                        endProp.setValueAtTime(playhead + revealDur, 100);
                        setEasyEase(endProp, playhead);
                        setEasyEase(endProp, playhead + revealDur);
                    } catch (eEnd) {
                        endProp.setValue(100);
                    }
                }
            }
            try {
                var animOpacity = anim.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity");
                if (animOpacity) animOpacity.setValue(100);
            } catch (eOpacity) { }

            var shapeOp = shapeLayer.property("ADBE Transform Group").property("ADBE Opacity");
            shapeOp.setValueAtTime(playhead + exitStart, 100);
            shapeOp.setValueAtTime(playhead + exitEnd, 0);
            setEasyEase(shapeOp, playhead + exitStart);
            setEasyEase(shapeOp, playhead + exitEnd);

            var textOp = textLayer.property("ADBE Transform Group").property("ADBE Opacity");
            textOp.setValueAtTime(playhead + exitStart, 100);
            textOp.setValueAtTime(playhead + exitEnd, 0);
            setEasyEase(textOp, playhead + exitStart);
            setEasyEase(textOp, playhead + exitEnd);

            // Text on top, Shape Layer below
            moveNewLayerToInsertPosition(shapeLayer, insertRef);
            moveNewLayerToInsertPosition(textLayer, insertRef);
            restoreSelectionAfterInsert(comp, insertRef);
        } catch (err) {
            alert("Error in Section Text: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    // ---------------------------------------------------------------------------------
    // ADD TEXT – Text layer only (no background). Fade left-to-right like Section Text animator.
    // ---------------------------------------------------------------------------------
    function addAddText(textStr) {
        var comp = getActiveComp();
        if (!comp) return;

        var playhead = comp.time;
        var center = [comp.width / 2, comp.height / 2];
        var revealDur = 0.833;
        var duration = 10;

        app.beginUndoGroup("Add Text");
        try {
            var insertRef = getInsertBeforeLayer(comp);
            var textLayer = comp.layers.addText(textStr || "Text");
            textLayer.name = String(textStr || "Text").substring(0, 80);
            textLayer.startTime = playhead;
            textLayer.outPoint = playhead + duration;

            var tProp = textLayer.property("Source Text");
            var tDoc = tProp.value;
            tDoc.font = "BebasNeueBold";
            tDoc.fontSize = 70;
            try { tDoc.justification = 7413; } catch (e) { tDoc.justification = ParagraphJustification.CENTER_JUSTIFY; }
            tDoc.fillColor = [0.98, 0.96, 0.9];
            tProp.setValue(tDoc);

            var rectText = textLayer.sourceRectAtTime(playhead + 0.5, false);
            var anchorLeft = [rectText.left, rectText.top + rectText.height / 2];
            textLayer.property("ADBE Transform Group").property("ADBE Anchor Point").setValue(anchorLeft);
            textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([center[0], center[1]]);

            var animBase = textLayer.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
            animBase.name = "Animator 1";
            var selBase = animBase.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
            if (selBase) {
                try { selBase.property("ADBE Text Percent Start").setValue(0); } catch (e) { }
                try { selBase.property("ADBE Text Percent End").setValue(100); } catch (e) { }
            }
            try {
                var opBase = animBase.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity");
                if (opBase) opBase.setValue(0);
            } catch (e) { }

            var anim = textLayer.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
            anim.name = "Animator 2";
            var selector = anim.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
            if (selector) {
                try { selector.property("ADBE Text Percent Start").setValue(0); } catch (e) { }
                try { selector.property("Advanced").property("Based On").setValue(1); } catch (e) { }
                var endProp = selector.property("ADBE Text Percent End");
                if (!endProp) endProp = selector.property("ADBE Text Selector End");
                if (endProp) {
                    endProp.setValueAtTime(playhead, 0);
                    endProp.setValueAtTime(playhead + revealDur, 100);
                    setEasyEase(endProp, playhead);
                    setEasyEase(endProp, playhead + revealDur);
                }
            }
            try {
                var animOpacity = anim.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity");
                if (animOpacity) animOpacity.setValue(100);
            } catch (e) { }

            moveNewLayerToInsertPosition(textLayer, insertRef);
            restoreSelectionAfterInsert(comp, insertRef);
        } catch (err) {
            alert("Add Text error: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    /** Lesson Title – per audit: position [98,592], anchor left-center, justification 7413, tracking 0, Animator Offset 0→100 BEZIER, Glow 15/153. */
    function addLessonTitle(textStr) {
        var comp = getActiveComp();
        if (!comp) return;

        app.beginUndoGroup("Add Lesson Title v8.4.5");
        try {
            var insertRef = getInsertBeforeLayer(comp);
            var duration = 4.0;
            var playhead = comp.time;
            var fadeInDur = 0.167;
            var exitFadeStart = 3.367;

            // REF: Layer 3 (bottom) = Adjustment Layer 1 (Blur) – create first
            var adjLayer = comp.layers.addSolid([0, 0, 0], "Adjustment Layer 1", comp.width, comp.height, comp.pixelAspect);
            adjLayer.adjustmentLayer = true;
            adjLayer.startTime = playhead;
            adjLayer.outPoint = playhead + duration;
            var blur = adjLayer.property("Effects").addProperty("ADBE Gaussian Blur 2");
            blur.property("Blurriness").setValue(30);
            var adjOp = adjLayer.property("ADBE Transform Group").property("ADBE Opacity");
            adjOp.setValueAtTime(playhead, 0);
            adjOp.setValueAtTime(playhead + fadeInDur, 100);
            adjOp.setValueAtTime(playhead + exitFadeStart, 100);
            adjOp.setValueAtTime(playhead + duration, 0);
            setEasyEase(adjOp, playhead);
            setEasyEase(adjOp, playhead + fadeInDur);
            setEasyEase(adjOp, playhead + exitFadeStart);
            setEasyEase(adjOp, playhead + duration);

            // REF: Layer 2 (middle) = Black Solid 1
            var darken = comp.layers.addSolid([0, 0, 0], "Black Solid 1", comp.width, comp.height, 1);
            darken.startTime = playhead;
            darken.outPoint = playhead + duration;
            var darkOp = darken.property("ADBE Transform Group").property("ADBE Opacity");
            darkOp.setValueAtTime(playhead, 0);
            darkOp.setValueAtTime(playhead + fadeInDur, 50);
            darkOp.setValueAtTime(playhead + exitFadeStart, 50);
            darkOp.setValueAtTime(playhead + duration, 0);
            setEasyEase(darkOp, playhead);
            setEasyEase(darkOp, playhead + fadeInDur);
            setEasyEase(darkOp, playhead + exitFadeStart);
            setEasyEase(darkOp, playhead + duration);

            // REF: Layer 1 (top) = text layer, position [98.123, 592.796] (comp space)
            var textLayer = comp.layers.addText(textStr);
            textLayer.name = String(textStr).substring(0, 50);
            textLayer.startTime = playhead;
            textLayer.outPoint = playhead + duration;

            var refPos = [420, 420];

            var tProp = textLayer.property("Source Text");
            var tDoc = tProp.value;
            tDoc.font = "BebasNeueBold";
            tDoc.fontSize = 150;
            try { tDoc.justification = 7413; } catch (e) { tDoc.justification = ParagraphJustification.CENTER_JUSTIFY; }
            tDoc.fillColor = [0.75686, 0.55294, 0.12941];
            try { tDoc.tracking = 70; } catch (e) { }
            tProp.setValue(tDoc);

            var rectForAnchor = textLayer.sourceRectAtTime(playhead + 1.25, false);
            var anchorLeftCenter = [rectForAnchor.left, rectForAnchor.top + rectForAnchor.height / 2];
            textLayer.property("ADBE Transform Group").property("ADBE Anchor Point").setValue(anchorLeftCenter);
            textLayer.property("ADBE Transform Group").property("ADBE Position").setValue(refPos);
            var layerOp = textLayer.property("ADBE Transform Group").property("ADBE Opacity");
            layerOp.setValueAtTime(playhead, 0);
            layerOp.setValueAtTime(playhead + 1.25, 100);
            setEasyEase(layerOp, playhead);
            setEasyEase(layerOp, playhead + 1.25);

            // REF: Animator 1 – Position [0, 135, 0], Offset 0→100 at 0.167–1.167
            var animList = textLayer.property("ADBE Text Properties").property("ADBE Text Animators");
            var animPos = animList.addProperty("ADBE Text Animator");
            animPos.name = "Animator 1";

            var curAnimPos = textLayer.property("ADBE Text Properties").property("ADBE Text Animators").property("Animator 1");
            var posGroup = curAnimPos.property("ADBE Text Animator Properties");
            var pos = null;
            try { pos = posGroup.addProperty("ADBE Text Position"); } catch (e) { try { pos = posGroup.addProperty("ADBE Text Position 3D"); } catch (e2) { } }
            if (pos) { try { pos.setValue([0, 135, 0]); } catch (e3) { pos.setValue([0, 135]); } }

            var sel1 = curAnimPos.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
            if (sel1) sel1.property("Advanced").property("Based On").setValue(3);

            // Animator 2: Opacity 100 on range – layer base 0, so reveal = range grows 0→100 and selected chars get 100 (visible)
            var animOp = animList.addProperty("ADBE Text Animator");
            animOp.name = "Animator 2";

            var curAnimOp = textLayer.property("ADBE Text Properties").property("ADBE Text Animators").property("Animator 2");
            var opGroup = curAnimOp.property("ADBE Text Animator Properties");
            var op = null;
            try { op = opGroup.addProperty("ADBE Text Opacity"); } catch (e) { try { op = opGroup.addProperty("Opacity"); } catch (e2) { } }
            if (op) op.setValue(100);

            var sel2 = curAnimOp.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
            if (sel2) sel2.property("Advanced").property("Based On").setValue(3);

            var finalAnim1 = textLayer.property("ADBE Text Properties").property("ADBE Text Animators").property("Animator 1");
            if (finalAnim1) {
                var finalSel1 = finalAnim1.property("ADBE Text Selectors").property(1);
                if (finalSel1) {
                    var off1 = finalSel1.property("Offset");
                    off1.setValueAtTime(playhead + 0.167, 0);
                    off1.setValueAtTime(playhead + 1.167, 100);
                    setEasyEase(off1, playhead + 0.167);
                    setEasyEase(off1, playhead + 1.167);
                }
            }

            var finalAnim2 = textLayer.property("ADBE Text Properties").property("ADBE Text Animators").property("Animator 2");
            if (finalAnim2) {
                var finalSel2 = finalAnim2.property("ADBE Text Selectors").property(1);
                if (finalSel2) {
                    var off2 = finalSel2.property("ADBE Text Percent Offset");
                    if (!off2) off2 = finalSel2.property("Offset");
                    if (off2) {
                        off2.setValueAtTime(playhead + 0.25, 0);
                        off2.setValueAtTime(playhead + 1.25, 100);
                        setEasyEase(off2, playhead + 0.25);
                        setEasyEase(off2, playhead + 1.25);
                    }
                }
            }

            var finalLayer = textLayer;

            var glow = null;
            try {
                var fxGroup = finalLayer.property("ADBE Effect Config") || finalLayer.property("Effects");
                glow = fxGroup.addProperty("ADBE Glo2");
            } catch (e) {
                try { glow = fxGroup.addProperty("ADBE Glow"); } catch (e2) { }
                if (!glow) try { glow = finalLayer.property("Effects").addProperty("Glow"); } catch (e3) { }
            }
            if (glow) {
                glow.property("Glow Radius").setValue(15);
                try { glow.property("Glow Threshold").setValue(153); } catch (e) { }
                glow.property("Color A").setValue([1, 1, 1]);
                glow.property("Color B").setValue([0, 0, 0]);
            }

            finalLayer.property("ADBE Transform Group").property("ADBE Position").setValue(refPos);

            var rect = finalLayer.sourceRectAtTime(playhead + 1.25, false);
            var mProp = finalLayer.property("Masks").addProperty("ADBE Mask Atom");
            var mShape = mProp.property("ADBE Mask Shape");
            var shape = mShape.value;
            var pad = 40;
            // Mask path is in LAYER SPACE (origin = layer anchor). Use rect, not centerPos.
            var left = rect.left - pad;
            var right = rect.left + rect.width + pad;
            var top = rect.top - pad;
            var bottom = rect.top + rect.height + pad;
            shape.vertices = [[left, top], [right, top], [right, bottom], [left, bottom]];
            shape.closed = true;
            mShape.setValue(shape);
            try { finalLayer.mask(1).inverted = false; } catch (e) { }

            finalLayer.property("ADBE Transform Group").property("ADBE Opacity").setValueAtTime(playhead + exitFadeStart, 100);
            finalLayer.property("ADBE Transform Group").property("ADBE Opacity").setValueAtTime(playhead + duration, 0);

            // Order top→bottom: Text, Adjustment Blur, Dark
            moveNewLayerToInsertPosition(darken, insertRef);
            moveNewLayerToInsertPosition(adjLayer, insertRef);
            moveNewLayerToInsertPosition(textLayer, insertRef);
            restoreSelectionAfterInsert(comp, insertRef);
        } catch (err) {
            alert("Error in Lesson Title: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    // ---------------------------------------------------------------------------------
    // API for Controller (ScriptPart01): __TP_NO_UI + runToolFromAPI
    // ---------------------------------------------------------------------------------
    /** Find footage by name in project folder (e.g. "MEME_ASSETS"). If no folder, search whole project. */
    function findFootageByNameInFolder(folderName, itemName) {
        var proj = app.project;
        var i, item, folder;
        if (folderName && folderName.length > 0) {
            for (i = 1; i <= proj.numItems; i++) {
                item = proj.item(i);
                if (item instanceof FolderItem && item.name === folderName) {
                    folder = item;
                    break;
                }
            }
            if (folder) {
                for (i = 1; i <= folder.numItems; i++) {
                    item = folder.item(i);
                    if ((item instanceof FootageItem || item instanceof CompItem) && item.name.indexOf(itemName) >= 0) return item;
                }
            }
        }
        for (i = 1; i <= proj.numItems; i++) {
            item = proj.item(i);
            if ((item instanceof FootageItem || item instanceof CompItem) && item.name.indexOf(itemName) >= 0) return item;
        }
        return null;
    }

    /** Run tool from Controller (params: text, footageName, startTime, textColor, etc.). */
    function runToolFromAPI(toolName, params) {
        var comp = getActiveComp();
        if (!comp) return false;
        params = params || {};
        var startTime = params.startTime || "";
        try {
            if (toolName === "GENERATE_LESSON") {
                addLessonTitle(params.text || "Lesson Title", params.fromAudit);
                if (startTime && comp.numLayers >= 1) comp.layer(1).name = "[TP] Lesson - " + (params.text || "").substring(0, 40) + " [" + startTime + "]";
                return true;
            }
            if (toolName === "SECTION_TEXT") {
                addSectionText(params.text || "Section", params.fromAudit);
                if (startTime && comp.numLayers >= 1) comp.layer(1).name = "[TP] Section - " + (params.text || "").substring(0, 40) + " [" + startTime + "]";
                return true;
            }
            if (toolName === "GENERATE_MEME") {
                var foot = params.footageName ? findFootageByNameInFolder("MEME_ASSETS", params.footageName) : null;
                if (!foot && params.footageName) foot = findFootageByNameInFolder("", params.footageName);
                addMemeFrame(params.text || "MEME", foot);
                if (startTime && comp.numLayers >= 1) comp.layer(1).name = "[TP] Meme - " + (params.text || "").substring(0, 30) + " [" + startTime + "]";
                return true;
            }
            if (toolName === "HIGHLIGHT_BASIC") {
                addHighlightBasic();
                return true;
            }
            if (toolName === "SMART_HIGHLIGHT" || toolName === "FOCUS_ZOOM" || toolName === "SUPER_ZOOM") {
                addSuperZoom();
                return true;
            }
            if (toolName === "STRUCTURE_HH_LL") {
                addTradingLabel(params.label || "HH");
                return true;
            }
            if (toolName === "FADE_IN") {
                applyFade("in");
                return true;
            }
        } catch (e) {
            alert("runToolFromAPI: " + e.toString());
            return false;
        }
        return false;
    }

    /**
     * Art Direction checks – "Professional Finance, Not PowerPoint".
     * Standards from 5 templates: Fullscreen Text, Highlight, Lesson Title, Section Text, Zoom and Highlight (ReportFromAudit).
     * 5 pillars: Visual Language, Motion DNA, Instructional Elements, Meme Balance, Technical Standard.
     * Returns { _artDirectionPillars, summary, checks, scorePercent, total, passed }.
     */
    function checkArtDirection(comp, audit) {
        var cW = audit.composition.width || comp.width || 1920;
        var cH = audit.composition.height || comp.height || 1080;
        var margin = 100;
        var checks = [];
        var total = 0, passed = 0;
        var refTemplates = ["Fullscreen Text", "Highlight", "Lesson Title", "Section Text", "Zoom and Highlight"];

        function addCheck(rule, expected, actual, pass) {
            total++;
            if (pass) passed++;
            checks.push({ rule: rule, expected: String(expected), actual: String(actual), pass: !!pass });
        }

        var _artDirectionPillars = {
            goal: "Professional Finance, Not PowerPoint. Clean, clear, smooth.",
            _refTemplates: refTemplates,
            "1_VisualLanguage": "Color: Navy #222945 primary, Gold #c28821 accent + glow 10-15px. Typography: Bebas Tracking +70 to +100. Layout: Rule of thirds, Margin 100px. Lesson Title position ~98px left.",
            "2_MotionDNA": "No Linear easing; Bezier/Exponential. Meme hierarchy: Darken 0.2s -> Text 0.3s -> GIF last. Zoom: Motion Blur, Shutter 180.",
            "3_InstructionalElements": "HIGHLIGHT: anchor left, Scale 0->100 BEZIER 0.833s, Fill orange, Stroke white 5, Roundness 20, Outer Glow 22. GOLD_LINE: Trim Paths, stroke 6px, glow 10-15px. Labels HH/HL/LL: Scale overshoot 0->110->100% in 5-7 frames.",
            "4_MemeBalance": "Darken overlay 70-90% opacity (template Fullscreen Text 70%). GIF quality, bo góc/viền mờ.",
            "5_TechnicalStandard": "Matte integrity: chart inside frame. Callout locked to candle."
        };

        // --- 5. Technical: Shutter Angle 180 (Motion Blur) ---
        try {
            var shutter = audit.composition.settings && audit.composition.settings.shutterAngle != null ? audit.composition.settings.shutterAngle : (comp.shutterAngle != null ? comp.shutterAngle : null);
            var shutterOk = (shutter != null && Math.abs(Number(shutter) - 180) < 30);
            addCheck("Comp Shutter Angle ~180 (Motion Blur)", "180", shutter != null ? shutter : "?", shutterOk);
        } catch (e) { }

        // --- 1. Visual Language: Margin 100px (content not flush), Lesson Title ~98px ---
        var marginChecked = false;
        var lessonTitleMarginChecked = false;
        for (var i = 0; i < audit.layers.length; i++) {
            var ly = audit.layers[i];
            var name = ly.name || "";

            // Lesson Title: position X ~98px left (template standard) – check once
            if (!lessonTitleMarginChecked && ly.type === "Text" && ly.transform && ly.transform.position && ly.transform.position.value) {
                var posX = Number(ly.transform.position.value[0]);
                if (posX >= 80 && posX <= 120 && cW >= 1900) {
                    lessonTitleMarginChecked = true;
                    addCheck("Lesson Title margin left ~98px", "80-120", Math.round(posX), true);
                }
            }

            // Meme: Darken 70-90% (4. Meme Balance – template 70%, tool 90%)
            if (name.indexOf("MEME_Dark_Base") >= 0) {
                var op = ly.transform && ly.transform.opacity;
                var opVal = op && op.keyframes && op.keyframes.length > 0 ? op.keyframes[op.keyframes.length - 1].value : (op && op.value != null ? op.value : null);
                var darkenOk = (opVal != null && Number(opVal) >= 70 && Number(opVal) <= 95);
                addCheck("Meme Darken overlay 70-90% opacity", "70-90", opVal != null ? opVal : "?", darkenOk);
            }

            // Meme: Rule of thirds + Margin (1. Visual Language)
            if (name.indexOf("MEME_Text_Content") >= 0) {
                var pos = ly.transform && ly.transform.position && ly.transform.position.value;
                var textY = (pos && pos[1] != null) ? Number(pos[1]) : null;
                var textX = (pos && pos[0] != null) ? Number(pos[0]) : null;
                var textYOk = (textY != null && textY < cH * 0.4);
                addCheck("Meme text Y < 0.35*height (Rule of thirds)", "< " + Math.round(cH * 0.35), textY != null ? Math.round(textY) : "?", textYOk);
                if (textX != null && !marginChecked) {
                    var textMarginX = (textX >= margin && textX <= cW - margin);
                    addCheck("Content margin 100px (X)", margin + "-" + (cW - margin), Math.round(textX), textMarginX);
                    marginChecked = true;
                }
                var trk = ly.text && ly.text.tracking != null ? ly.text.tracking : null;
                var trkOk = (trk != null && Number(trk) >= 70 && Number(trk) <= 100);
                addCheck("Bebas Tracking +70 to +100", "70-100", trk != null ? trk : "?", trkOk);
            }

            if (name.indexOf("MEME_GIF_Loop") >= 0) {
                var posG = ly.transform && ly.transform.position && ly.transform.position.value;
                var gifY = (posG && posG[1] != null) ? Number(posG[1]) : null;
                var gifYOk = (gifY != null && gifY > cH * 0.6);
                addCheck("Meme GIF Y > 0.65*height (Rule of thirds)", "> " + Math.round(cH * 0.65), gifY != null ? Math.round(gifY) : "?", gifYOk);
            }

            // GOLD_LINE: stroke 6px, Glow 10-15px, Trim Paths (3. Instructional)
            if (name.indexOf("THANH GOLD") >= 0 || (name.indexOf("GOLD") >= 0 && name.indexOf("MEME") < 0)) {
                var layer = comp.layer(ly.index);
                var strokeW = null;
                var hasTrim = false;
                var glowRadius = null;
                try {
                    var contents = layer.property("Contents");
                    if (contents && contents.numProperties > 0) {
                        var grp = contents.property(1);
                        if (grp && grp.property("Contents")) {
                            var cnt = grp.property("Contents");
                            for (var p = 1; p <= cnt.numProperties; p++) {
                                var item = cnt.property(p);
                                var mn = (item.matchName || "").toString();
                                if (mn.indexOf("Stroke") >= 0 && item.property("Stroke Width")) strokeW = item.property("Stroke Width").value;
                                if (mn.indexOf("Trim") >= 0) hasTrim = true;
                            }
                        }
                    }
                } catch (e) { }
                var stroke6 = (strokeW != null && Math.abs(Number(strokeW) - 6) < 2);
                addCheck("GOLD_LINE stroke 6px", "6", strokeW != null ? strokeW : "?", stroke6);
                addCheck("GOLD_LINE has Trim Paths", "yes", hasTrim ? "yes" : "no", hasTrim);
                try {
                    if (layer.property("ADBE Effect Parade")) {
                        for (var e = 1; e <= layer.property("ADBE Effect Parade").numProperties; e++) {
                            var fx = layer.property("ADBE Effect Parade").property(e);
                            if ((fx.name || "").indexOf("Glow") >= 0 || (fx.matchName || "").indexOf("Glo") >= 0) {
                                if (fx.property("Glow Radius")) glowRadius = fx.property("Glow Radius").value;
                                break;
                            }
                        }
                    }
                } catch (e2) { }
                var glowOk = (glowRadius != null && Number(glowRadius) >= 8 && Number(glowRadius) <= 20);
                addCheck("GOLD_LINE Glow 10-15px (digital glow)", "8-20", glowRadius != null ? glowRadius : "?", glowOk);
                if (glowRadius == null) addCheck("GOLD_LINE has Glow effect", "yes", "no", false);
            }

            // Labels HH/HL/LL: Scale overshoot 0->110->100 in 5-7 frames (3. Instructional)
            if (name.indexOf("LABEL_") >= 0 && ly.transform && ly.transform.scale && ly.transform.scale.keyframes && ly.transform.scale.keyframes.length >= 2) {
                var scaleKfs = ly.transform.scale.keyframes;
                var hasOvershoot = false;
                for (var sk = 0; sk < scaleKfs.length - 1; sk++) {
                    var v = scaleKfs[sk].value;
                    var vNext = scaleKfs[sk + 1].value;
                    if (v && vNext && (Array.isArray(v) ? v[0] : v) > 100 && (Array.isArray(vNext) ? vNext[0] : vNext) <= 105) hasOvershoot = true;
                }
                var frameSpan = 0;
                if (scaleKfs.length >= 2 && scaleKfs[0].t != null && scaleKfs[scaleKfs.length - 1].t != null)
                    frameSpan = Math.abs(scaleKfs[scaleKfs.length - 1].t - scaleKfs[0].t) * (audit.composition.frameRate || 60);
                var spanOk = (frameSpan >= 4 && frameSpan <= 12);
                addCheck("Label Scale overshoot 0->110->100%", "yes", hasOvershoot ? "yes" : "no", hasOvershoot);
                addCheck("Label animation 5-7 frames", "4-12", Math.round(frameSpan), spanOk);
            }

            // 2. Motion DNA: No LINEAR on opacity/scale
            if (ly.transform && ly.transform.opacity && ly.transform.opacity.keyframes && ly.transform.opacity.keyframes.length >= 2) {
                var kfs = ly.transform.opacity.keyframes;
                var noLinear = true;
                for (var k = 0; k < kfs.length; k++) {
                    var inName = (kfs[k].interpolationInName || "").toString();
                    var outName = (kfs[k].interpolationOutName || "").toString();
                    if (inName.indexOf("LINEAR") >= 0 && inName.indexOf("BEZIER") < 0) noLinear = false;
                    if (outName.indexOf("LINEAR") >= 0 && outName.indexOf("BEZIER") < 0) noLinear = false;
                }
                addCheck("Opacity no Linear (Bezier/Ease) – " + name.substring(0, 22), "BEZIER", noLinear ? "BEZIER" : "LINEAR", noLinear);
            }

            // Scale keyframes: no Linear
            if (ly.transform && ly.transform.scale && ly.transform.scale.keyframes && ly.transform.scale.keyframes.length >= 2 && name.indexOf("LABEL_") < 0) {
                var skfs = ly.transform.scale.keyframes;
                var scaleNoLinear = true;
                for (var sk = 0; sk < skfs.length; sk++) {
                    var sin = (skfs[sk].interpolationInName || "").toString();
                    var sout = (skfs[sk].interpolationOutName || "").toString();
                    if (sin.indexOf("LINEAR") >= 0 && sin.indexOf("BEZIER") < 0) scaleNoLinear = false;
                    if (sout.indexOf("LINEAR") >= 0 && sout.indexOf("BEZIER") < 0) scaleNoLinear = false;
                }
                addCheck("Scale no Linear (Bezier) – " + name.substring(0, 22), "BEZIER", scaleNoLinear ? "BEZIER" : "LINEAR", scaleNoLinear);
            }
        }

        // Meme hierarchy: Darken first (0.2s), Text (0.3s), GIF last – check relative keyframe times
        var memeDarkTime = null, memeTextTime = null, memeGifTime = null;
        for (var j = 0; j < audit.layers.length; j++) {
            var l = audit.layers[j];
            var n = l.name || "";
            if (n.indexOf("MEME_Dark_Base") >= 0 && l.transform && l.transform.opacity && l.transform.opacity.keyframes && l.transform.opacity.keyframes.length > 0) {
                var k0 = l.transform.opacity.keyframes[0];
                if (k0.t != null) memeDarkTime = k0.t;
            }
            if (n.indexOf("MEME_Text_Content") >= 0 && l.transform && l.transform.position) memeTextTime = 0;
            if (n.indexOf("MEME_GIF_Loop") >= 0 && l.transform && l.transform.opacity && l.transform.opacity.keyframes && l.transform.opacity.keyframes.length > 0) {
                var gk = l.transform.opacity.keyframes[0];
                if (gk.t != null) memeGifTime = gk.t;
            }
        }
        if (memeDarkTime != null || memeGifTime != null) {
            var hierarchyOk = true;
            if (memeDarkTime != null && memeGifTime != null && memeDarkTime > memeGifTime) hierarchyOk = false;
            addCheck("Meme hierarchy: Darken before GIF", "Darken first", hierarchyOk ? "ok" : "order?", hierarchyOk);
        }

        var scorePercent = total > 0 ? Math.round((passed / total) * 100) : 0;
        var summary = "Art Direction: " + passed + "/" + total + " passed (" + scorePercent + "%). Professional Finance, Not PowerPoint.";
        return {
            _artDirectionPillars: _artDirectionPillars,
            summary: summary,
            checks: checks,
            scorePercent: scorePercent,
            total: total,
            passed: passed,
            _notes: "Standards from 5 ReportFromAudit templates. 5 pillars: 1.Visual Language (Navy/Gold, Bebas +70-100, margin 100px, Lesson Title ~98px). 2.Motion DNA (No Linear, Meme order, Shutter 180). 3.Instructional (HIGHLIGHT Stroke 5/Roundness 20/Glow 22, GOLD_LINE 6px+glow 10-15, Label overshoot). 4.Meme Balance (Darken 70-90%). 5.Technical (Matte, stability)."
        };
    }

    /** 
     * Composition Audit - v2.5 (Enriched Technical)
     * Detailed metadata, keyframe data, and visual meaning heuristics
     */
    /** Serialize audit object to human-readable TXT (full comp info, layers, art direction). */
    function auditToTxt(audit) {
        var lines = [];
        var indent = function (s, n) { var sp = ""; for (var i = 0; i < (n || 0); i++) sp += "  "; return sp + (s || ""); };
        var arrStr = function (v) {
            if (v == null) return "null";
            if (typeof v !== "object" || !(v instanceof Array)) return String(v);
            return "[" + v.map(function (x) { return typeof x === "number" ? String(Math.round(x * 1000) / 1000) : String(x); }).join(", ") + "]";
        };
        var formatVal = function (v) {
            if (v == null) return "null";
            if (typeof v === "object" && v instanceof Array) return arrStr(v);
            if (typeof v === "object" && v.vertices) return "(path " + (v.vertices ? v.vertices.length : 0) + " pts)";
            return String(v);
        };
        var dumpTree = function (node, depth) {
            if (!node || depth > 12) return;
            var d = depth || 0;
            var name = node.name || node.matchName || "?";
            lines.push(indent(name + (node.matchName ? " [" + node.matchName + "]" : ""), d));
            if (node.value !== undefined && node.value !== null) lines.push(indent("value: " + formatVal(node.value), d + 1));
            if (node.expression) lines.push(indent("expression: " + (String(node.expression).substring(0, 80)) + (node.expression.length > 80 ? "..." : ""), d + 1));
            if (node.keyframes && node.keyframes.length > 0) {
                for (var k = 0; k < Math.min(node.keyframes.length, 8); k++) {
                    var kf = node.keyframes[k];
                    lines.push(indent("kf " + kf.t + ": " + formatVal(kf.value) + (kf.interpolationInName ? " [" + kf.interpolationInName + "/" + (kf.interpolationOutName || "") + "]" : ""), d + 1));
                }
                if (node.keyframes.length > 8) lines.push(indent("... +" + (node.keyframes.length - 8) + " more keyframes", d + 1));
            }
            if (node.properties && node.properties.length > 0) {
                for (var p = 0; p < node.properties.length; p++) dumpTree(node.properties[p], d + 1);
            }
        };

        lines.push("==================================================================================");
        lines.push("TRADINGPOWER AUDIT REPORT (TXT)");
        lines.push("==================================================================================");
        lines.push("");

        if (audit.composition) {
            var c = audit.composition;
            lines.push("--- COMPOSITION ---");
            lines.push("Name: " + (c.name || ""));
            lines.push("Duration: " + (c.duration != null ? c.duration + " s" : ""));
            lines.push("Size: " + (c.width != null ? c.width : "") + " x " + (c.height != null ? c.height : ""));
            lines.push("Frame rate: " + (c.frameRate != null ? c.frameRate : ""));
            lines.push("Layers: " + (c.numLayers != null ? c.numLayers : ""));
            if (c.settings && typeof c.settings === "object") {
                if (c.settings.bgColor) lines.push("BG Color: " + arrStr(c.settings.bgColor));
                if (c.settings.shutterAngle != null) lines.push("Shutter Angle: " + c.settings.shutterAngle);
                if (c.settings.motionBlur != null) lines.push("Motion Blur: " + c.settings.motionBlur);
                if (c.settings.frameBlending != null) lines.push("Frame Blending: " + c.settings.frameBlending);
            }
            if (c.markers && c.markers.length > 0) {
                lines.push("Comp markers: " + c.markers.length);
                for (var cm = 0; cm < Math.min(c.markers.length, 20); cm++) {
                    var m = c.markers[cm];
                    lines.push("  " + m.t + "s: " + (m.comment || m.chapter || "(marker)"));
                }
                if (c.markers.length > 20) lines.push("  ... +" + (c.markers.length - 20) + " more");
            }
            lines.push("");
        }

        lines.push("--- LAYERS ---");
        if (audit.layers && audit.layers.length > 0) {
            for (var i = 0; i < audit.layers.length; i++) {
                var ly = audit.layers[i];
                lines.push("");
                lines.push("Layer " + (ly.index != null ? ly.index : i + 1) + ": " + (ly.name || "") + " (" + (ly.type || "") + ")");
                lines.push(indent("enabled: " + ly.enabled + " | blend: " + (ly.blendingMode || ""), 1));
                lines.push(indent("in: " + ly.inPoint + " | out: " + ly.outPoint + " | start: " + ly.startTime, 1));
                if (ly.parentName) lines.push(indent("parent: " + ly.parentName, 1));
                if (ly.trackMatteType) lines.push(indent("trackMatte: " + ly.trackMatteType, 1));
                if (ly.meaning) lines.push(indent("meaning: " + ly.meaning, 1));

                if (ly.transform && typeof ly.transform === "object") {
                    lines.push(indent("Transform:", 1));
                    for (var tn in ly.transform) {
                        if (!ly.transform.hasOwnProperty(tn)) continue;
                        var t = ly.transform[tn];
                        if (t && typeof t === "object") {
                            if (t.value !== undefined) lines.push(indent(tn + ": " + formatVal(t.value), 2));
                            if (t.expression) lines.push(indent(tn + " expression: " + (String(t.expression).substring(0, 60)) + (t.expression.length > 60 ? "..." : ""), 2));
                            if (t.keyframes && t.keyframes.length > 0) {
                                for (var tk = 0; tk < Math.min(t.keyframes.length, 5); tk++) {
                                    var kv = t.keyframes[tk];
                                    lines.push(indent(tn + " kf " + kv.t + ": " + formatVal(kv.value), 2));
                                }
                                if (t.keyframes.length > 5) lines.push(indent(tn + " ... +" + (t.keyframes.length - 5) + " kfs", 2));
                            }
                        }
                    }
                }

                if (ly.effects && ly.effects.length > 0) {
                    lines.push(indent("Effects:", 1));
                    for (var e = 0; e < ly.effects.length; e++) dumpTree(ly.effects[e], 2);
                }
                if (ly.timeRemap && (ly.timeRemap.value != null || (ly.timeRemap.keyframes && ly.timeRemap.keyframes.length > 0))) {
                    lines.push(indent("Time Remap: " + formatVal(ly.timeRemap.value), 1));
                    if (ly.timeRemap.keyframes && ly.timeRemap.keyframes.length > 0)
                        lines.push(indent("keyframes: " + ly.timeRemap.keyframes.length, 1));
                }
                if (ly.masks && ly.masks.length > 0) {
                    lines.push(indent("Masks: " + ly.masks.length, 1));
                    for (var ma = 0; ma < ly.masks.length; ma++) {
                        var mask = ly.masks[ma];
                        lines.push(indent((mask.name || "mask") + (mask.inverted ? " [inverted]" : ""), 2));
                    }
                }
                if (ly.text) {
                    lines.push(indent("Text:", 1));
                    if (ly.text.sourceText != null) lines.push(indent("source: " + (String(ly.text.sourceText).substring(0, 100)) + (ly.text.sourceText.length > 100 ? "..." : ""), 2));
                    if (ly.text.font != null) lines.push(indent("font: " + ly.text.font + " " + ly.text.fontSize, 2));
                    if (ly.text.animators && ly.text.animators.length > 0) lines.push(indent("animators: " + ly.text.animators.length, 2));
                }
                if (ly.contents) {
                    lines.push(indent("Shape contents:", 1));
                    dumpTree(ly.contents, 2);
                }
                if (ly.layerStyles) {
                    lines.push(indent("Layer Styles:", 1));
                    dumpTree(ly.layerStyles, 2);
                }
                if (ly.markers && ly.markers.length > 0) lines.push(indent("Markers: " + ly.markers.length, 1));
                if (ly.source) {
                    var src = ly.source;
                    lines.push(indent("Source: " + (src.type || "") + " " + (src.name || "") + (src.file ? " " + String(src.file).substring(0, 50) : ""), 1));
                }
            }
        }
        lines.push("");

        if (audit.artDirectionChecks) {
            var ad = audit.artDirectionChecks;
            lines.push("--- ART DIRECTION ---");
            lines.push((ad.summary || "") + " (" + (ad.scorePercent != null ? ad.scorePercent + "%" : "") + ")");
            lines.push("Passed: " + (ad.passed != null ? ad.passed : "") + " / " + (ad.total != null ? ad.total : ""));
            if (ad.checks && ad.checks.length > 0) {
                for (var c = 0; c < ad.checks.length; c++) {
                    var ch = ad.checks[c];
                    lines.push("  " + (ch.pass ? "[OK]" : "[--]") + " " + (ch.rule || "") + " | expected: " + (ch.expected || "") + " | actual: " + (ch.actual || ""));
                }
            }
            if (ad._notes) lines.push("Notes: " + (String(ad._notes).substring(0, 200)) + (ad._notes.length > 200 ? "..." : ""));
            lines.push("");
        }

        lines.push("==================================================================================");
        lines.push("End of report.");
        return lines.join("\r\n");
    }

    /** Run Full Audit v3.9 – Export TXT (full audit). silent=true: no alert, write to 06.Process/active_comp_audit.txt */
    function runAuditForCompSilent(comp) {
        if (!comp || !(comp instanceof CompItem)) return;
        auditCompositionInternal(comp, true);
    }

    function auditComposition() {
        var comp = getActiveComp();
        if (!comp) return;
        auditCompositionInternal(comp, false);
    }

    function auditCompositionInternal(comp, silent) {
        try {
            var audit = {
                _coordinateSystems: { maskPath: "layer space (origin = layer anchor)", anchorPoint: "layer space (pixels from layer source top-left)", transformPosition: "composition space", orientation: "3D layer only, degrees [x,y,z]" },
                _interpolationTypeMap: { "6612": "LINEAR", "6613": "BEZIER", "6614": "HOLD", "6615": "LINEAR_IN_BEZIER_OUT", "6616": "BEZIER_IN_LINEAR_OUT" },
                _notes: {
                    interpolation: "Keyframe interpolationIn/Out: raw value (enum) + interpolationInName/interpolationOutName. Use _interpolationTypeMap for unknown codes.",
                    shapeContents: "Shape layer contents use AE property names: Roundness = round corners radius, Size = rect dimensions, Blur = glow size. See layer.contents tree."
                },
                composition: {
                    name: String(comp.name),
                    duration: Math.round(comp.duration * 1000) / 1000,
                    width: comp.width,
                    height: comp.height,
                    frameRate: comp.frameRate,
                    numLayers: comp.numLayers
                },
                layers: []
            };
            try {
                audit.composition.settings = {};
                if (comp.bgColor) audit.composition.settings.bgColor = [comp.bgColor[0], comp.bgColor[1], comp.bgColor[2]];
                if (comp.shutterAngle !== undefined) audit.composition.settings.shutterAngle = comp.shutterAngle;
                if (comp.shutterPhase !== undefined) audit.composition.settings.shutterPhase = comp.shutterPhase;
                if (comp.motionBlur !== undefined) audit.composition.settings.motionBlur = comp.motionBlur;
                if (comp.frameBlending !== undefined) audit.composition.settings.frameBlending = comp.frameBlending;
                if (comp.dropFrame !== undefined) audit.composition.settings.dropFrame = comp.dropFrame;
            } catch (e) { }
            try {
                var compMarkerProp = comp.markerProperty;
                if (compMarkerProp && compMarkerProp.numKeys > 0) {
                    audit.composition.markers = getMarkersFromProperty(compMarkerProp);
                }
            } catch (e) { }

            for (var i = 1; i <= comp.numLayers; i++) {
                var layer = comp.layers[i];
                var type = getLayerType(layer);
                var ly = {
                    index: i,
                    name: String(layer.name),
                    type: type,
                    enabled: layer.enabled,
                    blendingMode: getBlendingModeName(layer.blendingMode),
                    inPoint: Math.round(layer.inPoint * 1000) / 1000,
                    outPoint: Math.round(layer.outPoint * 1000) / 1000,
                    startTime: Math.round(layer.startTime * 1000) / 1000,
                    parentName: layer.parent ? String(layer.parent.name) : null,
                    trackMatteType: layer.trackMatteType != TrackMatteType.NO_TRACK_MATTE ? String(layer.trackMatteType) : null,
                    meaning: evaluateLayerMeaning(layer)
                };
                try { ly.threeDLayer = layer.threeDLayer; } catch (e) { }
                try { if (layer.autoOrient !== undefined) ly.autoOrient = layer.autoOrient; } catch (e) { }

                // Transform (value + keyframes), including anchor point
                var transformProps = ["ADBE Anchor Point", "ADBE Position", "ADBE Scale", "ADBE Rotate Z", "ADBE Opacity"];
                var transformNames = ["anchorPoint", "position", "scale", "rotation", "opacity"];
                ly.transform = {};
                var tGroup = layer.property("ADBE Transform Group");
                if (tGroup) {
                    for (var t = 0; t < transformProps.length; t++) {
                        var tp = tGroup.property(transformProps[t]);
                        if (tp) {
                            var tn = transformNames[t];
                            if (!ly.transform[tn]) ly.transform[tn] = {};
                            var tv = getPropValueSafe(tp);
                            if (tv !== null) ly.transform[tn].value = tv;
                            var tk = getKeyframesForProp(tp);
                            if (tk.length > 0) ly.transform[tn].keyframes = tk;
                            try {
                                if (tp.expression !== undefined && tp.expression !== null && String(tp.expression).length > 0)
                                    ly.transform[tn].expression = String(tp.expression);
                            } catch (e) { }
                        }
                    }
                    if (layer.threeDLayer) {
                        try {
                            var orientProp = tGroup.property("ADBE Orientation");
                            if (orientProp) {
                                ly.transform.orientation = {};
                                var ov = getPropValueSafe(orientProp);
                                if (ov !== null) ly.transform.orientation.value = ov;
                                var ok = getKeyframesForProp(orientProp);
                                if (ok.length > 0) ly.transform.orientation.keyframes = ok;
                                try { if (orientProp.expression && String(orientProp.expression).length > 0) ly.transform.orientation.expression = String(orientProp.expression); } catch (e2) { }
                            }
                        } catch (e) { }
                    }
                }

                // Effects (full tree: name, matchName, value, keyframes, nested properties)
                if (layer.Effects && layer.Effects.numProperties > 0) {
                    ly.effects = [];
                    for (var j = 1; j <= layer.Effects.numProperties; j++) {
                        var fx = layer.Effects(j);
                        var fxNode = collectPropertyTree(fx, 0, 6);
                        if (fxNode) ly.effects.push(fxNode);
                    }
                }

                // Time Remap (ADBE Time Remapping)
                try {
                    var timeRemapProp = layer.property("ADBE Time Remapping");
                    if (timeRemapProp) {
                        var trv = getPropValueSafe(timeRemapProp);
                        var trk = getKeyframesForProp(timeRemapProp);
                        var trExpr = "";
                        try { if (timeRemapProp.expression && String(timeRemapProp.expression).length > 0) trExpr = String(timeRemapProp.expression); } catch (e2) { }
                        if (trv !== null || trk.length > 0 || trExpr.length > 0) {
                            ly.timeRemap = {};
                            if (trv !== null) ly.timeRemap.value = trv;
                            if (trk.length > 0) ly.timeRemap.keyframes = trk;
                            if (trExpr.length > 0) ly.timeRemap.expression = trExpr;
                        }
                    }
                } catch (e) { }

                // Layer Styles (ADBE Layer Styles: Drop Shadow, Stroke, Outer Glow, etc.)
                try {
                    var layerStylesGroup = layer.property("ADBE Layer Styles");
                    if (layerStylesGroup && layerStylesGroup.numProperties > 0) {
                        ly.layerStyles = collectPropertyTree(layerStylesGroup, 0, 6);
                    }
                } catch (e) { }

                // Masks (pathValue + pathKeyframes use layer space; see _coordinateSystems.maskPath)
                if (layer.property("ADBE Mask Parade") && layer.property("ADBE Mask Parade").numProperties > 0) {
                    ly.masks = [];
                    var maskParade = layer.property("ADBE Mask Parade");
                    for (var m = 1; m <= maskParade.numProperties; m++) {
                        var maskGroup = maskParade.property(m);
                        var maskInfo = { name: maskGroup.name, matchName: maskGroup.matchName || "" };
                        try { maskInfo.inverted = layer.mask(m).inverted; } catch (e) { }
                        var maskPath = maskGroup.property("ADBE Mask Shape");
                        if (maskPath) {
                            maskInfo.pathKeyframes = getKeyframesForProp(maskPath);
                            var pv = getPropValueSafe(maskPath);
                            if (pv !== null) maskInfo.pathValue = pv;
                        }
                        ly.masks.push(maskInfo);
                    }
                }

                // Text layer: Source Text snippet, animators (with keyframes)
                if (layer instanceof TextLayer) {
                    ly.text = {};
                    try {
                        var srcTextProp = layer.property("Source Text");
                        if (srcTextProp && srcTextProp.value) {
                            var doc = srcTextProp.value;
                            ly.text.sourceText = (doc.text || "").substring(0, 500);
                            ly.text.font = doc.font || null;
                            ly.text.fontSize = doc.fontSize || null;
                            ly.text.fillColor = doc.fillColor ? [doc.fillColor[0], doc.fillColor[1], doc.fillColor[2]] : null;
                            try { if (doc.justification !== undefined) ly.text.justification = doc.justification; } catch (e) { }
                            try { if (doc.tracking !== undefined) ly.text.tracking = doc.tracking; } catch (e) { }
                            ly.text.sourceTextKeyframes = getKeyframesForProp(srcTextProp);
                        }
                    } catch (e) { }
                    try {
                        var animators = layer.property("ADBE Text Properties").property("ADBE Text Animators");
                        if (animators && animators.numProperties > 0) {
                            ly.text.animators = [];
                            for (var a = 1; a <= animators.numProperties; a++) {
                                var anim = animators.property(a);
                                var animInfo = { name: anim.name, matchName: anim.matchName || "" };
                                animInfo.properties = [];
                                for (var ap = 1; ap <= anim.numProperties; ap++) {
                                    var aChild = collectPropertyTree(anim.property(ap), 0, 4);
                                    if (aChild) animInfo.properties.push(aChild);
                                }
                                ly.text.animators.push(animInfo);
                            }
                        }
                    } catch (e) { }
                }

                // Shape layer: Contents tree (ADBE Root Vectors Group)
                if (layer instanceof ShapeLayer) {
                    try {
                        var contentsRoot = layer.property("ADBE Root Vectors Group");
                        if (!contentsRoot || contentsRoot.numProperties === 0) contentsRoot = layer.property("Contents");
                        if (contentsRoot && contentsRoot.numProperties > 0) {
                            ly.contents = collectPropertyTree(contentsRoot, 0, 12);
                        }
                    } catch (e) { }
                }

                // Layer markers
                try {
                    var layerMarkerProp = layer.marker;
                    if (layerMarkerProp && layerMarkerProp.numKeys > 0) {
                        ly.markers = getMarkersFromProperty(layerMarkerProp);
                    }
                } catch (e) { }

                // Layer source (footage/solid or composition)
                try {
                    var src = layer.source;
                    if (src) {
                        if (src.mainSource !== undefined) {
                            var ms = src.mainSource;
                            if (ms) {
                                if (ms.color !== undefined && ms.width !== undefined && ms.height !== undefined) {
                                    ly.source = {
                                        type: "solid",
                                        color: ms.color ? [ms.color[0], ms.color[1], ms.color[2]] : null,
                                        width: ms.width,
                                        height: ms.height
                                    };
                                } else {
                                    ly.source = { type: "footage", name: String(src.name) };
                                    try { if (ms.file) ly.source.file = String(ms.file.fsName); } catch (e2) { }
                                }
                            }
                        } else if (src.numLayers !== undefined) {
                            ly.source = { type: "composition", name: String(src.name) };
                        }
                    }
                } catch (e) { }

                audit.layers.push(ly);
            }

            // Art Direction checks (vs TradingPower spec)
            audit.artDirectionChecks = checkArtDirection(comp, audit);

            var txtStr = auditToTxt(audit);

            var saveFile;
            if (silent) {
                saveFile = new File("d:/01_Work_Projects/ArtistEdit/TradingEdit/06.Process/active_comp_audit.txt");
            } else {
                var d = new Date();
                var ts = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + "_" + d.getHours() + "-" + d.getMinutes();
                var defaultName = "TradingPower_Audit_" + ts + ".txt";
                saveFile = File.saveDialog("Save Audit Report (TXT)", defaultName);
                if (!saveFile) return;
                if (saveFile.name.indexOf(".") < 0) saveFile = new File(saveFile.fsName + ".txt");
            }
            saveFile.open("w");
            saveFile.encoding = "UTF-8";
            saveFile.write(txtStr);
            saveFile.close();

            if (!silent) {
                var adMsg = "";
                if (audit.artDirectionChecks) {
                    adMsg = "\nArt Direction: " + audit.artDirectionChecks.passed + "/" + audit.artDirectionChecks.total + " passed (" + audit.artDirectionChecks.scorePercent + "%).";
                }
            }
        } catch (err) {
            if (!silent) alert("Error in Audit v3.9: " + err.toString());
        }
    }

    function getLayerType(l) {
        if (l instanceof TextLayer) return "Text";
        if (l instanceof ShapeLayer) return "Shape";
        if (l.adjustmentLayer) return "Adjustment";
        if (l.nullLayer) return "Null";
        return "Footage/Solid";
    }

    function getBlendingModeName(m) {
        var modes = ["None", "Darks/Darken", "Darks/Multiply", "Darks/ColorBurn", "Darks/ClassicColorBurn", "Darks/LinearBurn", "Darks/DarkerColor", "Lights/Add", "Lights/Lighten", "Lights/Screen", "Lights/ColorDodge", "Lights/ClassicColorDodge", "Lights/LinearDodge", "Lights/LighterColor", "Inversions/Overlay", "Inversions/SoftLight", "Inversions/HardLight", "Inversions/LinearLight", "Inversions/VividLight", "Inversions/PinLight", "Inversions/HardMix", "Inversions/Difference", "Inversions/ClassicDifference", "Inversions/Exclusion"];
        return (m >= 0 && m < modes.length) ? modes[m] : "Normal";
    }

    /** Safe JSON stringify for ExtendScript (no native JSON). Escapes strings. */
    function toJSONString(val) {
        if (val === null || val === undefined) return "null";
        if (typeof val === "boolean") return val ? "true" : "false";
        if (typeof val === "number") return isFinite(val) ? String(val) : "null";
        if (typeof val === "string") {
            var s = "\"";
            for (var i = 0; i < val.length; i++) {
                var c = val.charAt(i);
                if (c === "\\") s += "\\\\";
                else if (c === "\"") s += "\\\"";
                else if (c === "\n") s += "\\n";
                else if (c === "\r") s += "\\r";
                else if (c === "\t") s += "\\t";
                else s += c;
            }
            return s + "\"";
        }
        if (val instanceof Array) {
            var parts = [];
            for (var j = 0; j < val.length; j++) parts.push(toJSONString(val[j]));
            return "[" + parts.join(",") + "]";
        }
        if (typeof val === "object") {
            var keys = [];
            for (var k in val) if (val.hasOwnProperty(k)) keys.push(k);
            var pairs = [];
            for (var n = 0; n < keys.length; n++) {
                var key = keys[n];
                pairs.push(toJSONString(key) + ":" + toJSONString(val[key]));
            }
            return "{" + pairs.join(",") + "}";
        }
        return "null";
    }

    /** Serialize AE Shape (mask path) to plain object. Coordinates are in layer space (origin = layer anchor). */
    function serializeShape(shape) {
        if (!shape || typeof shape !== "object") return null;
        try {
            if (shape.vertices === undefined || shape.closed === undefined) return null;
            var out = { closed: !!shape.closed, vertices: [] };
            var i, j;
            for (i = 0; i < shape.vertices.length; i++) {
                var v = shape.vertices[i];
                if (v instanceof Array) {
                    var pt = [];
                    for (j = 0; j < v.length; j++) pt.push(typeof v[j] === "number" ? Math.round(v[j] * 1000) / 1000 : v[j]);
                    out.vertices.push(pt);
                }
            }
            if (shape.inTangents && shape.inTangents.length) {
                out.inTangents = [];
                for (i = 0; i < shape.inTangents.length; i++) {
                    var t = shape.inTangents[i];
                    if (t instanceof Array) {
                        var tp = [];
                        for (j = 0; j < t.length; j++) tp.push(typeof t[j] === "number" ? Math.round(t[j] * 1000) / 1000 : t[j]);
                        out.inTangents.push(tp);
                    }
                }
            }
            if (shape.outTangents && shape.outTangents.length) {
                out.outTangents = [];
                for (i = 0; i < shape.outTangents.length; i++) {
                    var tout = shape.outTangents[i];
                    if (tout instanceof Array) {
                        var tpo = [];
                        for (j = 0; j < tout.length; j++) tpo.push(typeof tout[j] === "number" ? Math.round(tout[j] * 1000) / 1000 : tout[j]);
                        out.outTangents.push(tpo);
                    }
                }
            }
            return out;
        } catch (e) { return null; }
    }

    /** Get serializable value from a property (number, array, string, or Shape). */
    function getPropValueSafe(prop) {
        if (!prop || !prop.value) return null;
        try {
            var v = prop.value;
            if (typeof v === "number") return Math.round(v * 1000) / 1000;
            if (v instanceof Array) {
                var arr = [];
                for (var i = 0; i < v.length; i++) arr.push(typeof v[i] === "number" ? Math.round(v[i] * 1000) / 1000 : v[i]);
                return arr;
            }
            if (typeof v === "object" && v !== null) {
                if (v.vertices !== undefined && v.closed !== undefined) return serializeShape(v);
                return String(v);
            }
            return String(v);
        } catch (e) { return null; }
    }

    /** AE KeyframeInterpolationType enum → human-readable name (for agent). */
    var INTERPOLATION_TYPE_MAP = { "6612": "LINEAR", "6613": "BEZIER", "6614": "HOLD", "6615": "LINEAR_IN_BEZIER_OUT", "6616": "BEZIER_IN_LINEAR_OUT" };
    function getInterpolationTypeName(code) {
        if (code === undefined || code === null) return null;
        var s = String(code);
        return INTERPOLATION_TYPE_MAP[s] || s;
    }

    /** Get keyframes for a property as array of {t, value, interpolationIn?, interpolationOut?, interpolationInName?, interpolationOutName?}. */
    function getKeyframesForProp(prop) {
        if (!prop || prop.numKeys === 0) return [];
        var keys = [];
        try {
            for (var i = 1; i <= prop.numKeys; i++) {
                var t = prop.keyTime(i);
                var v = prop.keyValue(i);
                var val;
                if (v && typeof v === "object" && v.vertices !== undefined && v.closed !== undefined) val = serializeShape(v);
                else if (v instanceof Array) { val = v.slice(); for (var j = 0; j < val.length; j++) if (typeof val[j] === "number") val[j] = Math.round(val[j] * 1000) / 1000; }
                else if (typeof v === "number") val = Math.round(v * 1000) / 1000;
                else val = v;
                var k = { t: Math.round(t * 1000) / 1000, value: val };
                try {
                    if (prop.keyInInterpolationType) {
                        k.interpolationIn = String(prop.keyInInterpolationType(i));
                        k.interpolationInName = getInterpolationTypeName(k.interpolationIn);
                    }
                    if (prop.keyOutInterpolationType) {
                        k.interpolationOut = String(prop.keyOutInterpolationType(i));
                        k.interpolationOutName = getInterpolationTypeName(k.interpolationOut);
                    }
                } catch (e2) { }
                keys.push(k);
            }
        } catch (e) { }
        return keys;
    }

    /** Get markers from a Marker property (comp.markerProperty or layer.marker) as array of {t, comment, duration?, chapter?, url?, label?}. */
    function getMarkersFromProperty(markerProp) {
        if (!markerProp || markerProp.numKeys === 0) return [];
        var list = [];
        try {
            for (var i = 1; i <= markerProp.numKeys; i++) {
                var t = markerProp.keyTime(i);
                var mv = markerProp.keyValue(i);
                var m = { t: Math.round(t * 1000) / 1000 };
                try { if (mv.comment !== undefined) m.comment = String(mv.comment); } catch (e) { }
                try { if (mv.duration !== undefined) m.duration = Math.round(mv.duration * 1000) / 1000; } catch (e) { }
                try { if (mv.chapter !== undefined && String(mv.chapter).length > 0) m.chapter = String(mv.chapter); } catch (e) { }
                try { if (mv.url !== undefined && String(mv.url).length > 0) m.url = String(mv.url); } catch (e) { }
                try { if (mv.label !== undefined) m.label = mv.label; } catch (e) { }
                try { if (mv.protectedRegion !== undefined) m.protectedRegion = mv.protectedRegion; } catch (e) { }
                list.push(m);
            }
        } catch (e) { }
        return list;
    }

    /** Recursively collect effect (or any property group) into {name, matchName, value?, keyframes?, expression?, properties?}. */
    function collectPropertyTree(propGroup, depth, maxDepth) {
        if (!propGroup || depth > (maxDepth || 8)) return null;
        var out = { name: propGroup.name, matchName: (propGroup.matchName || "") };
        try {
            if (propGroup.propertyValueType !== undefined) {
                var v = getPropValueSafe(propGroup);
                if (v !== null) out.value = v;
                var kf = getKeyframesForProp(propGroup);
                if (kf.length > 0) out.keyframes = kf;
                if (propGroup.expression !== undefined && propGroup.expression !== null && String(propGroup.expression).length > 0)
                    out.expression = String(propGroup.expression);
            }
            if (propGroup.numProperties > 0) {
                out.properties = [];
                for (var i = 1; i <= propGroup.numProperties; i++) {
                    var child = collectPropertyTree(propGroup.property(i), depth + 1, maxDepth);
                    if (child) out.properties.push(child);
                }
            }
        } catch (e) { }
        return out;
    }

    function evaluateLayerMeaning(l) {
        var n = l.name.toLowerCase();
        if (l.nullLayer && l.property("Position").numKeys > 0) return "Zoom/Motion Controller";
        if (n.indexOf("supply") != -1 || n.indexOf("demand") != -1) return "S/D Zone (Price Area)";
        if (n.indexOf("hh") != -1 || n.indexOf("hl") != -1 || n.indexOf("lh") != -1 || n.indexOf("ll") != -1) return "Market Structure Label (HH/HL/LH/LL)";
        if (l.adjustmentLayer && l.Effects.numProperties > 0) return "Visual Focus/Coloring";
        if (l.property("Opacity").numKeys > 0) return "Fade Animation";
        if (l.property("Scale").numKeys > 0 && l.property("Scale").keyValue(1)[0] == 0) return "Pop-in Entrance";
        return null;
    }

    // (Removed sendToRender)

    // ---------------------------------------------------------------------------------
    // NEW: EXTRA CONTROLS FUNCTIONS (LOGIC FIXED)
    // ---------------------------------------------------------------------------------


    // ---------------------------------------------------------------------------------
    // UI CREATION (Static Layout - Stable)
    // ---------------------------------------------------------------------------------
    // UI CREATION (v1.4 - Tabbed Workflow)
    // ---------------------------------------------------------------------------------

    /** Quick Center Chart - v4.5 (Deep Search) */
    function quickCenterChart() {
        var comp = getActiveComp();
        if (!comp) return;

        app.beginUndoGroup("Quick Center Chart");
        try {
            var count = 0;
            for (var i = 1; i <= comp.numLayers; i++) {
                var l = comp.layer(i);
                var n = l.name.toUpperCase();
                // Aggressive search: Any Null or Shape with these keywords
                var isTargetMatch = (n.indexOf("ZOOM") !== -1 || n.indexOf("CONTROL") !== -1 || n.indexOf("NULL") !== -1 || n.indexOf("MASTER") !== -1);

                if (isTargetMatch) {
                    try {
                        // Reset spatial and scale
                        if (l.property("Scale")) l.property("Scale").setValue([100, 100]);
                        if (l.property("Position")) l.property("Position").setValue([comp.width / 2, comp.height / 2]);
                        if (l.property("Rotation")) l.property("Rotation").setValue(0);
                        count++;
                    } catch (e) { /* Skip if properties locked/hidden */ }
                }
            }
            if (count === 0) alert("No active Controllers found to reset.");
        } catch (err) {
            alert("Reset Error: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    // ---------------------------------------------------------------------------------
    // Victor template: Zoom (Null Collect 1) – step 2 in edit flow
    // ---------------------------------------------------------------------------------

    /** Find zoom master: layer name contains "Null Collect" and is Null (Victor template) */
    function findZoomNull(comp) {
        if (!comp) return null;
        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);
            if (l.nullLayer && l.name.toUpperCase().indexOf("NULL COLLECT") !== -1) {
                return l;
            }
        }
        return null;
    }

    /** Set Position & Scale keyframe on zoom null at current time. Adjust keyframe to zoom in/out. */
    function setZoomKeyframeHere() {
        var comp = getActiveComp();
        if (!comp) return;

        var zoomNull = findZoomNull(comp);
        if (!zoomNull) {
            alert("Layer 'Null Collect 1' (Zoom controller) not found. Ensure comp has a Null with name containing 'Null Collect'.");
            return;
        }

        app.beginUndoGroup("Set Zoom Keyframe (Layer 15)");
        try {
            var t = comp.time;
            var posProp = zoomNull.property("Position");
            var scaleProp = zoomNull.property("Scale");

            var posVal = posProp.value;
            var scaleVal = scaleProp.value;
            if (scaleVal instanceof Array === false) scaleVal = [scaleVal, scaleVal];

            posProp.setValueAtTime(t, posVal);
            scaleProp.setValueAtTime(t, scaleVal);
        } catch (err) {
            alert("Set Zoom Keyframe error: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    /** Parent all video layers (Base.mp4 or name containing "Base") to Null Collect 1. Use when comp has broken parenting. */
    function parentVideoLayersToZoomNull() {
        var comp = getActiveComp();
        if (!comp) return;

        var zoomNull = findZoomNull(comp);
        if (!zoomNull) {
            alert("Layer 'Null Collect 1' not found. Cannot assign parent.");
            return;
        }

        var selectedLayers = getSelectedLayers(comp);
        var layersToParent = selectedLayers.length > 0 ? selectedLayers : null;

        app.beginUndoGroup("Parent Video to Zoom Null");
        try {
            var count = 0;
            if (layersToParent && layersToParent.length > 0) {
                for (var i = 0; i < layersToParent.length; i++) {
                    var l = layersToParent[i];
                    if (l === zoomNull) continue;
                    l.parent = zoomNull;
                    count++;
                }
            } else {
                for (var j = 1; j <= comp.numLayers; j++) {
                    var layer = comp.layer(j);
                    if (layer === zoomNull) continue;
                    if (!(layer instanceof AVLayer)) continue;
                    var nameUpper = layer.name.toUpperCase();
                    var srcName = (layer.source && layer.source.name) ? layer.source.name.toUpperCase() : "";
                    var isVideo = (nameUpper.indexOf("BASE") !== -1 && srcName.indexOf(".MP4") !== -1) || srcName.indexOf(".MP4") !== -1;
                    if (isVideo) {
                        layer.parent = zoomNull;
                        count++;
                    }
                }
            }
        } catch (err) {
            alert("Parent Video error: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    // ---------------------------------------------------------------------------------
    // UI CREATION (v4.0 - Template DNA)
    // ---------------------------------------------------------------------------------


    /** Helper: Easy Ease Keyframes (Multi-dimensional safe) */
    function setEasyEase(prop, time) {
        if (!prop || prop.numKeys === 0) return;
        try {
            var keyIndex = prop.nearestKeyIndex(time);
            var easeIn = new KeyframeEase(0, 33);
            var easeOut = new KeyframeEase(0, 33);

            var dims = 1;
            if (prop.propertyValueType === PropertyValueType.TwoD || prop.propertyValueType === PropertyValueType.TwoD_SPATIAL) dims = 2;
            if (prop.propertyValueType === PropertyValueType.ThreeD || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) dims = 3;

            // Final fallback: Scale is almost always 3D in scripting context
            if (prop.matchName === "ADBE Scale") dims = 3;

            var easeArrayIn = [];
            var easeArrayOut = [];
            for (var i = 0; i < dims; i++) {
                easeArrayIn.push(easeIn);
                easeArrayOut.push(easeOut);
            }
            prop.setTemporalEaseAtKey(keyIndex, easeArrayIn, easeArrayOut);
        } catch (e) { }
    }

    function sortLayersByInPoint() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please open a valid Composition.");
            return;
        }

        app.beginUndoGroup("Sort Layers Staircase");
        try {
            var targets = [];
            var sel = comp.selectedLayers;
            var useSelection = (sel.length > 0);

            if (useSelection) {
                for (var i = 0; i < sel.length; i++) {
                    targets.push(sel[i]);
                }
            } else {
                for (var i = 1; i <= comp.numLayers; i++) {
                    var layer = comp.layer(i);
                    if (!layer.locked) {
                        targets.push(layer);
                    }
                }
            }

            // Data wrapper for stable sort
            var sortData = [];
            for (var i = 0; i < targets.length; i++) {
                sortData.push({
                    layer: targets[i],
                    inPoint: targets[i].inPoint,
                    originalIndex: targets[i].index
                });
            }

            // Sort: Descending InPoint (Latest First). Stable on Index.
            sortData.sort(function (a, b) {
                var diff = b.inPoint - a.inPoint;
                if (Math.abs(diff) > 0.0001) return diff;
                return a.originalIndex - b.originalIndex;
            });

            // Apply Move (Reverse Loop matches moveToBeginning stack logic)
            for (var i = sortData.length - 1; i >= 0; i--) {
                sortData[i].layer.moveToBeginning();
            }

        } catch (err) {
            alert("Sort Error: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    /** Add Circle FX with Trim Paths Reveal (Corrected Layer Ordering) */
    function addCircleFX() {
        var comp = getActiveComp();
        if (!comp) return;

        app.beginUndoGroup("Add Circle FX");
        try {
            var insertRef = getInsertBeforeLayer(comp);
            var playhead = comp.time;
            var shapeLayer = comp.layers.addShape();
            shapeLayer.name = "CIRCLE FX (TRIM)";
            shapeLayer.label = 9; // Blue
            shapeLayer.startTime = playhead;
            shapeLayer.property("Position").setValue([comp.width / 2, comp.height / 2]);

            var contents = shapeLayer.property("Contents");
            var group = contents.addProperty("ADBE Vector Group");
            var ellipse = group.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
            ellipse.property("Size").setValue([300, 300]);

            var stroke = group.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
            stroke.property("Color").setValue(BRAND.colors.gold);
            stroke.property("Stroke Width").setValue(8);

            // Trim Paths
            var trim = group.property("Contents").addProperty("ADBE Vector Filter - Trim");
            trim.property("End").setValueAtTime(playhead, 0);
            trim.property("End").setValueAtTime(playhead + 0.6, 100);

            setEasyEase(trim.property("End"), playhead);
            setEasyEase(trim.property("End"), playhead + 0.6);

            // Glow
            try {
                var glow = shapeLayer.Effects.addProperty("ADBE Glo2");
                glow.property("Glow Radius").setValue(30);
                glow.property("Glow Intensity").setValue(0.6);
                glow.property("Glow Threshold").setValue(30);
            } catch (e) { }

            moveNewLayerToInsertPosition(shapeLayer, insertRef);
            restoreSelectionAfterInsert(comp, insertRef);

        } catch (err) {
            alert("Circle FX Error: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    function createUI(thisObj) {
        var myWindow = (thisObj instanceof Panel) ? thisObj : new Window("palette", typeof TRADINGPOWER_VERSION_TEXT !== "undefined" ? TRADINGPOWER_VERSION_TEXT : "TradingPower Tool v9.1", undefined, { resizeable: true });
        myWindow.orientation = "row";
        myWindow.alignChildren = ["fill", "fill"];
        myWindow.spacing = 0;

        try {
            var buttonHeight = 22;
            var colWidth = 100;
            var panelSpacing = 6;
            var gold = [0.85, 0.65, 0.15];

            var container = myWindow.add("group");
            container.orientation = "column";
            container.alignChildren = ["fill", "top"];
            container.alignment = ["fill", "fill"];
            try { container.margins = 8; } catch (e) { }
            container.spacing = 6;

            var accentBar = container.add("panel", undefined, "");
            try { accentBar.preferredSize = [-1, 2]; accentBar.alignment = ["fill", "top"]; } catch (e) { }
            try { accentBar.graphics.backgroundColor = accentBar.graphics.newBrush(accentBar.graphics.BrushType.SOLID_COLOR, gold, 1); } catch (e) { }

            var rowGroup = container.add("group");
            rowGroup.orientation = "row";
            rowGroup.alignChildren = ["fill", "top"];
            rowGroup.spacing = 8;

            // --- COL 1: TYPOGRAPHY & HIGHLIGHTS ---
            var col1 = rowGroup.add("group");
            col1.orientation = "column";
            col1.alignChildren = ["fill", "top"];
            col1.spacing = panelSpacing;
            try { col1.preferredSize = [colWidth, -1]; } catch (e) { }

            // Panel: Highlights (Circle, FX)
            var highPanel = col1.add("panel", undefined, "Highlights");
            highPanel.alignChildren = ["fill", "top"];
            highPanel.spacing = 4;

            var btnCircle = highPanel.add("button", undefined, "CIRCLE FX");
            btnCircle.preferredSize.height = buttonHeight;
            btnCircle.helpTip = "Adds a circular stroke reveal highlight.";

            var btnHighlightBasic = highPanel.add("button", undefined, "HIGHLIGHT BASIC");
            btnHighlightBasic.preferredSize.height = buttonHeight;
            btnHighlightBasic.helpTip = "Draw shape, select it, then click.";

            // Panel: Typography (Lesson, Section, Add Text)
            var typoPanel = col1.add("panel", undefined, "Typography");
            typoPanel.alignChildren = ["fill", "top"];
            typoPanel.spacing = 4;

            typoPanel.add("statictext", undefined, "Lesson:");
            var lessonInput = typoPanel.add("edittext", undefined, "...", { multiline: true });
            lessonInput.preferredSize.height = 45;
            var btnLesson = typoPanel.add("button", undefined, "GENERATE LESSON");
            btnLesson.preferredSize.height = buttonHeight;

            typoPanel.add("statictext", undefined, "Section:");
            var sectionInput = typoPanel.add("edittext", undefined, "...", { multiline: true });
            sectionInput.preferredSize.height = 45;
            var btnSection = typoPanel.add("button", undefined, "SECTION TEXT");
            btnSection.preferredSize.height = buttonHeight;

            typoPanel.add("statictext", undefined, "Quick Text:");
            var addTextInput = typoPanel.add("edittext", undefined, "...", { multiline: true });
            addTextInput.preferredSize.height = 45;
            var btnAddText = typoPanel.add("button", undefined, "ADD TEXT");
            btnAddText.preferredSize.height = buttonHeight;




            // --- COL 2: MOTION & CREATIVE & QUALITY ---
            var col2 = rowGroup.add("group");
            col2.orientation = "column";
            col2.alignChildren = ["fill", "top"];
            col2.spacing = panelSpacing;
            try { col2.preferredSize = [colWidth, -1]; } catch (e) { }

            // Panel: Super Zoom (Moved to Top of Col 2)
            var zoomPanel = col2.add("panel", undefined, "Super Zoom Tool");
            zoomPanel.alignChildren = ["fill", "top"];
            zoomPanel.spacing = 4;

            var btnCreateZoomBase = zoomPanel.add("button", undefined, "CREATE BASE SHAPE");
            btnCreateZoomBase.preferredSize.height = buttonHeight;
            btnCreateZoomBase.helpTip = "Creates a full screen rectangle (#0C1F34) for Super Zoom.";

            var btnSuperZoom = zoomPanel.add("button", undefined, "RUN SUPER ZOOM");
            btnSuperZoom.preferredSize.height = buttonHeight;
            btnSuperZoom.helpTip = "Select 1 Shape (0C1F34) + 1 Video, then click.";

            // Panel: Motion
            var motionPanel = col2.add("panel", undefined, "Motion");
            motionPanel.alignChildren = ["fill", "top"];
            motionPanel.spacing = 4;

            var btnGoldLineOnly = motionPanel.add("button", undefined, "GOLD LINE (Trim)");
            btnGoldLineOnly.preferredSize.height = buttonHeight;



            var fadeRow = motionPanel.add("group");
            fadeRow.orientation = "row";
            fadeRow.alignChildren = ["fill", "top"];
            fadeRow.spacing = 4;
            var btnFadeIn = fadeRow.add("button", undefined, "FADE IN");
            var btnFadeOut = fadeRow.add("button", undefined, "FADE OUT");
            btnFadeIn.preferredSize.height = btnFadeOut.preferredSize.height = buttonHeight;

            // Panel: Creative (Meme)
            var creativePanel = col2.add("panel", undefined, "Creative");
            creativePanel.alignChildren = ["fill", "top"];
            creativePanel.spacing = 4;
            creativePanel.add("statictext", undefined, "Meme Text:");
            var memeTextInput = creativePanel.add("edittext", undefined, "...");
            var btnMeme = creativePanel.add("button", undefined, "GENERATE MEME");
            btnMeme.preferredSize.height = buttonHeight;
            btnMeme.helpTip = "Select GIF in Project, enter text, then click.";

            // Panel: System / Quality
            var systemPanel = col2.add("panel", undefined, "System");
            systemPanel.alignChildren = ["fill", "top"];
            systemPanel.spacing = 4;
            var btnAudit = systemPanel.add("button", undefined, "RUN FULL AUDIT");
            btnAudit.preferredSize.height = buttonHeight;

            var btnSortTime = systemPanel.add("button", undefined, "SORT TIME (Staircase)");
            btnSortTime.preferredSize.height = buttonHeight;
            btnSortTime.helpTip = "Sorts layers by Start Time (Latest on Top, Earliest on Bottom). Stable sort.";

            // --- FOOTER ---
            var footerGroup = container.add("group");
            footerGroup.orientation = "column";
            footerGroup.alignChildren = ["center", "center"];
            footerGroup.alignment = ["fill", "bottom"];
            footerGroup.spacing = 2;

            var versionText = footerGroup.add("statictext", undefined, typeof TRADINGPOWER_VERSION_TEXT !== "undefined" ? TRADINGPOWER_VERSION_TEXT : "TradingPower Tool v9.1");
            versionText.graphics.font = ScriptUI.newFont("Tahoma", "BOLD", 8);

            var primaryButtons = [btnLesson, btnSection, btnSuperZoom, btnCreateZoomBase, btnHighlightBasic, btnCircle, btnMeme, btnAddText, btnGoldLineOnly, btnFadeIn, btnFadeOut, btnAudit, btnSortTime];
            for (var i = 0; i < primaryButtons.length; i++) {
                try { primaryButtons[i].graphics.foregroundColor = primaryButtons[i].graphics.newPen(primaryButtons[i].graphics.PenType.SOLID_COLOR, gold, 1); } catch (e) { }
            }

            // --- EVENT LOGIC ---
            btnLesson.onClick = function () { addLessonTitle(lessonInput.text); };
            btnSection.onClick = function () {
                var txt = (sectionInput.text) ? sectionInput.text : "SECTION HEADER";
                addSectionText(txt);
            };
            btnAddText.onClick = function () {
                var txt = (addTextInput && addTextInput.text !== undefined) ? addTextInput.text : "";
                addAddText(txt);
            };
            btnSortTime.onClick = function () { sortLayersByInPoint(); };

            btnSuperZoom.onClick = function () { addSuperZoom(); };
            btnCreateZoomBase.onClick = function () { createZoomShape(); };
            btnCircle.onClick = function () { addCircleFX(); };
            btnHighlightBasic.onClick = function () { addHighlightBasic(); };

            btnGoldLineOnly.onClick = addGoldLine;

            btnFadeIn.onClick = function () { applyFade("in"); };
            btnFadeOut.onClick = function () { applyFade("out"); };

            btnMeme.onClick = function () {
                var txt = (memeTextInput.text) ? String(memeTextInput.text) : "";
                addMemeFrame(txt, null);
            };

            btnAudit.onClick = auditComposition;

            myWindow.onResizing = myWindow.onResize = function () {
                try { this.layout.layout(true); } catch (e) { }
            };

            try { myWindow.layout.layout(true); } catch (e) { }

        } catch (e) {
            alert("UI DNA Error: " + e.toString() + " (line " + e.line + ")");
        }

        return myWindow;
    }

    // Expose API for Controller (Run_ScriptPart01.jsx) and audit_active_comp.jsx
    if (typeof $ !== 'undefined') {
        $.global.TradingPowerAPI = {
            runToolFromAPI: runToolFromAPI,
            auditComposition: auditComposition,
            runAuditForCompSilent: runAuditForCompSilent,
            findFootageByNameInFolder: findFootageByNameInFolder
        };
    }

    // ---------------------------------------------------------------------------------
    // BOOTSTRAP (skip UI when Controller __TP_NO_UI or RUN_AUDIT_SILENT)
    // ---------------------------------------------------------------------------------
    if (typeof RUN_AUDIT_SILENT !== 'undefined' && RUN_AUDIT_SILENT) {
        runAuditForCompSilent(app.project.activeItem);
    } else if (typeof __TP_NO_UI === 'undefined' || !__TP_NO_UI) {
        var myScriptPal = createUI(this);
        if (myScriptPal instanceof Window) {
            myScriptPal.center();
            myScriptPal.layout.resize(); // Recalculate initial size
            myScriptPal.show();
        }
    }

    /** Helper: Easy Ease Keyframes (Multi-dimensional safe) */
    function setEasyEase(prop, time) {
        if (!prop || prop.numKeys === 0) return;
        try {
            var keyIndex = prop.nearestKeyIndex(time);
            var easeIn = new KeyframeEase(0, 33);
            var easeOut = new KeyframeEase(0, 33);

            var dims = 1;
            if (prop.propertyValueType === PropertyValueType.TwoD || prop.propertyValueType === PropertyValueType.TwoD_SPATIAL) dims = 2;
            if (prop.propertyValueType === PropertyValueType.ThreeD || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) dims = 3;

            // Final fallback: Scale is almost always 3D in scripting context
            if (prop.matchName === "ADBE Scale") dims = 3;

            var easeArrayIn = [];
            var easeArrayOut = [];
            for (var i = 0; i < dims; i++) {
                easeArrayIn.push(easeIn);
                easeArrayOut.push(easeOut);
            }
            prop.setTemporalEaseAtKey(keyIndex, easeArrayIn, easeArrayOut);
        } catch (e) { }
    }

    function sortLayersByInPoint() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please open a valid Composition.");
            return;
        }

        app.beginUndoGroup("Sort Layers Staircase");
        try {
            var targets = [];
            var sel = comp.selectedLayers;
            var useSelection = (sel.length > 0);

            if (useSelection) {
                for (var i = 0; i < sel.length; i++) {
                    targets.push(sel[i]);
                }
            } else {
                for (var i = 1; i <= comp.numLayers; i++) {
                    var layer = comp.layer(i);
                    if (!layer.locked) {
                        targets.push(layer);
                    }
                }
            }

            // Data wrapper for stable sort
            var sortData = [];
            for (var i = 0; i < targets.length; i++) {
                sortData.push({
                    layer: targets[i],
                    inPoint: targets[i].inPoint,
                    originalIndex: targets[i].index
                });
            }

            // Sort: Descending InPoint (Latest First). Stable on Index.
            sortData.sort(function (a, b) {
                var diff = b.inPoint - a.inPoint;
                if (Math.abs(diff) > 0.0001) return diff;
                return a.originalIndex - b.originalIndex;
            });

            // Apply Move (Reverse Loop matches moveToBeginning stack logic)
            for (var i = sortData.length - 1; i >= 0; i--) {
                sortData[i].layer.moveToBeginning();
            }

        } catch (err) {
            alert("Sort Error: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }

    /** Add Circle FX with Trim Paths Reveal (Corrected Layer Ordering) */
    function addCircleFX() {
        var comp = getActiveComp();
        if (!comp) return;

        app.beginUndoGroup("Add Circle FX");
        try {
            var insertRef = getInsertBeforeLayer(comp);
            var playhead = comp.time;
            var shapeLayer = comp.layers.addShape();
            shapeLayer.name = "CIRCLE FX (TRIM)";
            shapeLayer.label = 9; // Blue
            shapeLayer.startTime = playhead;
            shapeLayer.property("Position").setValue([comp.width / 2, comp.height / 2]);

            var contents = shapeLayer.property("Contents");
            var group = contents.addProperty("ADBE Vector Group");
            var ellipse = group.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
            ellipse.property("Size").setValue([300, 300]);

            var stroke = group.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
            stroke.property("Color").setValue(BRAND.colors.gold);
            stroke.property("Stroke Width").setValue(8);

            // Trim Paths
            var trim = group.property("Contents").addProperty("ADBE Vector Filter - Trim");
            trim.property("End").setValueAtTime(playhead, 0);
            trim.property("End").setValueAtTime(playhead + 0.6, 100);

            setEasyEase(trim.property("End"), playhead);
            setEasyEase(trim.property("End"), playhead + 0.6);

            // Glow
            try {
                var glow = shapeLayer.Effects.addProperty("ADBE Glo2");
                glow.property("Glow Radius").setValue(30);
                glow.property("Glow Intensity").setValue(0.6);
                glow.property("Glow Threshold").setValue(30);
            } catch (e) { }

            moveNewLayerToInsertPosition(shapeLayer, insertRef);
            restoreSelectionAfterInsert(comp, insertRef);

        } catch (err) {
            alert("Circle FX Error: " + err.toString());
        } finally {
            app.endUndoGroup();
        }
    }
}
