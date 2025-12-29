/* global i18next, getUserSelectTranslateHTMLCode, Evaluate */

// Configuration constants (need to be global for use in inline scripts in index.html)
// eslint-disable-next-line no-var
var default_lat = 48.7769;
// eslint-disable-next-line no-var
var default_lon = 9.1844;
// eslint-disable-next-line no-var
var repo_url = 'https://github.com/opening-hours/opening_hours.js';

// Initialize YoHours (needs to be before yohours_model.js loads, used by yohours_model.js)
// eslint-disable-next-line no-unused-vars, no-var
var YoHours = function() {};

// These will be set after other scripts load
// eslint-disable-next-line no-var
var YoHoursChecker = new YoHoursChecker();
// eslint-disable-next-line no-unused-vars, no-var
var specification_url = `https://wiki.openstreetmap.org/wiki/${i18next.language === 'de' ? 'DE:' : ''}Key:opening_hours/specification`;

// Set page title
if (document.title !== i18next.t('texts.title')) {
    document.title = i18next.t('texts.title');
}

// Helper function to generate month options
function generateMonthOptions() {
    let options = '';
    for (let i = 0; i < 12; i++) {
        options += `<option value="monthNumber${i}">${new Date(2018, i, 1).toLocaleString(i18next.language, {month: 'short'})}</option>`;
    }
    return options;
}

// Helper function to generate time navigation buttons
function generateTimeButtons() {
    const buttons = [
        [ 3600 * 24 * 365, 1, 'words.time.year'    ],
        [ 3600 * 24 *   7, 1, 'words.time.week'    ],
        [ 3600 * 24      , 1, 'words.time.day'     ],
        [ 3600           , 1, 'words.time.hour'    ],
        [ 60             , 1, 'words.time.minute'  ],
        [ 0              , 0, 'words.time.now'     ],
    ];
    let html = '';
    for (let i = 0; i < buttons.length; i++) {
        if (buttons[i][1] !== 0) {
            for (let x = -1; x <= 1; x += 2) {
                const step = x * buttons[i][1];
                html += `<button type="button" onclick="Evaluate(${buttons[i][0] * step})">${step > 0 ? '+' : ''}${step} ${i18next.t(buttons[i][2])}</button>${x === 1 ? ' ' : ''}`;
            }
        } else {
            html += `<button type="button" onclick="Evaluate(0, true)">${i18next.t(buttons[i][2])}</button>`;
        }
    }
    return html;
}

// Helper function to generate mode selector options
function generateModeOptions() {
    let options = '';
    for (let i = 0; i <= 2; i++) {
        options += `<option value="${i}">${i18next.t(`texts.mode ${i}`)}</option>`;
    }
    return options;
}

// Populate all dynamic content after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Page title
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = i18next.t('texts.title');
    }

    // Language selector
    const langSelector = document.getElementById('language-selector');
    if (langSelector) {
        langSelector.innerHTML = getUserSelectTranslateHTMLCode();
    }

    // Date and time inputs
    const dateTimeInputs = document.getElementById('date-time-inputs');
    if (dateTimeInputs) {
        dateTimeInputs.innerHTML = `
            <span class="hd">${i18next.t('words.date')} ${i18next.t('words.and')} ${i18next.t('words.time.time')}:</span>
            <input type="number" step="1" class="input__year" id="yyyy" name="yyyy" value="2013" onblur="Evaluate()" />-
            <select id="mm" name="mm" onchange="Evaluate()">${generateMonthOptions()}</select>-
            <input type="number" step="1" min="1" max="31" id="dd" size="3" name="dd" value="02" onblur="Evaluate()"/>
            &#160;
            <input type="number" step="1" min="0" max="23" name="HH" value="22" onblur="Evaluate()" />:<input type="number" step="1" min="0" max="59" name="MM" value="21" onblur="Evaluate()" />
            &#160;
            <input size="10" name="wday" readonly="readonly" />
            <input size="3"  name="week" readonly="readonly" />
        `;
    }

    // Time navigation buttons
    const timeButtons = document.getElementById('time-buttons');
    if (timeButtons) {
        timeButtons.innerHTML = generateTimeButtons();
    }

    // Position inputs
    const positionInputs = document.getElementById('position-inputs');
    if (positionInputs) {
        positionInputs.innerHTML = `
            <span class="hd">${i18next.t('words.position')}:</span>
            ${i18next.t('words.lat')}: <input type="number" class="input__coordinate" id="lat" value="${default_lat}" onblur="Evaluate()" />
            ${i18next.t('words.lon')}: <input type="number" class="input__coordinate" id="lon" value="${default_lon}" onblur="Evaluate()" />
            ${i18next.t('words.country')}: <input size="3" id="cc" readonly="readonly" />
            ${i18next.t('words.state')}: <input size="20" id="state" readonly="readonly" /><br />
        `;
    }

    // Mode selector
    const modeSelector = document.getElementById('mode-selector');
    if (modeSelector) {
        modeSelector.innerHTML = `
            <span class="hd">${i18next.t('words.mode')}: </span>
            <select id="mode" name="name" onchange="Evaluate()" style="max-width:100%;">
                ${generateModeOptions()}
            </select>
        `;
    }

    // Value labels
    const valueLabel = document.getElementById('value-label');
    if (valueLabel) {
        valueLabel.innerHTML = `${i18next.t('texts.value for')} <q>opening_hours</q>:`;
    }

    const compareLabel = document.getElementById('compare-label');
    if (compareLabel) {
        compareLabel.textContent = i18next.t('texts.value to compare') + ':';
    }

    // Examples header
    const examplesHeader = document.getElementById('examples');
    if (examplesHeader) {
        examplesHeader.textContent = i18next.t('words.examples') + ':';
    }

    // Year ranges documentation link
    const yearRangesDocu = document.getElementById('year-ranges-docu');
    if (yearRangesDocu) {
        yearRangesDocu.href = `${repo_url}/tree/main#year-ranges`;
        yearRangesDocu.textContent = i18next.t('words.docu');
    }

    // Example hints
    const hintErrorCorrection1 = document.getElementById('hint-error-correction-1');
    if (hintErrorCorrection1) {
        hintErrorCorrection1.textContent = `(${i18next.t('texts.check out error correction, prettify')})`;
    }

    const hintErrorCorrection2 = document.getElementById('hint-error-correction-2');
    if (hintErrorCorrection2) {
        hintErrorCorrection2.textContent = `(${i18next.t('texts.check out error correction, prettify')})`;
    }

    const hintPhMoFr = document.getElementById('hint-ph-mo-fr');
    if (hintPhMoFr) {
        hintPhMoFr.textContent = `(${i18next.t('texts.if PH is between Mo and Fr')})`;
    }

    const hintShPh = document.getElementById('hint-sh-ph');
    if (hintShPh) {
        hintShPh.textContent = `(${i18next.t('texts.SH,PH or PH,SH')})`;
    }

    // Footer content
    const userDiv = document.getElementById('user');
    if (userDiv) {
        const footer = document.createElement('div');
        footer.innerHTML = i18next.t('texts.more information',
            { href: 'https://wiki.openstreetmap.org/wiki/Key:opening_hours' }) + '<br />' +
            i18next.t('texts.this website', { url: repo_url, hoster: 'GitHub' });
        userDiv.appendChild(footer);

        document.body.parentElement.lang = i18next.language;
    }

    // Trigger initial evaluation only if the form exists
    if (document.forms.check) {
        Evaluate();
    }
});
