# Bottom Action Panel Design

## Goal

Make the Cocos preview easier to read by reorganizing the bottom action panel. This phase improves information hierarchy only. It does not introduce final art, new gameplay rules, or asset replacement.

## Current Problem

The bottom panel shows many blue buttons with similar visual weight. A new player cannot quickly tell which actions belong to the selected region, which actions are global, and which controls are secondary.

The map and buttons are still placeholder visuals. That is acceptable for this phase because the game logic, layout, and interaction hierarchy are not stable enough for final art production.

## Recommended Direction

Group the bottom panel into three clear zones:

- Selected region actions: restore, isolate, traffic control, and upgrade actions for the chosen region.
- Global actions: inspect, event, end turn, and other actions that affect the whole game state.
- Utility controls: settings and restart, visually quieter than gameplay actions.

The selected region area should be the strongest visual group because it is the player's most frequent workflow: tap a region, read its status, choose one action.

## Visual Rules

- Keep the runtime-generated Cocos UI for now.
- Use layout, spacing, section labels, and button scale before adding decorative art.
- Make primary action buttons larger or brighter than secondary buttons.
- Reduce same-looking button rows.
- Keep the portrait preview readable on the current iPhone preset.

## Art Timing

Final art should come after this UI pass and a basic playtest pass. The current map shapes and buttons are placeholders. Replacing them too early would waste work because region layout, button grouping, panel size, and feedback states are still being tuned.

The next art milestone should be:

- Region shape style and map background.
- Button and panel skin.
- State overlays for corruption, control, and restoration.
- Small transport icons for ports, rail, and airports.

## Testing

After implementation, run:

- `node scripts/verify-responsive-layout.mjs`
- `node scripts/verify-map-layout.mjs`
- Cocos TypeScript project check
- Cocos preview visual check at `http://127.0.0.1:7456/`

Success means the bottom panel reads as grouped controls instead of a flat pile of same-weight buttons.
