# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Enari Engine is a browser-based CS-style FPS game built with Three.js and Ammo.js physics. The project was recently converted from TypeScript to vanilla JavaScript, removing build dependencies for easier development.

## Development Commands
This project runs directly in the browser without a build system:
- **Development**: Open `index.html` in a modern browser with ES6 module support
- **Local Server**: Use any static file server (e.g., `python -m http.server` or VS Code Live Server)
- **No build/lint/test commands**: Project runs directly without compilation

## Architecture Overview

### Core Structure
- **Game Loop**: `src/Game.js` - Main singleton game class managing the entire game state
- **Entry Point**: `src/main.js` - Initializes Ammo.js physics and starts the game
- **Physics**: `src/Physics/` - Ammo.js bullet physics integration with custom wrapper classes
- **Rendering**: `src/View/Renderer/` - Three.js rendering pipeline with post-processing effects
- **Input**: `src/Input/` - Input management and key binding system
- **Core Objects**: `src/Core/` - Base classes for game entities (Actor, Pawn, Player, GameObject)

### Key Systems

#### Physics System (`src/Physics/`)
- `Physics.js` - Main physics world wrapper around Ammo.js
- `Collider/` - Various collider types (Cube, Sphere, Trimesh, Ground)
- Uses Bullet Physics via Ammo.js with gravity set to -50 (5x normal)

#### Rendering Pipeline (`src/View/Renderer/`)
- `Renderer.js` - Main WebGL renderer extending THREE.WebGLRenderer
- `SceneLighting.js` - Lighting system management
- `SkyLight.js` - Sky and environmental lighting
- Post-processing effects: Bokeh, SAO, Unreal Bloom, Lens Distortion
- Separate viewmodel rendering for first-person weapons

#### Player System
- `PlayerWrapper.js` - Wrapper managing player state and renderers
- `PlayerController.js` - Input handling and movement logic
- `FPSRenderer.js` / `ThirdPersonRenderer.js` - Player-specific rendering modes
- `CameraManager/` - First-person and third-person camera management

#### Asset Loading
- `GlobalLoadingManager.js` - Centralized asset loading using Three.js loaders
- Supports GLTF/GLB models with Draco compression
- Animation system for weapon models with JSON keyframe data
- Map loading from GLB files (default: "de_dust2_new")

### Entity-Component Architecture
- `Actor` - Base physics-enabled entity
- `Pawn` - Actor with additional game logic
- `Player` - Pawn with controller input and rendering
- `GameObject` - Basic scene object without physics

### External Dependencies
- **Three.js r170** - 3D graphics library (loaded from CDN)
- **Ammo.js** - Bullet physics engine (local copy in `libs/ammo/`)
- **three-nebula** - Particle system (local copy in `libs/three-nebula/`)
- **Tweakpane** - Debug UI controls (local copy in `libs/tweakpane/`)

### File Organization
- `src/Controller/` - Input controllers for different entity types
- `src/View/Audio/` - Audio management system
- `src/View/Mesh/` - 3D model loading and management
- `src/View/Particle/` - Particle effects system
- `src/Interface/` - TypeScript-style interfaces for JavaScript (type hints only)
- `assets/` - Game assets (models, textures, audio, maps)

### Controls and Gameplay
- WASD movement with bunny hop mechanics
- Multiple weapon types (1-3 keys) with animations
- First/third person view switching (4-5 keys)
- E key for respawning/cloning players
- Mouse controls for aiming and shooting

## Important Notes
- No package.json or build system - runs directly in browser
- Uses ES6 modules with import maps in index.html
- Physics objects must be added to both the physics world and renderer scene
- All vector math uses custom Vector3D class, not Three.js Vector3
- Map loading expects GLB files with physics trimesh collision