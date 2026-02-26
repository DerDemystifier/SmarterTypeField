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

    if (window.addon_config) {
        if (window.addon_config.enabled) compareInputToAnswer(addon_config);
    } else {
        // Mobile fallback: On mobile (AnkiDroid/AnkiMobile), the Python addon doesn't run,
        // so window.addon_config isn't injected. Instead, we fetch a pre-generated config file.
        // The data-config attribute contains a timestamp for cache-busting the config file.
        const script = document.currentScript;
        const config_timestamp = script.getAttribute('data-config');

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
                // Fallback: If config file isn't available, use hardcoded defaults
                addon_config = { ignore_case: true, ignore_accents: false, ignore_punctuations: false };
                compareInputToAnswer(addon_config);
                console.error('There has been a problem with your fetch operation:', error);
            });
    }
}
