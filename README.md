# 3D Modeller

A browser-based 3D modeling tool built with React, TypeScript, Three.js, and React Three Fiber. Inspired by the "3D Modeller" chapter from [*500 Lines or Less*](https://aosabook.org/en/500L/a-3d-modeller.html), rebuilt as a modern web application with a desktop-style interface.

**Live demo:** _add your deployment URL here_

**Screenshot:** add a capture of the sample scene at `docs/screenshot.png` and reference it here (this path is also noted in `index.html` for the social preview image).

Everything runs in the browser. There is no backend, no API key, and no account — projects persist through localStorage and JSON import/export.

## Features

- Add cube, sphere, cylinder, cone, and plane primitives
- Click-to-select in the viewport (raycast), with shift-click multi-select
- Move, rotate, and scale with a transform gizmo (W / E / R)
- Properties panel with live position, rotation, scale, color, visibility, and wireframe editing
- Scene hierarchy panel with rename, visibility toggles, and expand/collapse for groups
- Grouping and ungrouping that preserve world-space placement, including under rotated and scaled parents
- Duplicate (single objects or whole groups, with fresh IDs)
- Snapshot-based undo/redo, capped at 80 entries, with one entry per gizmo drag
- Save/load via localStorage, plus validated JSON export and import
- Camera presets (front, side, top, isometric), focus-selected, and reset, with smooth transitions
- Starter sample scene featuring a hierarchical three-sphere figure
- Dismissible onboarding panel, About dialog, and a Reset Demo action for portfolio visitors
- Keyboard-driven workflow (see Controls below)
- Error boundary, WebGL-unavailable fallback, and canvas loading state

## Technology

React 18 · TypeScript (strict) · Vite · Three.js · React Three Fiber · @react-three/drei · Zustand · Lucide icons. Plain CSS with design tokens — no UI framework.

## Getting started

Requires Node 18+.

```bash
npm install
npm run dev        # development server
npm run typecheck  # strict TypeScript check
npm run build      # production build (tsc + vite) -> dist/
npm run preview    # serve the production build locally
```

A functional test suite for the non-rendering logic (store actions, history, grouping math, validation) lives in `scripts/logic-tests.ts`:

```bash
npx tsx scripts/logic-tests.ts
```

## Controls

| Input | Action |
| --- | --- |
| Left click | Select object (shift-click to add/remove from selection) |
| Click empty space / Esc | Deselect |
| Right drag | Orbit camera |
| Middle drag | Pan camera |
| Scroll | Zoom |
| Q / W / E / R | Select / Move / Rotate / Scale tool |
| Delete or Backspace | Delete selection |
| Ctrl/Cmd + D | Duplicate |
| Ctrl/Cmd + G | Group selection |
| Ctrl/Cmd + Z / Shift + Z | Undo / Redo |
| Ctrl/Cmd + S | Save to browser |
| F | Focus camera on selection |
| 1 / 2 / 3 / 0 | Front / Side / Top / Isometric view |

Shortcuts are suppressed while typing in any input field.

## Architecture

**State.** A single Zustand store (`src/store/useSceneStore.ts`) holds only serializable data: a flat map of scene nodes, root-node ordering, selection, active tool, save status, undo/redo snapshots, and camera pose. Three.js objects never enter the store; a small module-level registry (`src/utilities/objectRegistry.ts`) maps node IDs to live `Object3D` instances for the transform gizmo and camera focus.

**Scene graph.** Every node is plain data — objects carry `type`, transform, color, visibility, and wireframe; groups carry `childrenIds`. Groups render as nested `<group>` elements, so parent-child transforms come from Three.js's own matrix stack. Rotation is stored in radians and displayed in degrees. Grouping repositions the new parent at the members' centroid; ungrouping recomposes each child's world matrix (`src/utilities/transforms.ts`) so nothing visibly moves.

**Selection.** Clicking a mesh in the viewport selects its top-level ancestor (so clicking one snow-figure sphere selects the whole figure), while the hierarchy panel addresses individual nodes. Selection is shown with an emissive tint plus an edge outline in the accent color.

**Transforms.** Drei's `TransformControls` attach to the registered `Object3D` for the single selected node; the active tool sets the gizmo mode. During a drag, orbit controls are disabled, values stream to the store through a `requestAnimationFrame` throttle, and one history snapshot is committed when the drag ends. Scale is clamped away from zero and all values are guarded against NaN/Infinity.

**History.** Undo/redo is snapshot-based: each meaningful action pushes `{nodes, rootIds, selectedIds}` onto a capped stack. Text and color edits commit once per editing session (on blur), not per keystroke.

**Persistence.** `src/utilities/validation.ts` validates any loaded or imported project: version, ID uniqueness, node shapes, vector lengths and finiteness, colors, parent/child consistency, cycles, and file size (4 MB cap). Safe problems (a stale `parentId`, near-zero scale) are repaired; structural problems are rejected with a specific message. The same schema backs localStorage saves and exported JSON files.

### Project structure

```
src/
  components/
    layout/    top bar, toolbar, hierarchy, properties, status bar,
               onboarding, about dialog
    scene/     canvas, node renderer, lighting, grid, camera,
               transform controls
    common/    icon button, number input, dialogs, error boundary,
               toast, loading, WebGL fallback
  store/       Zustand scene store (state + all actions)
  hooks/       keyboard shortcuts
  types/       scene and project file types
  utilities/   object factory, transforms, validation, serialization,
               object registry, sample scene, download helper
  styles/      global.css (design tokens + all UI styles)
scripts/       logic-tests.ts (functional tests, run with tsx)
```

## Save and export behavior

- **Save** (Ctrl/Cmd+S) writes the project — name, all nodes, root order, camera — to localStorage under a versioned key.
- **Load** restores the most recent save after validation, confirming first if you have unsaved changes.
- **Export JSON** downloads the same format as a formatted file named after the project.
- **Import JSON** validates before replacing anything; malformed files produce a specific error message and leave the current scene untouched.
- **Reset Demo** restores the original sample scene and camera at any time.

## Deployment

The build is fully static (`dist/`) with relative asset paths, so it works on any static host with zero configuration.

**Vercel:** import the repository at vercel.com → framework preset "Vite" → build command `npm run build`, output directory `dist` → Deploy. No `vercel.json` is needed; the app is a single route.

**Netlify:** "Add new site" → import the repository → build command `npm run build`, publish directory `dist` → Deploy. No `netlify.toml` or redirect rules are needed since there is no client-side routing.

GitHub Pages also works (the relative `base` in `vite.config.ts` handles subpath hosting): publish the `dist` folder to a `gh-pages` branch.

## Known limitations

- Desktop-focused: screens narrower than ~900px see an unsupported-device message rather than a touch UI.
- The transform gizmo operates on one node at a time; multi-selection is used for grouping, not simultaneous dragging.
- Hierarchy reparenting is done through group/ungroup, not drag-and-drop.
- Only one localStorage save slot; use JSON export for multiple projects.
- Nested groups can be created by grouping a group with a sibling, but there is no dedicated "add to existing group" action.

## Future improvements

- Drag-and-drop reparenting in the hierarchy panel
- Snapping (grid and angle increments) for transforms
- Multiple named save slots and autosave
- Material options beyond flat color (roughness, metalness)
- glTF export for interoperability with other 3D tools
- Box-select and gizmo transforms across a multi-selection
