'use strict';

import { diffChars } from 'diff';
import { isPunctuation, hasPunctuation, last_item_includes, constructLetters, extractWordsAndSymbols } from './helpers.mjs';

/**
 * Makes comparison case insensitive. For example :
 * MaRRakesh
 * ↓
 * Marrakesh
 * Will be marked all green. So how do we go about doing this ?
 * There are 3 different classes availabe post-comparison :
 * <span class="typeGood"></span>   - green, means the this part matches the correct answer letter for letter.
 * <span class="typeBad"></span>    - red, means you've typed it wrong, typed 'a' when it should be 'c'.
 * <span class="typeMissed"></span> - gray, means you forgot a letter.
 *
 * In previous versions, I used to use my own algo for comparison, but as it started to get more complex, I decided to use a library for it. Now I use the diffChars() function from the jsdiff library, which uses state of the art algorithms to compare strings. It returns an array of objects, each object has a value and a boolean property called added or removed. If added is true, then the value is an addition, if removed is true, then the value is a deletion. If both are false, then it's a common part.
 */
function compareInputToAnswer(addon_config) {
    // if there's no arrow, that means there's no comparison, which means the user hasn't typed anything or got the correct answer.
    if (!document.querySelector('span#typearrow')) return;

    // Get all span parts of both entry and answer to be destructed
    const typeAreaSelector = 'code#typeans';
    const typesSpansSelector = `${typeAreaSelector} > span[class^="type"]`;
    // Selects only answer spans
    const answerSpansSelector = `${typeAreaSelector} br ~ span[class^="type"]`;

    // Update the spans array after destruction
    const typesSpans = [...document.querySelectorAll(typesSpansSelector)];
    const answerSpans = [...document.querySelectorAll(answerSpansSelector)];
    // entrySpans contains spans of the entry, which are (All_Spans - Answer_Spans). It also excludes typeMissed spans from Anki comparison to keep raw user input.
    const entrySpans = typesSpans.filter((x) => !answerSpans.includes(x) && !x.classList.contains('typeMissed'));

    const comparison_area = document.querySelector(typeAreaSelector);

    const full_entry = constructLetters(entrySpans);
    const full_answer = constructLetters(answerSpans);

    const diffCharsOpts = addon_config.ignore_case ? { ignoreCase: true } : {};

    // If ignore_extra_words is enabled, check if the entry contains the answer as a
    // substring before running the full diff. This accepts answers where the user types
    // the full sentence instead of just the expected phrase (e.g., typing a complete
    // cloze sentence when only the hidden phrase is expected).
    if (addon_config.ignore_extra_words) {
        let entry_to_check = full_entry;
        let answer_to_check = full_answer;

        if (addon_config.ignore_accents) {
            entry_to_check = entry_to_check.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            answer_to_check = answer_to_check.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }

        if (addon_config.ignore_case) {
            entry_to_check = entry_to_check.toLowerCase();
            answer_to_check = answer_to_check.toLowerCase();
        }

        if (answer_to_check.length > 0 && entry_to_check !== answer_to_check && entry_to_check.includes(answer_to_check)) {
            answerSpans.forEach((span) => span.setAttribute('class', 'typeGood'));
            comparison_area.innerHTML = answerSpans.map((elem) => elem.outerHTML).join('');
            return;
        }
    }

    let diff = () => diffChars(full_entry, full_answer, diffCharsOpts);

    if (addon_config.ignore_accents) {
        // Remove accents from both entry and answer.
        var normalized_entry = full_entry.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        var normalized_answer = full_answer.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        diff = () => diffChars(normalized_entry, normalized_answer, diffCharsOpts);
    }

    diff = diff(); // execute the diff function to get the diff array

    if (addon_config.ignore_punctuations) {
        // If punctuations are ignored, we want to split the parts that contain punctuations so they can be processed separately.
        const newDiffParts = [];

        for (const part of diff) {
            if (!part.value) continue;

            if (!hasPunctuation(part.value)) {
                newDiffParts.push(part);
                continue;
            }

            if (part.value.split('').every((char) => isPunctuation(char))) {
                // If part contains only punctuation, push it as is
                newDiffParts.push(part);
                continue;
            }

            // Split part if it contains punctuation into separate parts of words and punctuations.
            const splitStrs = extractWordsAndSymbols(part.value);
            if (splitStrs.length > 1) {
                splitStrs.forEach((str) => {
                    // parts should have the same properties as the original part. Just change the value.
                    let newPart = { ...part };
                    newPart.value = str;
                    newDiffParts.push(newPart);
                });
            } else {
                newDiffParts.push(part);
            }
        }

        diff = newDiffParts;
    }

    if (diff.length === 1) {
        // diff.length === 1 means that the input is exactly the same as the answer, only case different.
        //      in this case, remove the entry and ↓ and leave the answer marked green!
        answerSpans.forEach((span) => span.setAttribute('class', 'typeGood'));
        comparison_area.innerHTML = answerSpans.map((elem) => elem.outerHTML).join('');
    } else {
        // If they're not same, then reconstruct the entry and answer spans with the new classes based on the diff.

        // These arrays will contain the new spans with the new classes for entry and answer.
        const recon_entrySpans = [],
            recon_answerSpans = [];

        // We want to keep track of the original entry, so we can use it in display since diffChars ignores case and normalizes case diffs.
        const full_entry_chars = full_entry.split('');

        /**
         * This variable keeps track of the length of processed parts so far in the answer, so we can use it to slice the original answer and get the non-normalized part.
         * It should match the length of the original answer.
         * @type {number}
         */
        let processed_answer_parts_len = 0;

        diff.forEach((part, index) => {
            // entry and answer spans have different coloring, so we need to use different classes for each.
            let entry_typeClass = part.added ? 'typeMissed' : part.removed ? 'typeBad' : 'typeGood';
            let answer_typeClass = part.added ? 'typeBad' : part.removed ? 'typeMissed' : 'typeGood';

            let entry_span = '',
                answer_span = '';

            //#region Entry processing
            if (entry_typeClass === 'typeMissed') {
                if (!addon_config.ignore_punctuations || !isPunctuation(part.value)) {
                    // If punctuation is ignored, we don't want to add typeMissed for punctuation in entry.
                    if (!last_item_includes(recon_entrySpans, 'typeBad'))
                        // Only add typeMissed if last item is not typeBad, to match better with answerSpans.
                        entry_span = `<span class="typeMissed">-</span>`.repeat(part.value.length);
                }
            } else {
                if (addon_config.ignore_punctuations && isPunctuation(part.value)) {
                    entry_span = `<span class="typeGood">${full_entry_chars.splice(0, part.value.length).join('')}</span>`;
                }
                // We want to consume the original entry array in display, so we splice it based on how many chars to consume.
                else entry_span = `<span class="${entry_typeClass}">${full_entry_chars.splice(0, part.value.length).join('')}</span>`;
            }
            //#endregion

            //#region Answer processing
            if (answer_typeClass !== 'typeMissed') {
                // If the part is missed in the answer, this means it was found in entry but not in answer!
                //      so the entry will show '-' for this missed chars part and move on. There's nothing to be done for missed parts in answer.

                if (addon_config.ignore_punctuations && isPunctuation(part.value)) {
                    // if this part is punctuation and punctuation is ignored, we want to show the part as typeGood.
                    answer_span = `<span class="typeGood">${part.value}</span>`;
                } else if (addon_config.ignore_accents) {
                    // slice this part from the original answer to get the original part with accents.
                    let original_part = full_answer.slice(processed_answer_parts_len, processed_answer_parts_len + part.value.length);
                    answer_span = `<span class="${answer_typeClass}">${original_part}</span>`;
                } else {
                    answer_span = `<span class="${answer_typeClass}">${part.value}</span>`;
                }

                // Increment the processed_answer_parts_len. But only if the part is not removed (aka typeMissed), because if it's removed, it's not in the answer, only entry, so we don't want to increment the length.
                processed_answer_parts_len += part.value.length;
            }
            //#endregion

            recon_entrySpans.push(entry_span);
            recon_answerSpans.push(answer_span);
        });

        if (recon_answerSpans.every((span) => span.includes('typeGood'))) {
            // if answer only has typeGood spans, then we want to only show the answer.
            comparison_area.innerHTML = recon_answerSpans.join('');
        } else {
            // else display the new spans in the comparison area.
            comparison_area.innerHTML = `${recon_entrySpans.join('')}<br><span id="typearrow">⇩</span><br>${recon_answerSpans.join('')}`;
        }
    }
}

export { compareInputToAnswer };
