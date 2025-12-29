/* global i18next, getUserSelectTranslateHTMLCode, Evaluate, toggle, EX, josm, newValue, updatePermalinkHref */

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
                const offset = buttons[i][0] * step;
                html += `<button type="button" class="time-btn" data-offset="${offset}">${step > 0 ? '+' : ''}${step} ${i18next.t(buttons[i][2])}</button>${x === 1 ? ' ' : ''}`;
            }
        } else {
            html += `<button type="button" class="time-btn time-btn-now">${i18next.t(buttons[i][2])}</button>`;
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
    document.getElementById('page-title').textContent = i18next.t('texts.title');

    // Language selector
    document.getElementById('language-selector').innerHTML = getUserSelectTranslateHTMLCode();

    // Date and time inputs
    document.getElementById('date-time-inputs').innerHTML = `
        <span class="hd">${i18next.t('words.date')} ${i18next.t('words.and')} ${i18next.t('words.time.time')}:</span>
        <input type="number" step="1" class="input__year" id="yyyy" name="yyyy" value="2013" onblur="Evaluate()" />-<select id="mm" name="mm" onchange="Evaluate()">${generateMonthOptions()}</select>-<input type="number" step="1" min="1" max="31" id="dd" size="3" name="dd" value="02" onblur="Evaluate()"/>
        &nbsp;
        <input type="number" step="1" min="0" max="23" name="HH" value="22" onblur="Evaluate()" />:<input type="number" step="1" min="0" max="59" name="MM" value="21" onblur="Evaluate()" />
        &nbsp;
        <input size="10" name="wday" readonly="readonly" />
        <input size="3"  name="week" readonly="readonly" />
    `;

    // Time navigation buttons
    document.getElementById('time-buttons').innerHTML = generateTimeButtons();

    // Position inputs
    document.getElementById('position-inputs').innerHTML = `
        <span class="hd">${i18next.t('words.position')}:</span>
        ${i18next.t('words.lat')}: <input type="number" class="input__coordinate" id="lat" value="${default_lat}" onblur="Evaluate()" />
        ${i18next.t('words.lon')}: <input type="number" class="input__coordinate" id="lon" value="${default_lon}" onblur="Evaluate()" />
        ${i18next.t('words.country')}: <input size="3" id="cc" readonly="readonly" />
        ${i18next.t('words.state')}: <input size="20" id="state" readonly="readonly" /><br />
    `;

    // Mode selector
    document.getElementById('mode-selector').innerHTML = `
        <span class="hd">${i18next.t('words.mode')}: </span>
        <select id="mode" name="mode" onchange="Evaluate()" style="max-width:100%;">
            ${generateModeOptions()}
        </select>
    `;

    // Value labels
    document.getElementById('value-label').innerHTML = `${i18next.t('texts.value for')} <q>opening_hours</q>:`;
    document.getElementById('compare-label').textContent = i18next.t('texts.value to compare') + ':';

    // Examples header
    document.getElementById('examples').textContent = i18next.t('words.examples') + ':';

    // Year ranges documentation link
    const yearRangesDocu = document.getElementById('year-ranges-docu');
    yearRangesDocu.href = `${repo_url}/tree/main#year-ranges`;
    yearRangesDocu.textContent = i18next.t('words.docu');

    // Example hints
    document.getElementById('hint-error-correction-1').textContent = `(${i18next.t('texts.check out error correction, prettify')})`;
    document.getElementById('hint-error-correction-2').textContent = `(${i18next.t('texts.check out error correction, prettify')})`;
    document.getElementById('hint-ph-mo-fr').textContent = `(${i18next.t('texts.if PH is between Mo and Fr')})`;
    document.getElementById('hint-sh-ph').textContent = `(${i18next.t('texts.SH,PH or PH,SH')})`;

    // Permalink checkbox label
    document.getElementById('permalink-checkbox-label').textContent = i18next.t('texts.include timestamp?');

    // Footer content
    const userDiv = document.getElementById('user');
    const footer = document.createElement('div');
    footer.innerHTML = i18next.t('texts.more information',
        { href: 'https://wiki.openstreetmap.org/wiki/Key:opening_hours' }) + '<br />' +
        i18next.t('texts.this website', { url: repo_url, hoster: 'GitHub' });
    userDiv.appendChild(footer);

    document.body.parentElement.lang = i18next.language;

    // Set up event listeners
    setupEventListeners();

    // Trigger initial evaluation
    Evaluate();
});

// Set up event listeners using event delegation (only for repetitive handlers)
function setupEventListeners() {
    const userDiv = document.getElementById('user');

    userDiv.addEventListener('click', (e) => {
        // Examples toggle
        if (e.target.closest('#examples-toggle')) {
            e.preventDefault();
            toggle('user_examples');
        }
        // Example links (60+ handlers → 1 listener)
        else if (e.target.closest('.example-link')) {
            e.preventDefault();
            EX(e.target.closest('.example-link'));
        }
        // Time buttons
        else if (e.target.closest('.time-btn')) {
            const btn = e.target.closest('.time-btn');
            if (btn.classList.contains('time-btn-now')) {
                Evaluate(0, true);
            } else {
                Evaluate(parseInt(btn.dataset.offset, 10));
            }
        }
        // JOSM link
        else if (e.target.closest('.josm-link')) {
            e.preventDefault();
            const link = e.target.closest('.josm-link');
            josm(link.dataset.url);
        }
        // Time jump links (from opening_hours_table.js)
        else if (e.target.closest('.time-jump')) {
            e.preventDefault();
            const link = e.target.closest('.time-jump');
            Evaluate(parseInt(link.dataset.offset, 10), false);
        }
        // Prettified value input
        else if (e.target.closest('.prettified-value')) {
            const input = e.target.closest('.prettified-value');
            newValue(input.dataset.value);
        }
    });

    // Permalink timestamp checkbox
    document.getElementById('permalink-include-timestamp').addEventListener('change', updatePermalinkHref);
}
