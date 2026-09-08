import { compareInputToAnswer } from './utils.mjs';

const typedInput = document.querySelector('input#typeans');

if (typedInput) {
    // Front template: capture the user's raw input before Anki processes it.

    // 'change' fires when the field loses focus / the user submits, which is right before Anki flips to the back.
    typedInput.addEventListener('change', (e) => {
        sessionStorage.setItem('stf_typedInput', e.target.value);
    });
} else {
    // Back template: run the comparison.

    // The timestamped media JSON is the source of truth on both Desktop and
    // mobile. Desktop must not inject a separate in-memory configuration that
    // can hide a stale or missing synced file.
    const script = document.currentScript;
    const config_timestamp = script?.getAttribute('data-config');

    if (!config_timestamp) {
        console.error('SmarterTypeField: configuration timestamp is missing.');
    } else {
        fetch(`_smarterTypeField.config${config_timestamp}.json`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then((addon_config) => {
                if (addon_config.enabled) compareInputToAnswer(addon_config);
            })
            .catch((error) => {
                // Do not silently use defaults: that would make a missing or
                // stale synced JSON file look like a valid configuration.
                console.error('SmarterTypeField: unable to load configuration:', error);
            });
    }
}
