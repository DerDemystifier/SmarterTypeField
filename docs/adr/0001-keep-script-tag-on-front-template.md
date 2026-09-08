# ADR 0001: Keep the script tag on both card templates

- **Status:** Accepted
- **Date:** 2026-09-09

## Context

SmarterTypeField performs the flexible comparison when the card back is shown, so it may appear that the script tag is only needed in the Back template.

The bundled script has two runtime modes, selected by the rendered DOM:

- On the **Front template**, it finds the `{{type:}}` inputs and stores their raw values in `sessionStorage` under `stf_typedInputs`. It also updates those values when the inputs change.
- On the **Back template**, it loads the configuration and compares Anki's generated type-answer markup against the captured raw values.

Anki replaces the front-side input with comparison spans when the answer is shown. Reconstructing the typed value from those spans is possible, but it is only a fallback. The generated markup can contain missing-character spans, character-level splits, non-breaking spaces, and combining marks that do not necessarily preserve the original input exactly. The raw value is also needed for features such as reliable extra-word detection.

The add-on currently installs and updates the same script tag in both `qfmt` and `afmt` in `addon_files/helpers.py`.

## Decision

Keep the SmarterTypeField script tag in both the Front and Back templates for note types that use a `{{type:}}` field.

The Front tag is responsible for capturing the original typed input; the Back tag is responsible for loading configuration and rendering the comparison. The Back-side reconstruction path remains as a defensive fallback when captured session data is unavailable.

Do not remove the Front tag merely because comparison rendering occurs on the Back. Any change to this decision must first replace the raw-input capture mechanism and add regression coverage using representative Anki-generated comparison markup.

## Consequences

### Benefits

- Preserves the exact user input before Anki transforms it into comparison markup.
- Makes multiple type fields deterministic by preserving values in DOM order.
- Avoids relying on fragile reconstruction for Unicode combining marks, NBSPs, missing characters, and extra-word matching.
- Keeps the existing Desktop, AnkiDroid, and AnkiMobile template behavior consistent.

### Costs

- The bundle is loaded once on the Front and once on the Back.
- The Front template performs a small amount of session-storage and event-listener setup even though visual comparison happens later.
- Template inspection must continue managing both `qfmt` and `afmt` script tags.

## Alternatives considered

### Back-template tag only

Rejected. It works for many ordinary answers because the Back code can reconstruct input from Anki's spans, but it loses the reliable raw-input path and makes edge-case behavior dependent on Anki's markup.

### Capture the input through another mechanism

Not adopted. A replacement would need to work across Anki Desktop and mobile clients, preserve multiple fields and card transitions, and be validated against the same Unicode and comparison edge cases. The existing Front-side `sessionStorage` capture satisfies these requirements with minimal complexity.

## References

- `src/smarterTypeField.js` — Front capture and Back comparison entry point
- `src/utils.mjs` — raw-input preference and reconstruction fallback
- `addon_files/helpers.py` — insertion and update of tags in `qfmt` and `afmt`
