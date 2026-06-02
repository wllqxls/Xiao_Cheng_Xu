# Placeholder Map Visual Design

## Goal

Reduce the button-like feeling of the current Cocos map regions while keeping the runtime-generated placeholder approach.

## Scope

This pass only changes Cocos `Graphics` drawing in `GameBootstrap.ts`. It does not add texture assets, AI-generated images, final map art, new gameplay logic, or region config changes.

## Current Problem

The map regions are readable but look like rectangular UI buttons placed on top of a map. That makes the preview feel like a control panel instead of a strategy map.

## Direction

Keep the region cards clickable, but draw them more like temporary board-game territory markers:

- Softer irregular territory outline.
- Lower-opacity state fill.
- Inner coast or land contour lines.
- Selected region highlight as a ring, not a button border.
- Corruption remains visible as red stains and dots.
- Existing landmark marks stay in place.

## Non-Goals

- No final illustrated world map.
- No `assets/textures` changes.
- No AI image generation in this step.
- No gameplay, config, save, or event rule changes.

## Test Rule

Add a static verification script that checks the source contains the placeholder map visual helpers. This does not replace screenshot review, but it prevents later edits from accidentally reverting the region marker back to simple rounded rectangles.

## Visual Acceptance

The Cocos preview should still be clearly readable, but the region markers should feel less like flat buttons and more like temporary map tokens.
