export { isPunctuation, hasPunctuation, last_item_includes, destructLetters, constructLetters, extractWordsAndSymbols };

/**
 * Checks if the last item of the array includes the string.
 * @param {Array<string>} arr_of_strings The array of strings to check the last item of.
 * @param {string} str The string to check if it's included in the last item of the array.
 * @returns {boolean} true if the last item of the array includes the string, false otherwise.
 */
function last_item_includes(arr_of_strings, str) {
    return arr_of_strings.length > 0 && arr_of_strings.at(-1).includes(str);
}

/**
 * Takes an element and destructs its text into separate elements.
 * <span class="typeGood">ab</span>
 * ↓
 * <span class="typeGood">a</span>
 * <span class="typeGood">b</span>
 * @param {Element} elem Element to destruct.
 */
function destructLetters(elem) {
    let elemText = elem.innerText;
    for (let i = elemText.length - 1; i >= 0; i--) {
        let new_char_elem = elem.cloneNode(true);
        new_char_elem.innerHTML = elemText[i];
        elem.parentNode.insertBefore(new_char_elem, elem.nextSibling);
    }
    elem.remove();
}

/**
 * Takes a NodeList, combines them and returns the resulting text.
 * Ex: [<span>H</span>, <span>i</span>, <span>!</span>] => Hi!
 * @param {NodeList} listElems Elements to combine and return text of.
 * @returns Text of all elements in listElems combined.
 */
function constructLetters(listElems) {
    return [...listElems]
        .map((elem) => {
            // Use textContent to get raw Unicode text — innerHTML would re-serialise U+00A0 as
            // the literal string "&nbsp;", which breaks downstream string comparisons.
            // Anki inserts U+00A0 (NBSP) immediately before orphaned combining diacritical marks
            // that land in their own span during its character-by-character comparison (this
            // happens with Arabic harakat, Vietnamese tone marks, etc.).  Strip those spacers so
            // the reconstructed text matches the original field value.
            return elem.textContent.replace(/\u00a0(?=\p{M})/gu, '');
        })
        .join('')
        .trim();
}

/**
 * Checks if a given character is a punctuation mark.
 * Uses Unicode property escapes (\p{P}) to cover all Unicode punctuation categories,
 * including language-specific punctuation such as Japanese 「」『』、。,
 * Chinese 〔〕《》，、Arabic ،؟, French «», Spanish ¡¿, and more.
 * Also includes common ASCII math/symbol characters not covered by \p{P}:
 * $, +, <, =, >, ^, |, ~
 *
 * - **`\p{P}`** (with the `u` flag) replaces the hardcoded ASCII list. It covers all 7 Unicode punctuation categories:
 *   - `Pi`/`Pf` — initial/final quotes: `«»`, `""`，`''`, Japanese `「」`、`『』`
 *   - `Ps`/`Pe` — brackets: `（）`、`【】`、`〔〕`、`《》`、`〈〉`
 *   - `Po` — other: `。`、`、`、`·`、`…`、`¡`、`؟`、`،` and hundreds more
 *   - `Pd` — dashes: `—`, `–`, `‐`
 *   - `Pc` — connectors: `_`, etc.
 * - **`$+<=>^|~`** are kept explicitly because they're Unicode *symbols* (`\p{S}`/`\p{Sm}`), not punctuation (`\p{P}`), so `\p{P}` alone wouldn't catch them.
 *
 * @param {string} char - The character to check.
 * @returns {boolean} - Returns true if the character is a punctuation mark, otherwise false.
 */
function isPunctuation(char) {
    return /[\p{P}$+<=>^|~]/u.test(char);
}

/**
 * Checks if the given text contains any punctuation characters.
 *
 * @param {string} text - The text to check for punctuation.
 * @returns {boolean} - Returns true if the text contains punctuation, otherwise false.
 */
function hasPunctuation(text) {
    return text.split('').some(isPunctuation);
}

/**
 * Splits a given text into an array of substrings, separating by punctuation marks.
 * Punctuation marks are included as separate elements in the resulting array.
 *
 * @param {string} text - The text to be split.
 * @returns {string[]} An array of substrings and punctuation marks.
 *
 * @example
 * extractWordsAndSymbols('Hello, world!') => ['Hello', ',', ' ', 'world', '!']
 * extractWordsAndSymbols('Hello') => ['Hello']
 * extractWordsAndSymbols('Hello!') => ['Hello', '!']
 */
function extractWordsAndSymbols(text) {
    let parts = [];
    let current = '';

    for (let i = 0; i < text.length; i++) {
        if (isPunctuation(text[i])) {
            if (current) {
                parts.push(current);
            }
            parts.push(text[i]);
            current = '';
        } else {
            current += text[i];
        }
    }
    if (current) {
        parts.push(current);
    }
    return parts;
}
