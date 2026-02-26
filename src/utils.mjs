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

    // Prefer the raw input captured on the front template (avoids issues from span reconstruction post-comparison).
    // Falls back to reconstructing from Anki's comparison spans if sessionStorage is missing.
    const full_entry = sessionStorage.getItem('stf_typedInput')?.trim() ?? constructLetters(entrySpans);
    const full_answer = constructLetters(answerSpans);
    console.log('Full entry:', full_entry);
    console.log('Full answer:', full_answer);

    const diffCharsOpts = addon_config.ignore_case ? { ignoreCase: true } : {};

    // Pre-compute accent-normalized strings — reused by the extra-words check and the diff.
    let normalized_entry = full_entry;
    let normalized_answer = full_answer;

    if (addon_config.ignore_accents) {
        // U+0300-U+036F: Latin/IPA combining diacritical marks
        // U+3099-U+309A: Japanese combining dakuten/handakuten (e.g. バ NFD = ハ + U+3099)
        // U+064b-U+065f: Arabic diacritics (harakat: fatha, kasra, shadda, sukun, etc.)
        normalized_entry = full_entry.normalize('NFD').replace(/[\u0300-\u036f\u3099-\u309a\u064b-\u065f]/g, '');
        normalized_answer = full_answer.normalize('NFD').replace(/[\u0300-\u036f\u3099-\u309a\u064b-\u065f]/g, '');
    }

    console.log('Normalized entry:', normalized_entry);
    console.log('Normalized answer:', normalized_answer);

    // ignore_extra_words: check if the entry contains the answer as a substring using all
    // What this does is that if the answer (e.g "Anki") is fully matched in the diff, but there's some extra words in the entry (e.g "The app is called Anki"), then we consider it a full match and show the all-green answer. This way, users who type extra words before/after the correct answer can still get full credit as long as the correct answer is fully present in their input.
    let diff;
    if (addon_config.ignore_extra_words) {
        // Must run before diffChars: jsdiff's global LCS optimization does not align characters in a way that reliably reflects substring containment, so the check has to be literal.

        let entry_to_check = normalized_entry;
        let answer_to_check = normalized_answer;

        if (addon_config.ignore_punctuations) {
            const strip = (str) =>
                str
                    .split('')
                    .filter((ch) => !isPunctuation(ch))
                    .join('');
            entry_to_check = strip(entry_to_check);
            answer_to_check = strip(answer_to_check);
        }

        if (answer_to_check.length > 0 && entry_to_check !== answer_to_check) {
            const escapedAnswer = answer_to_check.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // ignore_case is handled via a regex /i flag rather than .toLowerCase(), consistent with how diffChars handles it via the ignoreCase option.
            const flags = addon_config.ignore_case ? 'i' : '';
            if (new RegExp(escapedAnswer, flags).test(entry_to_check)) {
                diff = [{ value: full_answer }]; // single equal part → hits the all-green render path
            }
        }
    }

    if (!diff) {
        diff = diffChars(
            addon_config.ignore_accents ? normalized_entry : full_entry,
            addon_config.ignore_accents ? normalized_answer : full_answer,
            diffCharsOpts,
        );

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
    }

    if (diff.length === 1) {
        // diff.length === 1 means that the input is exactly the same as the answer, only case different.
        //      in this case, remove the entry and ↓ and leave the answer marked green!
        // Use full_answer (already clean Unicode from constructLetters) rather than recycling the
        // original DOM spans, which may still contain U+00A0 injected by Anki before combining
        // diacritical marks — those render as visible spaces in RTL scripts like Arabic.
        comparison_area.innerHTML = `<span class="typeGood">${full_answer}</span>`;
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

        /**
         * When ignore_accents is enabled the diff runs on the normalized answer (combining marks
         * stripped), so diff part lengths are measured in normalized characters.  But full_answer
         * keeps the original diacritics, meaning its codepoint count differs from the normalized
         * version whenever combining marks are present (e.g. Arabic harakat, Vietnamese tones).
         * normToOrig[i] contains the index in full_answer that corresponds to normalized char i,
         * with a final sentinel entry equal to full_answer.length so that slicing the last part
         * always works correctly.
         */
        let normToOrig = null;
        if (addon_config.ignore_accents) {
            const combiningRe = /[\u0300-\u036f\u3099-\u309a\u064b-\u065f]/u;
            const positions = [];
            for (let i = 0; i < full_answer.length; i++) {
                if (!combiningRe.test(full_answer[i])) {
                    positions.push(i);
                }
            }
            positions.push(full_answer.length); // sentinel
            normToOrig = positions;
        }

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
                    // Slice the original (accent-containing) answer using the normToOrig map so that
                    // a diff part of N normalized characters correctly captures all combining marks
                    // that belong to those base characters in full_answer.
                    let start = normToOrig[processed_answer_parts_len];
                    let end = normToOrig[processed_answer_parts_len + part.value.length];
                    let original_part = full_answer.slice(start, end);
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
            comparison_area.innerHTML = mergeConsecutiveSpans(recon_answerSpans.join(''));
        } else {
            // else display the new spans in the comparison area.
            const mergedEntry = mergeConsecutiveSpans(recon_entrySpans.join(''));
            const mergedAnswer = mergeConsecutiveSpans(recon_answerSpans.join(''));
            comparison_area.innerHTML = `${mergedEntry}<br><span id="typearrow">⇩</span><br>${mergedAnswer}`;
        }
    }
}

/**
 * Merges consecutive <span class="typeXxx"> elements of the same class into a single span.
 * For example, two adjacent typeGood spans become one, two adjacent typeBad spans become one, etc.
 *
 * @param {string} html - HTML string containing <span class="typeXxx"> elements.
 * @returns {string} - The same HTML but with same-class adjacent spans joined.
 */
function mergeConsecutiveSpans(html) {
    const result = [];
    const re = /<span class="(type\w+)">([\s\S]*?)<\/span>/g;
    let m;
    while ((m = re.exec(html)) !== null) {
        const [, cls, text] = m;
        const last = result[result.length - 1];
        if (last && last.cls === cls) {
            last.text += text;
        } else {
            result.push({ cls, text });
        }
    }
    return result.map(({ cls, text }) => `<span class="${cls}">${text}</span>`).join('');
}

export { compareInputToAnswer };
