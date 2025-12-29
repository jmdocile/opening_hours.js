/* global default_lat, default_lon, i18next, mapCountryToLanguage, opening_hours, OpeningHoursTable, specification_url, YoHoursChecker */

/* Constants {{{ */
const nominatim_api_url = 'https://nominatim.openstreetmap.org/reverse';
// let nominatim_api_url = 'https://open.mapquestapi.com/nominatim/v1/reverse.php';

const evaluation_tool_colors = {
    'ok': '#ADFF2F',
    'warn': '#FFA500',
    'error': '#DEB887',
};

const OSM_MAX_VALUE_LENGTH = 255;
/* }}} */

// load nominatim_data in JOSM {{{
// Using a different way to load stuff in JOSM than https://github.com/vibrog/OpenLinkMap/
// prevent josm remote plugin of showing message
// eslint-disable-next-line no-unused-vars
function josm(url_param) {
    fetch(`http://localhost:8111/${url_param}`)
        .then(response => {
            if (!response.ok) {
                alert(i18next.t('texts.JOSM remote conn error'));
            }
        })
        .catch(() => {
            alert(i18next.t('texts.JOSM remote conn error'));
        });
}
// }}}

// add calculation for calendar week to date {{{
// eslint-disable-next-line no-unused-vars
function dateAtWeek(date, week) {
    const minutes_in_day = 60 * 24;
    const msec_in_day    = 1000 * 60 * minutes_in_day;
    const msec_in_week   = msec_in_day * 7;

    const tmpdate = new Date(date.getFullYear(), 0, 1);
    tmpdate.setDate(1 - (tmpdate.getDay() + 6) % 7 + week * 7); // start of week n where week starts on Monday
    return Math.floor((date - tmpdate) / msec_in_week);
}
// }}}

/*
 * The names of countries and states are localized in OSM and opening_hours.js
 * (holidays) so we need to get the localized names from Nominatim as well.
 */
function reverseGeocodeLocation(query, guessed_language_for_location, on_success, on_error) {
    if (typeof on_error === 'undefined') {
        on_error = function() { };
    }

    if (query === '&lat=48.7769&lon=9.1844') {
        /* Cached response to avoid two queries for each usage of the tool. */
        return on_success({'place_id':'159221147','licence':'Data © OpenStreetMap contributors, ODbL 1.0. https://www.openstreetmap.org/copyright','osm_type':'relation','osm_id':'62611','lat':'48.6296972','lon':'9.1949534','display_name':'Baden-Württemberg, Deutschland','address':{'state':'Baden-Württemberg','country':'Deutschland','country_code':'de'},'boundingbox':['47.5324787','49.7912941','7.5117461','10.4955731']});
    }

    const nominatim_api_url_template_query = nominatim_api_url
        + '?format=json'
        + query
        + '&zoom=5'
        + '&addressdetails=1'
        + '&email=ypid23@aol.de';

    let nominatim_api_url_query = nominatim_api_url_template_query;
    if (typeof accept_lanaguage === 'string') {
        nominatim_api_url_query += '&accept-language=' + guessed_language_for_location;
    }

    fetch(nominatim_api_url_query)
        .then(response => response.json())
        .then(nominatim_data => {
            // console.log(JSON.stringify(nominatim_data, null, '\t'));
            if (nominatim_data.address.country_code === guessed_language_for_location) {
                on_success(nominatim_data);
            } else {
                nominatim_api_url_query += `&accept-language=${mapCountryToLanguage(nominatim_data.address.country_code)}`;
                fetch(nominatim_api_url_query)
                    .then(response => response.json())
                    .then(nominatim_data => on_success(nominatim_data))
                    .catch(on_error);
            }
        })
        .catch(on_error);
}

/* JS for toggling examples on and off {{{ */
// eslint-disable-next-line no-unused-vars
function toggle(control){
    const elem = document.getElementById(control);

    if (elem.style.display === 'none') {
        elem.style.display = 'block';
    } else {
        elem.style.display = 'none';
    }
}
/* }}} */

// eslint-disable-next-line no-unused-vars
function copyToClipboard(text) {
    window.prompt('Copy to clipboard: Ctrl+C, Enter', text);
}

let lat, lon, string_lat, string_lon, nominatim;
let date;

/* Helper functions for Evaluate {{{ */

function getFragmentIdentifier(selectorType) {
    switch(selectorType) {
        case '24/7':
            return 'selector_sequence';
        case 'state':
            return 'section:rule_modifier';
        case 'comment':
            return 'comment';
        default:
            return `selector:${selectorType}`;
    }
}

function generateRuleSeparatorHTML(ruleSeparator) {
    return `<span title="${i18next.t('texts.rule separator ' + ruleSeparator)}" class="rule_separator">` +
           `<a target="_blank" class="specification" href="${specification_url}#section:rule_separators">${ruleSeparator}</a></span><br>`;
}

function generateSelectorHTML(selectorType, selectorValue) {
    const fragmentIdentifier = getFragmentIdentifier(selectorType);
    const translationKey = selectorType.match(/(?:state|comment)/) ? 'modifier' : 'selector';

    return `<span title="${i18next.t(`words.${translationKey}`, { name: selectorType })}" class="${selectorType}">` +
           `<a target="_blank" class="specification" href="${specification_url}#${fragmentIdentifier}">${selectorValue}</a></span>`;
}

function generateValueExplanation(prettifiedValueArray) {
    const parts = [
        `${i18next.t('texts.prettified value for displaying')}:<br />`,
        '<p class="value_explanation">'
    ];

    for (let nrule = 0; nrule < prettifiedValueArray[0].length; nrule++) {
        if (nrule !== 0) {
            const ruleSeparator = prettifiedValueArray[1][nrule][1]
                ? ' ||'
                : (prettifiedValueArray[1][nrule][0][0][1] === 'rule separator' ? ',' : ';');

            parts.push(generateRuleSeparatorHTML(ruleSeparator));
        }

        parts.push('<span class="one_rule">');

        const selectors = prettifiedValueArray[0][nrule];
        for (let nselector = 0; nselector < selectors.length; nselector++) {
            const selectorType = selectors[nselector][0][2];
            const selectorValue = selectors[nselector][1];

            parts.push(generateSelectorHTML(selectorType, selectorValue));

            if (nselector + 1 < selectors.length) {
                parts.push(' ');
            }
        }

        parts.push('</span>');
    }

    parts.push('</p></div>');
    return parts.join('');
}

function generateResultsHTML() {
    return `
        <div class="matching-rule-card">
            <div class="status-label">${i18next.t('texts.MatchingRule')}</div>
            <div class="matching-rule-value" id="matching-rule-display"></div>
        </div>
    `;
}

function handleDiffComparison(oh, diffValue, mode, valueExplanation) {
    const diffValueElement = document.getElementById('diff_value');

    if (diffValue.length === 0) {
        diffValueElement.style.backgroundColor = '';
        return valueExplanation;
    }

    let isEqualTo;
    try {
        isEqualTo = oh.isEqualTo(new opening_hours(diffValue, nominatim, {
            'mode': mode,
            'warnings_severity': 7,
            'locale': i18next.language
        }));
    } catch {
        diffValueElement.style.backgroundColor = evaluation_tool_colors.error;
        return valueExplanation;
    }

    if (typeof isEqualTo !== 'object') {
        return valueExplanation;
    }

    if (isEqualTo[0]) {
        diffValueElement.style.backgroundColor = evaluation_tool_colors.ok;
    } else {
        diffValueElement.style.backgroundColor = evaluation_tool_colors.warn;
        const humanReadableOutput = structuredClone(isEqualTo[1]);

        if (typeof humanReadableOutput.deviation_for_time === 'object') {
            humanReadableOutput.deviation_for_time = {};
            for (const timeCode in isEqualTo[1].deviation_for_time) {
                const timeString = new Date(parseInt(timeCode)).toLocaleString();
                humanReadableOutput.deviation_for_time[timeString] =
                    isEqualTo[1].deviation_for_time[timeCode];
            }
        }

        return `${JSON.stringify(humanReadableOutput, null, '    ')}<br>${valueExplanation}`;
    }

    return valueExplanation;
}

function generateJosmHTML(value) {
    const josmUrl = 'import?url=' + encodeURIComponent(
        `https://overpass-api.de/api/xapi_meta?*[opening_hours=${value}]`
    );

    return `<div class="action-description">${i18next.t('texts.load osm objects')}</div>` +
           `<div><a href="#" class="josm-link" data-url="${josmUrl}">JOSM</a></div>`;
}

function generateYoHoursHTML(value, crashed) {
    if (!crashed && YoHoursChecker.canRead(value)) {
        const yohoursUrl = `https://projets.pavie.info/yohours/?oh=${value}`;
        return `<div class="action-description">${i18next.t('texts.yohours description')}</div>` +
               `<div><a href="${yohoursUrl}" target="_blank">YoHours</a></div>`;
    }

    return `<div class="action-description">${i18next.t('texts.yohours description')}</div>` +
           `<div class="yohours-warning">${i18next.t('texts.yohours incompatible')}</div>`;
}

function generatePrettifiedValueHTML(prettified) {
    const escapedValue = prettified.replace(/"/g, '&quot;');

    // Build translation with placeholder for the link
    const translatedText = i18next.t('texts.prettified value', { copyFunc: '__COPY_LINK__' });
    const linkHtml = `<a href="#" class="copy-prettified-value" data-value="${escapedValue}">`;
    const finalText = translatedText.replace('<a href="__COPY_LINK__">', linkHtml);

    const copyTooltip = i18next.t('texts.copy');

    return `<div class="prettified-value-section">
        <p>${finalText}:</p>
        <div class="prettified-value-container">
            <code class="prettified-value-display" data-value="${escapedValue}">${prettified}</code>
            <button type="button" class="copy-btn copy-prettified-btn" data-value="${escapedValue}" title="${copyTooltip}">📋</button>
        </div>
    </div>`;
}

function generateWarningsHTML(warnings) {
    if (warnings.length === 0) return '';

    return `<div class="warning">${i18next.t('texts.filter.error')}` +
           `<div class="warning_error_message">${warnings.join('\n')}</div></div>`;
}

function generateValueTooLongHTML(prettified, value) {
    if (prettified.length <= OSM_MAX_VALUE_LENGTH) return '';

    return `<div class="warning">${i18next.t('texts.filter.error')}` +
           `<div class="warning_error_message">${i18next.t('texts.value to long for osm', {
               pretLength: prettified.length,
               valLength: value.length,
               maxLength: OSM_MAX_VALUE_LENGTH
           })}</div></div>`;
}

/* }}} */

function Evaluate (offset = 0, reset) {
    if (document.forms.check.elements['lat'].value !== string_lat || document.forms.check.elements['lon'].value !== string_lon) {
        string_lat = document.forms.check.elements['lat'].value;
        string_lon = document.forms.check.elements['lon'].value;
        lat = parseFloat(string_lat);
        lon = parseFloat(string_lon);
        if (typeof lat !== 'number' || typeof lon !== 'number') {
            if (typeof lat !== 'number') {
                document.forms.check.elements['lat'].value = default_lat;
            }
            if (typeof lon !== 'number') {
                document.forms.check.elements['lon'].value = default_lon;
            }
            console.log('Please enter numbers for latitude and longitude.');
            return;
        }
        reverseGeocodeLocation(
            `&lat=${lat}&lon=${lon}`,
            mapCountryToLanguage(i18next.language),
            function(nominatim_data) {
                nominatim = nominatim_data;
                document.forms.check.elements['cc'].value    = nominatim.address.country_code;
                document.forms.check.elements['state'].value = nominatim.address.state;
                Evaluate();
            },
            function() {
                /* Set fallback Nominatim answer to allow using the evaluation tool even without Nominatim. */
                alert('Reverse geocoding of the coordinates using Nominatim was not successful. The evaluation of features of the opening_hours specification which depend this information will be unreliable. Otherwise, this tool will work as expected using a fallback answer. You might want to check your browser settings to fix this.');
                nominatim = {'place_id':'44651229','licence':'Data \u00a9 OpenStreetMap contributors, ODbL 1.0. https://www.openstreetmap.org/copyright','osm_type':'way','osm_id':'36248375','lat':'49.5400039','lon':'9.7937133','display_name':'K 2847, Lauda-K\u00f6nigshofen, Main-Tauber-Kreis, Regierungsbezirk Stuttgart, Baden-W\u00fcrttemberg, Germany, European Union','address':{'road':'K 2847','city':'Lauda-K\u00f6nigshofen','county':'Main-Tauber-Kreis','state_district':'Regierungsbezirk Stuttgart','state':'Baden-W\u00fcrttemberg','country':'Germany','country_code':'de','continent':'European Union'}};
                document.forms.check.elements['cc'].value    = nominatim.address.country_code;
                document.forms.check.elements['state'].value = nominatim.address.state;
                Evaluate();
            }
        );
        return;
    }

    date = reset
        ? new Date()
        : new Date(
            window.currentDateTime.year,
            window.currentDateTime.month,
            window.currentDateTime.day,
            window.currentDateTime.hour,
            window.currentDateTime.minute,
            offset
        );

    // eslint-disable-next-line no-unused-vars
    function u2 (v) { return v>=0 && v<10 ? `0${v}` : v; }

    // Update global state
    window.currentDateTime = {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes()
    };

    // Update time button labels with current values
    if (typeof updateTimeButtonLabels === 'function') {
        // eslint-disable-next-line no-undef
        updateTimeButtonLabels(date);
    }

    // Cache DOM elements
    const showTimeTable = document.getElementById('show_time_table');
    const showWarningsOrErrors = document.getElementById('show_warnings_or_errors');
    const showResults = document.getElementById('show_results');
    const actionJosm = document.getElementById('action-josm');
    const actionYoHours = document.getElementById('action-yohours');

    showWarningsOrErrors.innerHTML = '';

    // Parse opening hours value
    let crashed = false;
    const value = document.forms.check.elements['expression'].value;
    const diffValue = document.forms.check.elements['diff_value'].value;
    const mode = parseInt(document.getElementById('mode').selectedIndex);
    let oh;
    let it;

    try {
        oh = new opening_hours(value, nominatim, {
            'mode': mode,
            'warnings_severity': 7,
            'locale': i18next.language
        });
        it = oh.getIterator(date);
    } catch (err) {
        crashed = err;
        showWarningsOrErrors.innerHTML =
            `<div class="error">${i18next.t('texts.filter.error')}` +
            `<div class="warning_error_message">${crashed}</div></div>`;
        showTimeTable.innerHTML = '';
        showResults.innerHTML = '';
    }

    // Populate action links
    actionJosm.innerHTML = generateJosmHTML(value);
    actionYoHours.innerHTML = generateYoHoursHTML(value, crashed);

    if (!crashed) {
        const prettified = oh.prettifyValue({});
        const prettifiedValueArray = oh.prettifyValue({
            get_internals: true,
        });

        // Generate and display results
        showResults.innerHTML = generateResultsHTML();

        // Generate value explanation
        let valueExplanation = generateValueExplanation(prettifiedValueArray);

        // Handle diff comparison
        valueExplanation = handleDiffComparison(oh, diffValue, mode, valueExplanation);

        // Display value explanation
        showWarningsOrErrors.innerHTML = valueExplanation;

        // Update matching rule
        const ruleIndex = it.getMatchingRule();
        const ruleDisplay = document.getElementById('matching-rule-display');
        if (ruleDisplay) {
            ruleDisplay.textContent = typeof ruleIndex === 'undefined' ? i18next.t('words.none') : oh.prettifyValue({ 'rule_index': ruleIndex });
        }

        // Show prettified value if different from input
        if (prettified !== value) {
            showWarningsOrErrors.innerHTML = generatePrettifiedValueHTML(prettified);
        }

        // Append warnings if any
        const warnings = oh.getWarnings();
        showWarningsOrErrors.innerHTML += generateWarningsHTML(warnings);

        // Check value length
        showWarningsOrErrors.innerHTML += generateValueTooLongHTML(prettified, value);

        // Generate time table
        showTimeTable.innerHTML = OpeningHoursTable.drawTableAndComments(oh, it, date);
    }

    updatePermalinkHref();
}

// eslint-disable-next-line no-unused-vars
function EX (element) {
    newValue(element.innerHTML);
    return false;
}

function newValue(value) {
    document.forms.check.elements['expression'].value = value;
    Evaluate();
}

function updatePermalinkHref() {
    const params = new URLSearchParams({
        EXP: document.getElementById('expression').value,
        lat: document.getElementById('lat').value,
        lon: document.getElementById('lon').value,
        mode: document.getElementById('mode').selectedIndex
    });

    const diffValue = document.getElementById('diff_value').value;
    if (diffValue !== '') {
        params.set('diff_value', diffValue);
    }

    const baseUrl = `${location.origin}${location.pathname}`;

    // Permalink with timestamp
    const paramsWithTimestamp = new URLSearchParams(params);
    paramsWithTimestamp.set('DATE', date.getTime());
    document.getElementById('permalink-link-with-timestamp').href = `${baseUrl}?${paramsWithTimestamp}`;

    // Permalink without timestamp
    document.getElementById('permalink-link-without-timestamp').href = `${baseUrl}?${params}`;
}

// eslint-disable-next-line no-unused-vars
function setCurrentPosition() {
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(onPositionUpdate);
    }
}

function onPositionUpdate(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    document.getElementById('lat').value = lat;
    document.getElementById('lon').value = lng;
    Evaluate();
    console.log('Current position: ' + lat + ' ' + lng);
}
window.onload = function () {
    const prmarr = window.location.search.replace( '?', '' ).split('&');
    const params = {};
    let customCoords = false;

    for ( let i = 0; i < prmarr.length; i++) {
        const tmparr = prmarr[i].split('=');
        params[tmparr[0]] = tmparr[1];
    }
    if (typeof params['EXP'] !== 'undefined') {
        document.forms.check.elements['expression'].value = decodeURIComponent(params['EXP']);
    }
    if (typeof params['diff_value'] !== 'undefined') {
        document.forms.check.elements['diff_value'].value = decodeURIComponent(params['diff_value']);
    }
    if (typeof params['lat'] !== 'undefined') {
        document.forms.check.elements['lat'].value = decodeURIComponent(params['lat']);
        customCoords = true;
    }
    if (typeof params['lon'] !== 'undefined') {
        document.forms.check.elements['lon'].value = decodeURIComponent(params['lon']);
        customCoords = true;
    }
    if (typeof params['mode'] !== 'undefined') {
        document.forms.check.elements['mode'].value = decodeURIComponent(params['mode']);
    }
    if (typeof params['DATE'] !== 'undefined') {
        try {
            const loadedDate = new Date(parseInt(params['DATE']));
            window.currentDateTime = {
                year: loadedDate.getFullYear(),
                month: loadedDate.getMonth(),
                day: loadedDate.getDate(),
                hour: loadedDate.getHours(),
                minute: loadedDate.getMinutes()
            };
            Evaluate(0, false);
        } catch (err) {
            console.error(err);
            Evaluate(0, true);
        }
    } else {
        Evaluate(0, true);
    }
    if (navigator.geolocation && !customCoords) {
        navigator.geolocation.getCurrentPosition(onPositionUpdate);
    };
};
/* }}} */
