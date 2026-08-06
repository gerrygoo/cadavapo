// WebGL image-to-image transition: a correspondence-based particle-swarm
// morph. The frame is split into an NxN grid of blocks; each source block is
// greedily matched to its nearest destination block (combined color +
// spatial distance, roughly one-to-one so blocks don't pile up), then
// rendered as a small textured quad that physically travels from its source
// position to its matched destination position as the transition advances,
// fading out near the end to reveal the destination frame (always drawn as
// a full-screen base layer beneath the swarm, so the final frame is always
// pixel-correct regardless of match quality).
//
// Two call sites use this: the homepage carousel and the project-tile
// poster flash (js/main.js). Every caller must keep a non-WebGL fallback —
// isSupported() can be false (old browsers, GPU blocklists, context
// limits), and a live context can still be lost mid-session.
//
// Five independently pluggable stages, each a registry on WebGLTransition
// (swap live via transition._matchFn / _positionEasingFn / _colorEasingFn /
// _phaseTiming / _staggerFn, or pass matchFn/positionEasing/colorEasing/
// phaseTiming/staggerFn to the constructor):
//   - WebGLTransition.matchers        — "find destination block" strategies.
//   - WebGLTransition.positionEasings — how a block's *position* interpolates
//     from src to dst center over the movement phase.
//   - WebGLTransition.colorEasings    — how a block's own *pixel content*
//     interpolates from src to dst color over the color phase.
//   - WebGLTransition.phaseTimings    — how the movement phase and color
//     phase line up against overall transition progress (concurrent, or one
//     before/after the other).
//   - WebGLTransition.staggers        — how much each block's own move/color
//     phase is delayed relative to its neighbors, as a function of the
//     block's *source* grid position (see "Stagger" below).
//
// Usage:
//   var t = new WebGLTransition(canvasEl);
//   t.setImage(img);                      // paint immediately, no animation
//   t.transitionTo(img2, 800).then(...);  // animate over 800ms

(function (global) {
  'use strict';

  // ── Background pass: plain full-screen image, always drawn opaque ──

  var BG_VERTEX_SRC = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var BG_FRAGMENT_SRC = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex;',
    'uniform vec4 uRect;', // xy = offset, zw = scale — cover-fit UV remap
    'void main() {',
    '  vec2 uv = vUv * uRect.zw + uRect.xy;',
    '  gl_FragColor = vec4(texture2D(uTex, uv).rgb, 1.0);',
    '}'
  ].join('\n');

  // ── Swarm pass: one quad per block, all in a single buffer/draw call.
  // Each vertex carries its block's home (src) and matched (dst) center —
  // that pair IS the correspondence computed on the CPU — plus a corner
  // offset shared by every block, so the vertex shader can both place the
  // quad (interpolating center between src/dst) and derive which crop of
  // the source texture belongs on it (from its *home* position, which never
  // moves, so the pixel content stays rigidly attached to the quad).

  var SWARM_VERTEX_SRC = [
    'attribute vec2 aLocalOffset;',
    'attribute vec2 aSrcCenter;',
    'attribute vec2 aDstCenter;',
    // Per-block delay, in [0,1], from the active stagger strategy (see
    // `staggers` below) — 0 blocks react to uMoveT/uColorT immediately, 1
    // blocks wait until the very end of the phase to start.
    'attribute float aStagger;',
    'uniform vec2 uCellSize;',
    'uniform vec4 uFromRect;',
    'uniform vec4 uToRect;',
    // uMoveT and uColorT are pre-eased, pre-windowed [0,1] values computed in
    // JS by the position/color easing functions (see phaseTimings/*Easings
    // below) — the shader itself stays a dumb interpolator between them so
    // all the "what does the curve/timing look like" tuning lives in one
    // place (JS), not split across shader and JS.
    'uniform float uMoveT;',
    'uniform float uMoveStagger;', // 0 = every block shares uMoveT exactly
    'uniform float uColorStagger;',
    'varying vec2 vSrcUV;',
    'varying vec2 vDstUV;',
    'varying float vAlpha;',
    'varying float vStagger;',
    // Remaps the shared, already-eased uMoveT/uColorT into a per-block local
    // progress: a block with delay `d` only starts advancing once uMoveT
    // passes `d * amount`, then races to catch up to 1 by the time uMoveT
    // hits 1 — so `amount` controls how much of the phase is "spent" on the
    // wave sweeping across blocks vs. actually moving them.
    'float staggerLocal(float t, float delay, float amount) {',
    '  float start = delay * amount;',
    '  return clamp((t - start) / max(0.0001, 1.0 - start), 0.0, 1.0);',
    '}',
    'void main() {',
    '  float moveLocal = staggerLocal(uMoveT, aStagger, uMoveStagger);',
    '  vec2 center = mix(aSrcCenter, aDstCenter, moveLocal);',
    '  vec2 pos = center + aLocalOffset * uCellSize;',
    '  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);',

    '  vec2 srcSampleUv = aSrcCenter + aLocalOffset * uCellSize;',
    '  vSrcUV = srcSampleUv * uFromRect.zw + uFromRect.xy;',
    // A block's destination content lives at the *same local position within
    // its matched dst block* — sampled from uTo here so the fragment shader
    // can color-morph a block into its own real destination pixels rather
    // than just cross-fading against the flat background layer.
    '  vec2 dstSampleUv = aDstCenter + aLocalOffset * uCellSize;',
    '  vDstUV = dstSampleUv * uToRect.zw + uToRect.xy;',
    // Blocks fade out only once they've essentially arrived (driven by the
    // block's own local move progress, not raw progress) — fading on raw
    // progress let blocks turn transparent while still visibly mid-slide,
    // which read as the destination image "winning the race" before motion
    // had actually settled.
    '  vAlpha = 1.0 - smoothstep(0.94, 1.0, moveLocal);',
    '  vStagger = aStagger;',
    '}'
  ].join('\n');

  var SWARM_FRAGMENT_SRC = [
    'precision mediump float;',
    'varying vec2 vSrcUV;',
    'varying vec2 vDstUV;',
    'varying float vAlpha;',
    'varying float vStagger;',
    'uniform sampler2D uFrom;',
    'uniform sampler2D uTo;',
    'uniform float uColorT;', // color/value-fade phase, independent of uMoveT
    'uniform float uColorStagger;',
    'float staggerLocal(float t, float delay, float amount) {',
    '  float start = delay * amount;',
    '  return clamp((t - start) / max(0.0001, 1.0 - start), 0.0, 1.0);',
    '}',
    'void main() {',
    '  vec3 fromColor = texture2D(uFrom, vSrcUV).rgb;',
    '  vec3 toColor = texture2D(uTo, vDstUV).rgb;',
    '  float colorLocal = staggerLocal(uColorT, vStagger, uColorStagger);',
    '  vec3 color = mix(fromColor, toColor, colorLocal);',
    '  gl_FragColor = vec4(color, vAlpha);',
    '}'
  ].join('\n');

  function compileShader(gl, type, src) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('WebGLTransition shader compile error: ' + log);
    }
    return shader;
  }

  function createProgram(gl, vertexSrc, fragmentSrc) {
    var vs = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
    var fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      var log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error('WebGLTransition program link error: ' + log);
    }
    return program;
  }

  function createTexture(gl) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return tex;
  }

  // "cover" fit: sampling vUv * scale + offset crops the image to fill the
  // box without distortion, mirroring CSS background-size: cover.
  function coverRect(imgW, imgH, boxW, boxH) {
    var imgRatio = imgW / imgH;
    var boxRatio = boxW / boxH;
    var scaleX = 1, scaleY = 1, offX = 0, offY = 0;
    if (imgRatio > boxRatio) {
      scaleX = boxRatio / imgRatio;
      offX = (1 - scaleX) / 2;
    } else {
      scaleY = imgRatio / boxRatio;
      offY = (1 - scaleY) / 2;
    }
    return [offX, offY, scaleX, scaleY];
  }

  function loadImage(src) {
    if (src instanceof HTMLImageElement || src instanceof HTMLCanvasElement ||
        (global.ImageBitmap && src instanceof ImageBitmap)) {
      return Promise.resolve(src);
    }
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  function naturalSize(img) {
    return [img.naturalWidth || img.width, img.naturalHeight || img.height];
  }

  // Picks a grid where `blocksShort` cells span the shorter canvas axis, so
  // cells land square in screen space regardless of aspect ratio.
  function pickGrid(blocksShort, canvasW, canvasH) {
    if (canvasW >= canvasH) {
      return [Math.max(1, Math.round(blocksShort * canvasW / canvasH)), blocksShort];
    }
    return [blocksShort, Math.max(1, Math.round(blocksShort * canvasH / canvasW))];
  }

  // Downsamples `img` (cropped to `rect`, a coverRect() result) into a
  // gridCols x gridRows buffer of average RGB colors — the browser's own
  // image-smoothing during the scale-down does the block-averaging.
  function sampleGridColors(scratchCtx, img, rect, gridCols, gridRows) {
    var size = naturalSize(img);
    var sx = rect[0] * size[0], sy = rect[1] * size[1];
    var sw = rect[2] * size[0], sh = rect[3] * size[1];
    scratchCtx.canvas.width = gridCols;
    scratchCtx.canvas.height = gridRows;
    scratchCtx.imageSmoothingEnabled = true;
    scratchCtx.clearRect(0, 0, gridCols, gridRows);
    scratchCtx.drawImage(img, sx, sy, sw, sh, 0, 0, gridCols, gridRows);
    return scratchCtx.getImageData(0, 0, gridCols, gridRows).data;
  }

  // "Find destination pixel" strategies: each entry maps every source block
  // to a destination block. Swappable per-instance via the `matchFn`
  // constructor option (or by reassigning `transition._matchFn` directly,
  // e.g. from a demo control) — add new experiments here rather than
  // editing the render pipeline. Signature:
  //   (fromPixels, toPixels, gridCols, gridRows, opts) -> Int32Array
  //   mapping, where mapping[srcBlockIndex] = dstBlockIndex, block index =
  //   row * gridCols + col, and fromPixels/toPixels are RGBA Uint8ClampedArrays
  //   (one 4-byte pixel per block, i.e. already-downsampled average colors).
  // Per-block Sobel edge magnitude, computed on the same downsampled
  // average-color grid used for color matching. That grid is itself already
  // a box-filtered convolution of the source image, so running a 3x3 Sobel
  // pass over it is a second convolution pass on top — no extra image
  // sampling required, and in the spirit of the original "convolution-based
  // passes between source and destination images" brief.
  function computeSobelMagnitudes(pixels, gridCols, gridRows) {
    function luminanceAt(c, r) {
      c = Math.min(gridCols - 1, Math.max(0, c));
      r = Math.min(gridRows - 1, Math.max(0, r));
      var i = (r * gridCols + c) * 4;
      return 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    }
    var gxKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    var gyKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    var out = new Float32Array(gridCols * gridRows);
    for (var r = 0; r < gridRows; r++) {
      for (var c = 0; c < gridCols; c++) {
        var gx = 0, gy = 0, k = 0;
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            var lum = luminanceAt(c + dc, r + dr);
            gx += lum * gxKernel[k];
            gy += lum * gyKernel[k];
            k++;
          }
        }
        out[r * gridCols + c] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    return out;
  }

  var matchers = {
    // Greedily matches each source block to a destination block by combined
    // color + spatial distance (cheapest pairs claimed first, each block
    // used once) — an approximation of optimal assignment that's cheap
    // enough to run on the CPU per transition and avoids the pile-ups/gaps
    // that letting every source block pick its own independent nearest
    // match would cause.
    greedyColorSpatial: function (fromPixels, toPixels, gridCols, gridRows, opts) {
      var colorWeight = opts.colorWeight;
      var spatialWeight = opts.spatialWeight;
      var n = gridCols * gridRows;
      var maxSpatial = Math.sqrt(gridCols * gridCols + gridRows * gridRows) || 1;
      var maxColor = Math.sqrt(3 * 255 * 255);

      var costs = new Float32Array(n * n);
      for (var i = 0; i < n; i++) {
        var sc = i % gridCols, sr = (i / gridCols) | 0;
        var fi = i * 4;
        var fr = fromPixels[fi], fg = fromPixels[fi + 1], fb = fromPixels[fi + 2];
        for (var j = 0; j < n; j++) {
          var dc = j % gridCols, dr = (j / gridCols) | 0;
          var ti = j * 4;
          var tr = toPixels[ti], tg = toPixels[ti + 1], tb = toPixels[ti + 2];
          var colorDist = Math.sqrt((fr - tr) * (fr - tr) + (fg - tg) * (fg - tg) + (fb - tb) * (fb - tb)) / maxColor;
          var spatialDist = Math.sqrt((sc - dc) * (sc - dc) + (sr - dr) * (sr - dr)) / maxSpatial;
          costs[i * n + j] = colorWeight * colorDist + spatialWeight * spatialDist;
        }
      }

      var order = new Uint32Array(n * n);
      for (var k = 0; k < order.length; k++) order[k] = k;
      order.sort(function (a, b) { return costs[a] - costs[b]; });

      var srcUsed = new Uint8Array(n);
      var dstUsed = new Uint8Array(n);
      var mapping = new Int32Array(n);
      var assigned = 0;
      for (var p = 0; p < order.length && assigned < n; p++) {
        var pairIdx = order[p];
        var si = (pairIdx / n) | 0;
        var dj = pairIdx % n;
        if (srcUsed[si] || dstUsed[dj]) continue;
        mapping[si] = dj;
        srcUsed[si] = 1;
        dstUsed[dj] = 1;
        assigned++;
      }
      return mapping;
    },

    // Same greedy assignment as greedyColorSpatial, plus a third cost term:
    // the difference in Sobel edge-magnitude between the two blocks. A block
    // sitting on a strong edge (a silhouette boundary, a hard graphic line)
    // prefers to land on another strong edge in the destination frame rather
    // than a flat area, even when their raw colors happen to match closely —
    // keeps edges "snapping" to edges instead of dissolving into flat fields.
    greedyEdgeColorSpatial: function (fromPixels, toPixels, gridCols, gridRows, opts) {
      var colorWeight = opts.colorWeight;
      var spatialWeight = opts.spatialWeight;
      var edgeWeight = opts.edgeWeight != null ? opts.edgeWeight : 1.0;
      // Exponent applied to the normalized per-pair edge-magnitude
      // difference before weighting — >1 makes the matcher indifferent to
      // small edge mismatches and only really penalize large ones (edges
      // "snap" less eagerly); <1 makes it sensitive to even small edge
      // differences.
      var edgeGamma = opts.edgeGamma != null ? opts.edgeGamma : 1.0;
      var n = gridCols * gridRows;
      var maxSpatial = Math.sqrt(gridCols * gridCols + gridRows * gridRows) || 1;
      var maxColor = Math.sqrt(3 * 255 * 255);

      var fromEdges = computeSobelMagnitudes(fromPixels, gridCols, gridRows);
      var toEdges = computeSobelMagnitudes(toPixels, gridCols, gridRows);
      var maxEdge = 1;
      for (var e = 0; e < n; e++) {
        if (fromEdges[e] > maxEdge) maxEdge = fromEdges[e];
        if (toEdges[e] > maxEdge) maxEdge = toEdges[e];
      }

      var costs = new Float32Array(n * n);
      for (var i = 0; i < n; i++) {
        var sc = i % gridCols, sr = (i / gridCols) | 0;
        var fi = i * 4;
        var fr = fromPixels[fi], fg = fromPixels[fi + 1], fb = fromPixels[fi + 2];
        for (var j = 0; j < n; j++) {
          var dc = j % gridCols, dr = (j / gridCols) | 0;
          var ti = j * 4;
          var tr = toPixels[ti], tg = toPixels[ti + 1], tb = toPixels[ti + 2];
          var colorDist = Math.sqrt((fr - tr) * (fr - tr) + (fg - tg) * (fg - tg) + (fb - tb) * (fb - tb)) / maxColor;
          var spatialDist = Math.sqrt((sc - dc) * (sc - dc) + (sr - dr) * (sr - dr)) / maxSpatial;
          var edgeDist = Math.pow(Math.abs(fromEdges[i] - toEdges[j]) / maxEdge, edgeGamma);
          costs[i * n + j] = colorWeight * colorDist + spatialWeight * spatialDist + edgeWeight * edgeDist;
        }
      }

      var order = new Uint32Array(n * n);
      for (var k = 0; k < order.length; k++) order[k] = k;
      order.sort(function (a, b) { return costs[a] - costs[b]; });

      var srcUsed = new Uint8Array(n);
      var dstUsed = new Uint8Array(n);
      var mapping = new Int32Array(n);
      var assigned = 0;
      for (var p = 0; p < order.length && assigned < n; p++) {
        var pairIdx = order[p];
        var si = (pairIdx / n) | 0;
        var dj = pairIdx % n;
        if (srcUsed[si] || dstUsed[dj]) continue;
        mapping[si] = dj;
        srcUsed[si] = 1;
        dstUsed[dj] = 1;
        assigned++;
      }
      return mapping;
    }
  };

  // ── Position easing: how a block's *position* interpolates between its
  // src and dst center, as a function of the movement phase's own [0,1]
  // sub-progress (see phaseTimings below for how that sub-progress relates
  // to overall transition time). Swappable like matchers.
  var positionEasings = {
    linear: function (t) { return t; },
    smoothstep: function (t) { return t * t * (3.0 - 2.0 * t); },
    easeInOutCubic: function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
  };

  // ── Color easing: how a block's own pixel *content* interpolates from its
  // source crop to its matched destination crop, as a function of the color
  // phase's own [0,1] sub-progress. Fully independent of position easing —
  // e.g. easeInExpo holds a block visually "as source" for most of its
  // travel then snaps to destination color right at the end (more velocity/
  // punch), where linear blends it evenly the whole time.
  var colorEasings = {
    linear: function (t) { return t; },
    smoothstep: function (t) { return t * t * (3.0 - 2.0 * t); },
    easeInExpo: function (t) { return t <= 0 ? 0 : Math.pow(2, 10 * t - 10); },
    easeOutExpo: function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  };

  // ── Phase timing: maps overall transition progress [0,1] into separate
  // [0,1] sub-progress windows for the movement phase and the color phase,
  // so the two can run concurrently or be sequenced relative to each other.
  // "before"/"after" name the color phase's position relative to movement:
  // color-then-move, or move-then-color.
  var phaseTimings = {
    during: { move: [0, 1], color: [0, 1] },
    before: { move: [0.35, 1], color: [0, 0.35] },
    after: { move: [0, 0.65], color: [0.65, 1] }
  };

  function windowProgress(p, window) {
    var a = window[0], b = window[1];
    if (b <= a) return p >= b ? 1 : 0;
    return Math.min(1, Math.max(0, (p - a) / (b - a)));
  }

  // ── Stagger: how much each block's own move/color phase is delayed
  // relative to its neighbors, as a function of the block's *source* grid
  // position. Returns a [0,1] delay consumed by the shader's `staggerLocal`
  // (see SWARM_VERTEX_SRC above) — 0 means "react immediately with
  // everyone else", 1 means "wait until the very end of the phase before
  // starting to move/color at all". The actual visual strength is the
  // uMoveStagger/uColorStagger "amount" uniforms (0 = feature off, every
  // block gets delay*amount = 0); this registry only shapes *which* blocks
  // get delayed relative to each other. Swappable like matchers, via the
  // `staggerFn` constructor option or by reassigning transition._staggerFn.
  var staggers = {
    none: function () { return 0; },
    wipeLeftRight: function (col, row, gridCols) {
      return gridCols <= 1 ? 0 : col / (gridCols - 1);
    },
    wipeTopBottom: function (col, row, gridCols, gridRows) {
      return gridRows <= 1 ? 0 : row / (gridRows - 1);
    },
    radialOut: function (col, row, gridCols, gridRows) {
      var cx = (gridCols - 1) / 2, cy = (gridRows - 1) / 2;
      var dist = Math.sqrt((col - cx) * (col - cx) + (row - cy) * (row - cy));
      var maxDist = Math.sqrt(cx * cx + cy * cy) || 1;
      return dist / maxDist;
    },
    radialIn: function (col, row, gridCols, gridRows) {
      return 1 - staggers.radialOut(col, row, gridCols, gridRows);
    },
    random: function () {
      return Math.random();
    }
  };

  var LOCAL_OFFSETS = [
    -0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    0.5, -0.5, 0.5, 0.5, -0.5, 0.5
  ];

  function blockCenterUV(col, row, gridCols, gridRows) {
    return [(col + 0.5) / gridCols, 1.0 - (row + 0.5) / gridRows];
  }

  // Builds the interleaved [localOffset(2), srcCenter(2), dstCenter(2),
  // stagger(1)] x 6 verts-per-block buffer that drives the swarm pass.
  // `staggerFn(col, row, gridCols, gridRows)` is evaluated once per block
  // against its *source* position — see `staggers` below.
  function buildSwarmBuffer(mapping, gridCols, gridRows, staggerFn) {
    var n = gridCols * gridRows;
    var floatsPerVertex = 7;
    var buf = new Float32Array(n * 6 * floatsPerVertex);
    var w = 0;
    for (var i = 0; i < n; i++) {
      var sc = i % gridCols, sr = (i / gridCols) | 0;
      var srcCenter = blockCenterUV(sc, sr, gridCols, gridRows);
      var j = mapping[i];
      var dc = j % gridCols, dr = (j / gridCols) | 0;
      var dstCenter = blockCenterUV(dc, dr, gridCols, gridRows);
      var stagger = staggerFn(sc, sr, gridCols, gridRows);
      for (var v = 0; v < 6; v++) {
        buf[w++] = LOCAL_OFFSETS[v * 2];
        buf[w++] = LOCAL_OFFSETS[v * 2 + 1];
        buf[w++] = srcCenter[0];
        buf[w++] = srcCenter[1];
        buf[w++] = dstCenter[0];
        buf[w++] = dstCenter[1];
        buf[w++] = stagger;
      }
    }
    return buf;
  }

  function WebGLTransition(canvas, opts) {
    opts = opts || {};
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false }) ||
      canvas.getContext('experimental-webgl', { antialias: false, alpha: false });
    if (!gl) throw new Error('WebGLTransition: WebGL unavailable');

    this._canvas = canvas;
    this._gl = gl;
    this._bgProgram = createProgram(gl, BG_VERTEX_SRC, BG_FRAGMENT_SRC);
    this._swarmProgram = createProgram(gl, SWARM_VERTEX_SRC, SWARM_FRAGMENT_SRC);

    this._blocksShort = opts.blockGrid != null ? opts.blockGrid : 12;
    this._colorWeight = opts.colorWeight != null ? opts.colorWeight : 1.0;
    this._spatialWeight = opts.spatialWeight != null ? opts.spatialWeight : 0.5;
    this._edgeWeight = opts.edgeWeight != null ? opts.edgeWeight : 1.0;
    this._edgeGamma = opts.edgeGamma != null ? opts.edgeGamma : 1.0;
    this._duration = opts.duration != null ? opts.duration : 800;
    this._matchFn = opts.matchFn || matchers.greedyColorSpatial;
    this._positionEasingFn = opts.positionEasing || positionEasings.smoothstep;
    this._colorEasingFn = opts.colorEasing || colorEasings.linear;
    this._phaseTiming = opts.phaseTiming || phaseTimings.during;
    this._staggerFn = opts.staggerFn || staggers.none;
    this._moveStagger = opts.moveStagger != null ? opts.moveStagger : 0;
    this._colorStagger = opts.colorStagger != null ? opts.colorStagger : 0;
    this._contextLost = false;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Full-screen triangle, shared by the background pass.
    this._bgBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._bgBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    this._swarmBuf = gl.createBuffer();

    this._bgUniforms = {
      uTex: gl.getUniformLocation(this._bgProgram, 'uTex'),
      uRect: gl.getUniformLocation(this._bgProgram, 'uRect')
    };
    this._swarmUniforms = {
      uCellSize: gl.getUniformLocation(this._swarmProgram, 'uCellSize'),
      uFromRect: gl.getUniformLocation(this._swarmProgram, 'uFromRect'),
      uToRect: gl.getUniformLocation(this._swarmProgram, 'uToRect'),
      uMoveT: gl.getUniformLocation(this._swarmProgram, 'uMoveT'),
      uColorT: gl.getUniformLocation(this._swarmProgram, 'uColorT'),
      uMoveStagger: gl.getUniformLocation(this._swarmProgram, 'uMoveStagger'),
      uColorStagger: gl.getUniformLocation(this._swarmProgram, 'uColorStagger'),
      uFrom: gl.getUniformLocation(this._swarmProgram, 'uFrom'),
      uTo: gl.getUniformLocation(this._swarmProgram, 'uTo')
    };

    this._texFrom = createTexture(gl); // "current" settled frame
    this._texTo = createTexture(gl);   // transition target, while animating
    this._rectFrom = [0, 0, 1, 1];
    this._rectTo = [0, 0, 1, 1];

    this._scratchCanvas = document.createElement('canvas');
    this._scratchCtx = this._scratchCanvas.getContext('2d');

    this._rafId = null;
    this._pending = null;
    this._hasImage = false;
    this._swarmCount = 0;
    this._cellSize = [1, 1];

    var self = this;
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      self._contextLost = true;
      if (self._rafId) { cancelAnimationFrame(self._rafId); self._rafId = null; }
      if (self._pending) { self._pending.resolve(); self._pending = null; }
    });

    this._resize();
  }

  WebGLTransition.isSupported = function () {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  };

  WebGLTransition.prototype._resize = function () {
    var canvas = this._canvas;
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    this._gl.viewport(0, 0, w, h);
  };

  WebGLTransition.prototype._uploadTexture = function (tex, source) {
    var gl = this._gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  };

  WebGLTransition.prototype._drawBackground = function (tex, rect) {
    var gl = this._gl;
    var u = this._bgUniforms;
    gl.useProgram(this._bgProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._bgBuf);
    var aPos = gl.getAttribLocation(this._bgProgram, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(u.uTex, 0);
    gl.uniform4fv(u.uRect, rect);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  WebGLTransition.prototype._drawSwarm = function (moveT, colorT) {
    if (!this._swarmCount) return;
    var gl = this._gl;
    var u = this._swarmUniforms;
    gl.useProgram(this._swarmProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._swarmBuf);

    var stride = 7 * 4;
    var aLocalOffset = gl.getAttribLocation(this._swarmProgram, 'aLocalOffset');
    var aSrcCenter = gl.getAttribLocation(this._swarmProgram, 'aSrcCenter');
    var aDstCenter = gl.getAttribLocation(this._swarmProgram, 'aDstCenter');
    var aStagger = gl.getAttribLocation(this._swarmProgram, 'aStagger');
    gl.enableVertexAttribArray(aLocalOffset);
    gl.vertexAttribPointer(aLocalOffset, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aSrcCenter);
    gl.vertexAttribPointer(aSrcCenter, 2, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(aDstCenter);
    gl.vertexAttribPointer(aDstCenter, 2, gl.FLOAT, false, stride, 16);
    gl.enableVertexAttribArray(aStagger);
    gl.vertexAttribPointer(aStagger, 1, gl.FLOAT, false, stride, 24);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._texFrom);
    gl.uniform1i(u.uFrom, 0);
    gl.uniform4fv(u.uFromRect, this._rectFrom);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this._texTo);
    gl.uniform1i(u.uTo, 1);
    gl.uniform4fv(u.uToRect, this._rectTo);

    gl.uniform2fv(u.uCellSize, this._cellSize);
    gl.uniform1f(u.uMoveT, moveT);
    gl.uniform1f(u.uColorT, colorT);
    gl.uniform1f(u.uMoveStagger, this._moveStagger);
    gl.uniform1f(u.uColorStagger, this._colorStagger);

    gl.drawArrays(gl.TRIANGLES, 0, this._swarmCount * 6);
  };

  WebGLTransition.prototype._drawStatic = function () {
    if (this._contextLost) return;
    this._resize();
    this._drawBackground(this._texFrom, this._rectFrom);
  };

  // `progress` is raw linear time-progress [0,1] through the whole
  // transition. It's split here into the movement phase's and color phase's
  // own sub-progress (per this._phaseTiming's windows) and run through each
  // phase's own easing function — the two are otherwise fully independent.
  WebGLTransition.prototype._drawFrame = function (progress) {
    if (this._contextLost) return;
    this._resize();
    var windows = this._phaseTiming;
    var moveT = this._positionEasingFn(windowProgress(progress, windows.move));
    var colorT = this._colorEasingFn(windowProgress(progress, windows.color));
    this._drawBackground(this._texTo, this._rectTo);
    this._drawSwarm(moveT, colorT);
  };

  // Paints an image with no animation — the first frame, before any transition exists.
  WebGLTransition.prototype.setImage = function (src) {
    var self = this;
    return loadImage(src).then(function (img) {
      if (self._contextLost) return;
      self._resize();
      var size = naturalSize(img);
      var rect = coverRect(size[0], size[1], self._canvas.clientWidth, self._canvas.clientHeight);
      self._uploadTexture(self._texFrom, img);
      self._rectFrom = rect;
      self._currentImgEl = img;
      self._hasImage = true;
      self._swarmCount = 0;
      self._drawStatic();
    });
  };

  // Animates from whatever is currently shown to `src` over `duration`ms
  // (falls back to the constructor's default when omitted). If a transition
  // is already in flight, it's snapped to completion first (the destination
  // it was heading to becomes the new starting point) rather than trying to
  // preserve exact mid-flight block positions, which the swarm's per-block
  // correspondence makes impractical to interrupt smoothly.
  WebGLTransition.prototype.transitionTo = function (src, duration) {
    var self = this;
    duration = duration != null ? duration : this._duration;

    return loadImage(src).then(function (toImg) {
      if (self._contextLost) return;
      if (self._rafId) { cancelAnimationFrame(self._rafId); self._rafId = null; }
      if (self._pending) { self._pending.resolve(); self._pending = null; }
      if (self._swarmCount) {
        // A prior transition was mid-flight: settle it (texTo was already
        // uploaded as that transition's target) before starting the next leg.
        // Swap pointers rather than allocating a fresh texture, so the pair
        // of GL texture objects is reused indefinitely instead of leaking one
        // per interrupted transition.
        var tmpTex = self._texFrom; self._texFrom = self._texTo; self._texTo = tmpTex;
        self._rectFrom = self._rectTo;
        self._swarmCount = 0;
      }

      if (!self._hasImage) return self.setImage(toImg);

      self._resize();
      var canvas = self._canvas;
      var grid = pickGrid(self._blocksShort, canvas.clientWidth, canvas.clientHeight);
      var gridCols = grid[0], gridRows = grid[1];

      var toSize = naturalSize(toImg);
      var toRect = coverRect(toSize[0], toSize[1], canvas.clientWidth, canvas.clientHeight);

      var fromColors = sampleGridColors(self._scratchCtx, self._currentImgEl, self._rectFrom, gridCols, gridRows);
      var toColors = sampleGridColors(self._scratchCtx, toImg, toRect, gridCols, gridRows);

      var mapping = self._matchFn(fromColors, toColors, gridCols, gridRows, {
        colorWeight: self._colorWeight,
        spatialWeight: self._spatialWeight,
        edgeWeight: self._edgeWeight,
        edgeGamma: self._edgeGamma
      });
      var buf = buildSwarmBuffer(mapping, gridCols, gridRows, self._staggerFn);

      var gl = self._gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, self._swarmBuf);
      gl.bufferData(gl.ARRAY_BUFFER, buf, gl.DYNAMIC_DRAW);
      self._swarmCount = gridCols * gridRows;
      self._cellSize = [1 / gridCols, 1 / gridRows];

      self._uploadTexture(self._texTo, toImg);
      self._rectTo = toRect;
      self._currentImgEl = toImg;

      return new Promise(function (resolve) {
        self._pending = { resolve: resolve };
        var start = null;
        function frame(ts) {
          if (start === null) start = ts;
          var t = duration <= 0 ? 1 : Math.min(1, (ts - start) / duration);
          self._drawFrame(t);
          if (t < 1) {
            self._rafId = requestAnimationFrame(frame);
          } else {
            self._rafId = null;
            var doneTex = self._texFrom; self._texFrom = self._texTo; self._texTo = doneTex;
            self._rectFrom = self._rectTo;
            self._swarmCount = 0;
            self._pending = null;
            resolve();
          }
        }
        self._rafId = requestAnimationFrame(frame);
      });
    });
  };

  WebGLTransition.prototype.destroy = function () {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._pending) { this._pending.resolve(); this._pending = null; }
    var gl = this._gl;
    gl.deleteTexture(this._texFrom);
    gl.deleteTexture(this._texTo);
    gl.deleteProgram(this._bgProgram);
    gl.deleteProgram(this._swarmProgram);
    gl.deleteBuffer(this._bgBuf);
    gl.deleteBuffer(this._swarmBuf);
  };

  // Registry of "find destination pixel" strategies (see comment above
  // `matchers`) — register a new one via WebGLTransition.matchers.myIdea =
  // function (...) {...}, then pass { matchFn: WebGLTransition.matchers.myIdea }
  // to the constructor, or reassign transition._matchFn directly to swap
  // it live between transitions.
  WebGLTransition.matchers = matchers;

  // Registries for the two independent morph stages — same pattern as
  // matchers: register new entries directly on these objects, pass via
  // constructor opts (positionEasing/colorEasing/phaseTiming), or reassign
  // transition._positionEasingFn / _colorEasingFn / _phaseTiming live.
  WebGLTransition.positionEasings = positionEasings;
  WebGLTransition.colorEasings = colorEasings;
  WebGLTransition.phaseTimings = phaseTimings;
  WebGLTransition.staggers = staggers;

  global.WebGLTransition = WebGLTransition;
})(window);
