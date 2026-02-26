import { compareInputToAnswer } from './utils.mjs';

// default config
const defaultAddonConfig = {
    ignore_case: false,
    ignore_accents: false,
    ignore_punctuations: false,
    ignore_extra_words: false,
};

let addon_config = { ...defaultAddonConfig };

describe('ignore_case tests', () => {
    beforeEach(() => {
        addon_config.ignore_case = true;
    });

    afterEach(() => {
        addon_config = { ...defaultAddonConfig };
        sessionStorage.removeItem('stf_typedInput');
    });

    it('detects missing letter', () => {
        /**
         * Issue: Case when user misses a letter.
         * User types: aBcde
         * Answer is : abccde
         * Vanilla result: Missing letter is not marked as missed (https://imgur.com/qs9oqFe)
         * Expected result: Missing letter is marked as missed (https://imgur.com/8oZJXKc)
         */

        // Setup
        document.body.innerHTML = b('aBcde', 'abccde');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
                <code id="typeans">
                    <span class="typeGood">aBc</span>
                    <span class="typeMissed">-</span>
                    <span class="typeGood">de</span>
                        <br><span id="typearrow">⇩</span><br>
                    <span class="typeGood">abc</span>
                    <span class="typeBad">c</span>
                    <span class="typeGood">de</span>
                </code>`),
        );
    });

    it("doesn't add - in entrySpans directly after typeBad", () => {
        // because it's ommited from answer too
        /**
         * Issue: Addon shouldn't add - in entrySpans directly after typeBad.
         * User types: ykjavik
         * Answer is : Reykjavík
         * Expected result: Correctly marked letters, but no - is added to entrySpan (https://imgur.com/ekoLvo5)
         */

        // Setup
        document.body.innerHTML = b('ykjavik', 'Reykjavík');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
            <code id="typeans">
                <span class="typeMissed">--</span>
                <span class="typeGood">ykjav</span>
                <span class="typeBad">i</span>
                <span class="typeGood">k</span>
                    <br><span id="typearrow">⇩</span><br>
                <span class="typeBad">Re</span>
                <span class="typeGood">ykjav</span>
                <span class="typeBad">í</span>
                <span class="typeGood">k</span>
            </code>`),
        );
    });

    it("doesn't add - in entrySpans, ONLY directly after typeBad", () => {
        /**
         * Issue: Addon shouldn't add - in entrySpans, ONLY directly after typeBad.
         * User types: Indi
         * Answer is : Indi-
         * Expected result: Correctly mark letters (https://imgur.com/PWyW7mA)
         */

        // Setup
        document.body.innerHTML = b('Indi', 'Indi-');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
            <code id="typeans">
                <span class="typeGood">Indi</span>
                <span class="typeMissed">-</span>
                    <br><span id="typearrow">⇩</span><br>
                <span class="typeGood">Indi</span>
                <span class="typeBad">-</span>
            </code>`),
        );
    });

    it('recognizes user-typed hyphens', () => {
        /**
         * Issue: Case when user types hyphen. hyphen can be interpreted as a missing letter too, so it should be marked as green if it's in the answer.
         * User types: A-bc
         * Answer is : a-bc
         * Vanilla result: A is marked red, -bc is marked green (https://imgur.com/knm1AU4)
         * Expected result: a-bc (all green)
         */

        // Setup
        document.body.innerHTML = b('A-bc', 'a-bc');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
            <code id="typeans">
                <span class="typeGood">a-bc</span>
            </code>`),
        );
    });

    it('trims the entry and the answer', () => {
        // to match the answer
        /**
         * Issue: Case when the user types a leading/trailing space, especially when using voice input.
         * User types:  abc
         * Answer is : abc
         * Vanilla result: Leading and trailing spaces are marked as wrong (https://imgur.com/lJ8HqJO)
         * Expected result: All green (https://imgur.com/nbOg6P7)
         */

        // Setup
        document.body.innerHTML = f(/*html*/ `
        <code id="typeans">
            <span class="typeBad"> </span>
            <span class="typeGood">abc</span>
            <span class="typeBad"> </span>
                <br><span id="typearrow">↓</span><br>
            <span class="typeGood">abc</span>
        </code>`);

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
        <code id="typeans">
            <span class="typeGood">abc</span>
        </code>`),
        );
    });
});

describe('ignore_accents tests', () => {
    beforeEach(() => {
        addon_config.ignore_accents = true;
    });

    afterEach(() => {
        addon_config = { ...defaultAddonConfig };
        sessionStorage.removeItem('stf_typedInput');
    });

    it('Ignore Accents - Basic Latin', () => {
        /**
         * Issue: Case when there's an accent mismatch.
         * User types: Reykjavic
         * Answer is : Reykjavìc
         * Vanilla result: ì is marked as missed
         * Expected result: All green
         */

        // Setup
        document.body.innerHTML = b('Reykjavic', 'Reykjavìc');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
        <code id="typeans">
            <span class="typeGood">Reykjavìc</span>
        </code>`),
        );
    });

    it('Ignore Accents - Extended Characters', () => {
        /**
         * Issue: Case when there's an accent mismatch or an umlaut.
         * User types: naive
         * Answer is : naïve
         * Vanilla result: ï is marked as missed
         * Expected result: All green
         */

        // Setup
        document.body.innerHTML = b('naive', 'naïve');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
        <code id="typeans">
            <span class="typeGood">naïve</span>
        </code>`),
        );
    });

    it('Ignore Accents - Mixed Case and Accents', () => {
        /**
         * Issue: Case when an accent mismatch occurs in a mixed case word.
         * User types: Éxample
         * Answer is : example
         * Vanilla result: É is marked as missed
         * Expected result: All green
         */

        addon_config.ignore_case = true;

        // Setup
        document.body.innerHTML = b('Éxample', 'example');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
        <code id="typeans">
            <span class="typeGood">example</span>
        </code>`),
        );
    });

    it('Ignore Accents - Multiple Accents in a String', () => {
        /**
         * Issue: Case when there are multiple accent mismatches.
         * User types: eleve
         * Answer is : élève
         * Vanilla result: é and è are marked as missed
         * Expected result: All green
         */

        // Setup
        document.body.innerHTML = b('eleve', 'élève');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
        <code id="typeans">
            <span class="typeGood">élève</span>
        </code>`),
        );
    });

    it('Ignore Accents - Non-Latin Scripts', () => {
        /**
         * Issue: Case when there are accent mismatches in non-Latin scripts.
         * User types: Toi thich lap trinh
         * Answer is : Tôi thích lập trình
         * Vanilla result: é and è are marked as missed
         * Expected result: All green
         */

        // Setup
        document.body.innerHTML = f(/*html*/ `
        <code id="typeans">
            <span class="typeGood">T</span>
            <span class="typeBad">o</span>
            <span class="typeGood">i th</span>
            <span class="typeBad">i</span>
            <span class="typeGood">ch l</span>
            <span class="typeBad">a</span>
            <span class="typeGood">p tr</span>
            <span class="typeBad">i</span>
            <span class="typeGood">nh</span>
                <br><span id="typearrow">↓</span><br>
            <span class="typeGood">T</span>
            <span class="typeMissed">ô</span>
            <span class="typeGood">i th</span>
            <span class="typeMissed">í</span>
            <span class="typeGood">ch l</span>
            <span class="typeMissed">ậ</span>
            <span class="typeGood">p tr</span>
            <span class="typeMissed">ì</span>
            <span class="typeGood">nh</span>
        </code>`);

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
        <code id="typeans">
            <span class="typeGood">Tôi thích lập trình</span>
        </code>`),
        );
    });

    it('Ignore Arabic diacritics', () => {
        /**
         * Issue: Case when there are Arabic diacritic mismatches.
         * User types: الحمد لله
         * Answer is : الحمدُ للهِ
         * Vanilla result: Arabic diacritics are marked as missed
         * Expected result: All green
         */

        // Setup
        document.body.innerHTML = b('الحمد لله', 'الحمدُ للهِ');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
        <code id="typeans">
            <span class="typeGood">الحمدُ للهِ</span>
        </code>`),
        );
    });

    it('Ignore Arabic diacritics - Anki char-by-char split with NBSP before harakat (regression)', () => {
        /**
         * Regression: When Anki does its own char-by-char comparison on Arabic text with
         * harakat, it places each combining diacritic in its own span and prepends U+00A0
         * (NBSP) to prevent rendering artefacts:
         *   <span class="typeGood">ب</span><span class="typeMissed">&nbsp;َ</span>...
         * constructLetters previously read .innerHTML, which gave the literal entity string
         * "&nbsp;" rather than the NBSP+harakat characters, contaminating full_answer.
         * It now uses .textContent and strips U+00A0 before Unicode combining marks (p{M}),
         * correctly reconstructing the answer as بَطِّيخ.
         *
         * User types: بطيخ  (no harakat)
         * Answer is : بَطِّيخ  (with harakat)
         * Expected result: All green (harakat stripped from both sides when ignore_accents)
         */

        sessionStorage.setItem('stf_typedInput', 'بطيخ');
        document.body.innerHTML = f(/*html*/ `
            <code id="typeans">
                <span class="typeGood">ب</span>
                <span class="typeMissed">-</span>
                <span class="typeGood">ط</span>
                <span class="typeMissed">--</span>
                <span class="typeGood">يخ</span>
                    <br><span id="typearrow">↓</span><br>
                <span class="typeGood">ب</span>
                <span class="typeMissed">&nbsp;َ</span>
                <span class="typeGood">ط</span>
                <span class="typeMissed">&nbsp;ِّ</span>
                <span class="typeGood">يخ</span>
            </code>`);

        compareInputToAnswer(addon_config);

        // All green: harakat in the answer should be ignored, no typeBad or typeMissed.
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
                <code id="typeans">
                    <span class="typeGood">بَطِّيخ</span>
                </code>
            `),
        );
    });

    it('Ignore Arabic diacritics - partial match slices original answer correctly', () => {
        /**
         * Regression: When ignore_accents is on the diff runs on the normalized answer, so
         * diff part lengths are in normalized (no-harakat) codepoints.  Previously the code
         * used those lengths directly to slice full_answer (which still contains harakat),
         * producing wrong spans: e.g. for answer بَطِّيخ a 3-char diff part would slice
         * full_answer[0:3] = 'بَط' instead of the correct 'بَطِّي'.
         * The normToOrig mapping now translates normalized positions → original positions.
         *
         * User types: بطي   (3 base letters, no harakat)
         * Answer is : بَطِّيخ (4 base letters + harakat)
         * Expected: entry shows typeGood 'بطي' + typeMissed '-'
         *           answer shows typeGood 'بَطِّي' + typeBad 'خ'
         */

        sessionStorage.setItem('stf_typedInput', 'بطي');
        document.body.innerHTML = f(/*html*/ `
            <code id="typeans">
                <span class="typeGood">ب</span>
                <span class="typeMissed">-</span>
                <span class="typeGood">ط</span>
                <span class="typeMissed">--</span>
                <span class="typeGood">ي</span>
                <span class="typeMissed">-</span>
                    <br><span id="typearrow">↓</span><br>
                <span class="typeGood">ب</span>
                <span class="typeMissed">&nbsp;َ</span>
                <span class="typeGood">ط</span>
                <span class="typeMissed">&nbsp;ِّ</span>
                <span class="typeGood">يخ</span>
            </code>`);

        compareInputToAnswer(addon_config);

        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
                <code id="typeans">
                    <span class="typeGood">بطي</span>
                    <span class="typeMissed">-</span>
                        <br><span id="typearrow">⇩</span><br>
                    <span class="typeGood">بَطِّي</span>
                    <span class="typeBad">خ</span>
                </code>
            `),
        );
    });
});

describe('ignore_punctuations tests', () => {
    beforeEach(() => {
        addon_config.ignore_punctuations = true;
    });

    afterEach(() => {
        addon_config = { ...defaultAddonConfig };
        sessionStorage.removeItem('stf_typedInput');
    });

    it('Ignores Extended Punctuation', () => {
        /**
         * Issue: Case when there's a punctuation mismatch.
         * User types: Good morning
         * Answer is : Good morning...!
         * Vanilla result: ...! are marked as missed
         * Expected result: All green
         */

        // Setup
        document.body.innerHTML = b('Good morning', 'Good morning...!');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
            <code id="typeans">
                <span class="typeGood">Good morning...!</span>
            </code>`),
        );
    });

    it('Ignores Punctuations when Punctuation Only', () => {
        /**
         * Issue: Case when there's a punctuation mismatch.
         * User types: !
         * Answer is : !!!
         * Vanilla result: !! are marked as missed
         * Expected result: All green
         */

        // Setup
        document.body.innerHTML = b('!', '!!!');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
            <code id="typeans">
                <span class="typeGood">!!!</span>
            </code>`),
        );
    });

    it('Ignores International Punctuation', () => {
        /**
         * Issue: Case when answer contains certain international punctuation.
         * User types: Como estas
         * Answer is : ¿Cómo estás?
         * Vanilla result: ¿, ? are marked as missed
         * Expected result: All green
         */

        addon_config.ignore_accents = true;

        // Setup
        document.body.innerHTML = b('Como estas', '¿Cómo estás?');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
            <code id="typeans">
                <span class="typeGood">¿Cómo estás?</span>
            </code>`),
        );
    });

    it('Ignores Apostrophes and Quotes', () => {
        /**
         * Issue: Case when answer contains apostrophes and quotes.
         * User types: Its a test
         * Answer is : "It's a test."
         * Vanilla result: ", ' and . are marked as missed
         * Expected result: All green
         */

        // Setup
        document.body.innerHTML = b('Its a test', '"It\'s a test."');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
            <code id="typeans">
                <span class="typeGood">"It's a test."</span>
            </code>`),
        );
    });

    it('ignores punctuations when ignore_accents is enabled', () => {
        /**
         * Issue: Case when answer contains apostrophes and quotes.
         * User types: ハス停はここてすか?
         * Answer is : バス停はここですか
         * Vanilla result: with :nc modifier on, it ignores accents and marks punctuation as bad.
         * Expected result: no typeBad, all green (punctuation is ignored together with accents when ignore_accents is enabled)
         */

        addon_config.ignore_accents = true;

        // Setup
        document.body.innerHTML = f(/*html*/ `
            <code id="typeans">
                <span class="typeGood">ハス停はここてすか</span>
                <span class="typeBad">?</span>
                    <br><span id="typearrow">↓</span><br>
                <span class="typeGood">バス停はここですか</span>
            </code>
        `);

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).not.toContain('typeBad');
    });
});

describe('ignore_extra_words tests', () => {
    beforeEach(() => {
        addon_config.ignore_extra_words = true;
    });

    afterEach(() => {
        addon_config = { ...defaultAddonConfig };
        sessionStorage.removeItem('stf_typedInput');
    });

    it('accepts typed sentence that contains the answer', () => {
        /**
         * Use Case: Cloze deletion cards where the user types the full sentence instead of just the hidden phrase.
         * User types: New coffee shops have sprung up all over the neighborhood
         * Answer is : sprung up
         * Vanilla result: Diff shows entry text doesn't match answer
         * Expected result: All green (answer found as substring of typed text)
         */

        // Setup
        document.body.innerHTML = b('New coffee shops have sprung up all over the neighborhood', 'sprung up');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
                <code id="typeans">
                    <span class="typeGood">sprung up</span>
                </code>
            `),
        );
    });

    it("doesn't accept typed sentence that doesn't contain the answer as is", () => {
        /**
         * Use Case: User types a sentence that doesn't contain the answer as is.
         * User types: A cuning ploy
         * Answer is : cunning
         * Vanilla result: Normal diff display with mismatches
         * Expected result: Normal diff display, not all green (answer not found as substring of typed text)
         */

        // Setup
        document.body.innerHTML = b('A cuning ploy', 'cunning');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).not.toEqual(
            f(/*html*/ `
                <code id="typeans">
                    <span class="typeGood">cunning</span>
                </code>
            `),
        );
    });

    it('accepts typed sentence with case variation when ignore_case is enabled', () => {
        /**
         * Use Case: Cloze sentence typed with different capitalisation.
         * User types: Too Far Into The Weeds, she lost the big picture.
         * Answer is : too far into the weeds
         * Vanilla result: Diff shows case mismatch in entry
         * Expected result: All green
         */

        addon_config.ignore_case = true;

        // Setup
        document.body.innerHTML = b('Too Far Into The Weeds, she lost the big picture.', 'too far into the weeds');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify
        expect(document.body.innerHTML).toEqual(
            f(/*html*/ `
                <code id="typeans">
                    <span class="typeGood">too far into the weeds</span>
                </code>
            `),
        );
    });

    it('shows diff when typed text does not contain the answer', () => {
        /**
         * Use Case: User types a wrong phrase — normal diff should still apply.
         * User types: spring up
         * Answer is : sprung up
         * Vanilla result: Diff shows character mismatch (i vs u)
         * Expected result: Normal diff display (not all green)
         */

        // Setup
        document.body.innerHTML = b('spring up', 'sprung up');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify - diff should still apply, not everything green
        expect(document.body.innerHTML).not.toEqual(
            f(/*html*/ `
                <code id="typeans">
                    <span class="typeGood">sprung up</span>
                </code>
            `),
        );
    });

    it('is disabled by default and does not affect normal diff', () => {
        /**
         * Use Case: Feature is disabled by default and should not interfere with normal diff.
         * User types: New coffee shops have sprung up all over
         * Answer is : sprung up
         * Vanilla result: Diff shows extra words are marked as wrong
         * Expected result: Normal diff applies, extra words cause a diff (typeBad)
         */

        addon_config.ignore_extra_words = false;

        // Setup
        document.body.innerHTML = b('New coffee shops have sprung up all over', 'sprung up');

        // Exercise
        compareInputToAnswer(addon_config);

        // Verify - should NOT be all green, extra words cause a diff
        expect(document.body.innerHTML).toContain('typeBad');
    });
});

/**
 * Removes whitespace between HTML tags and trims the string.
 *
 * @param {string} s - The input string containing HTML.
 * @returns {string} - The processed string with no whitespace between tags and trimmed.
 */
const f = (s) => s.replace(/>\s+</g, '><').trim();

/**
 * Builds the standard Anki type-answer HTML for a fully-wrong comparison:
 * input in a single typeBad span, answer in a single typeMissed span.
 * Also stores the raw input in sessionStorage so compareInputToAnswer uses it
 * directly rather than reconstructing from partially-matched spans.
 *
 * @param {string} input  - What the user typed.
 * @param {string} answer - The correct answer.
 * @returns {string} - Processed HTML string (whitespace collapsed via f()).
 */
const b = (input, answer) => {
    // Pass input in sessionStorage to mimic the front template's capture of raw input, so compareInputToAnswer uses it directly rather than reconstructing from partially-matched spans.
    sessionStorage.setItem('stf_typedInput', input);

    return f(/*html*/ `
        <code id="typeans">
            <span class="typeBad">${input}</span>
                <br><span id="typearrow">↓</span><br>
            <span class="typeMissed">${answer}</span>
        </code>
    `);
};
