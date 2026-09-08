import { compareInputToAnswer } from './utils.mjs';

const typedInputs = [...document.querySelectorAll('input#typeans')];

if (typedInputs.length) {
    // Front template: capture the user's raw input before Anki processes it.
    sessionStorage.setItem('stf_typedInputs', JSON.stringify(typedInputs.map((input) => input.value)));

    // 'change' fires when a field loses focus / the user submits, which is right before Anki flips to the back.
    typedInputs.forEach((typedInput, index) => {
        typedInput.addEventListener('change', (e) => {
            let capturedInputs = [];
            try {
                const storedInputs = JSON.parse(sessionStorage.getItem('stf_typedInputs') || '[]');
                if (Array.isArray(storedInputs)) capturedInputs = storedInputs;
            } catch {
                // Reinitialize the capture if sessionStorage contains malformed data.
            }
            capturedInputs[index] = e.target.value;
            sessionStorage.setItem('stf_typedInputs', JSON.stringify(capturedInputs));
        });
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
