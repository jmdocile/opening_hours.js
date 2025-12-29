/* global default_lat, default_lon, i18next, mapCountryToLanguage, opening_hours, OpeningHoursTable, specification_url, YoHoursChecker */

/* Constants {{{ */
const nominatim_api_url = 'https://nominatim.openstreetmap.org/reverse';
// let nominatim_api_url = 'https://open.mapquestapi.com/nominatim/v1/reverse.php';

const evaluation_tool_colors = {
    'ok': '#ADFF2F',
    'warn': '#FFA500',
    'error': '#DEB887',
};
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

    const show_time_table         = document.getElementById('show_time_table');
    const show_warnings_or_errors = document.getElementById('show_warnings_or_errors');
    const show_results            = document.getElementById('show_results');

    show_warnings_or_errors.innerHTML = '';

    let crashed = false;
    const value = document.forms.check.elements['expression'].value;
    const diff_value = document.forms.check.elements['diff_value'].value;
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
        show_warnings_or_errors.innerHTML = `
            <div class="error"> ${i18next.t('texts.filter.error')}
                <div class="warning_error_message"> ${crashed} </div>
            </div>`;
        show_time_table.innerHTML = '';
        show_results.innerHTML    = '';
    }

    // Populate actions section - JOSM link
    const josmUrl = 'import?url=' + encodeURIComponent('https://overpass-api.de/api/xapi_meta?*[opening_hours='
        + document.forms.check.elements['expression'].value + ']');
    const actionJosm = document.getElementById('action-josm');
    actionJosm.innerHTML = `
        <div class="action-description">${i18next.t('texts.load osm objects')}</div>
        <div><a href="#" class="josm-link" data-url="${josmUrl}">JOSM</a></div>
    `;

    // Populate actions section - YoHours link
    const actionYoHours = document.getElementById('action-yohours');
    if (!crashed && YoHoursChecker.canRead(value)) {
        const yohoursUrl = `https://projets.pavie.info/yohours/?oh=${value}`;
        actionYoHours.innerHTML = `
            <div class="action-description">${i18next.t('texts.yohours description')}</div>
            <div><a href="${yohoursUrl}" target="_blank">YoHours</a></div>
        `;
    } else {
        actionYoHours.innerHTML = `
            <div class="action-description">${i18next.t('texts.yohours description')}</div>
            <div class="yohours-warning">${i18next.t('texts.yohours incompatible')}</div>
        `;
    }

    if (!crashed) {
        const prettified = oh.prettifyValue({});
        const prettified_value_array = oh.prettifyValue({
            // conf: { locale: i18next.language },
            get_internals: true,
        });
        show_results.innerHTML = '<p><span class="hd">' + i18next.t('words.status') + ':</span>'
            + '<input class="nostyle" size="10" name="status" readonly="readonly" />'
            + '<input class="nostyle" size="60" name="comment" readonly="readonly" />'
            + '</p>' + '<p><span class="hd">'
            + i18next.t('texts.MatchingRule') + ':</span>'
            + '<input class="nostyle w100" name="MatchingRule" readonly="readonly" />'
            + '</p>';
        const used_selectors = { };
        let value_explanation =
            i18next.t('texts.prettified value for displaying') + ':<br />'
            + '<p class="value_explanation">';
        // console.log(JSON.stringify(prettified_value_array, null, '    '));
        // console.log(JSON.stringify(prettified_value_array, null, '    '));
        for (let nrule = 0; nrule < prettified_value_array[0].length; nrule++) {
            if (nrule !== 0) {
                const rule_separator = (
                    prettified_value_array[1][nrule][1]
                        ? ' ||'
                        : (
                            prettified_value_array[1][nrule][0][0][1] === 'rule separator'
                            ? ','
                            : ';'
                        )
                );
                value_explanation +=
                    '<span title="'
                    + i18next.t('texts.rule separator ' + rule_separator) + '"'
                    + ' class="rule_separator"><a target="_blank" class="specification" href="'
                    + specification_url + '#section:rule_separators'
                    + '">' + rule_separator + '</a></span><br>';
            }
            value_explanation += '<span class="one_rule">';
            for (let nselector = 0, sl = prettified_value_array[0][nrule].length; nselector < sl; nselector++) {
                const selector_type  = prettified_value_array[0][nrule][nselector][0][2];
                const selector_value = prettified_value_array[0][nrule][nselector][1];
                let fragment_identifier;
                switch(selector_type) {
                    case '24/7':
                        fragment_identifier = 'selector_sequence';
                        break;
                    case 'state':
                        fragment_identifier = 'section:rule_modifier';
                        break;
                    case 'comment':
                        fragment_identifier = 'comment';
                        break;
                    default:
                        fragment_identifier = 'selector:' + selector_type;
                }
                value_explanation += '<span title="'
                    + i18next.t('words.' + (selector_type.match(/(?:state|comment)/) ? 'modifier' : 'selector'), { name: selector_type }) + '"'
                    + ' class="' + selector_type + '"><a target="_blank" class="specification" href="'
                    + specification_url + '#' + fragment_identifier
                    + '">' + selector_value + '</a></span>';
                if (nselector + 1 < sl)
                    value_explanation += ' ';
                used_selectors[selector_type] = true;
            }
            // console.log(value_explanation);
            value_explanation += '</span>';
        }
        value_explanation += '</p></div>';

        if (diff_value.length > 0) {
          let is_equal_to;
          try {
              is_equal_to = oh.isEqualTo(new opening_hours(diff_value, nominatim, {
                  'mode': mode,
                  'warnings_severity': 7,
                  'locale': i18next.language
              }));
          } catch {
              document.getElementById('diff_value').style.backgroundColor = evaluation_tool_colors.error;
          }
          if (typeof is_equal_to === 'object') {
            if (is_equal_to[0]) {
              document.getElementById('diff_value').style.backgroundColor = evaluation_tool_colors.ok;
            } else {
              document.getElementById('diff_value').style.backgroundColor = evaluation_tool_colors.warn;
              const human_readable_not_equal_output = structuredClone(is_equal_to[1])
              if (typeof human_readable_not_equal_output.deviation_for_time === 'object') {
                human_readable_not_equal_output.deviation_for_time = {};
                for (const time_code in is_equal_to[1].deviation_for_time) {
                  console.log(time_code);
                  const time_string = new Date(parseInt(time_code)).toLocaleString();
                  human_readable_not_equal_output.deviation_for_time[time_string] =
                    is_equal_to[1].deviation_for_time[time_code];
                }
              }
              value_explanation = JSON.stringify(human_readable_not_equal_output, null, '    ')
                + '<br>'
                + value_explanation;
            }
          }
        } else {
          // Reset background color when diff_value is empty
          document.getElementById('diff_value').style.backgroundColor = '';
        }

        show_warnings_or_errors.innerHTML = value_explanation;

        document.forms.check.elements['comment'].value = typeof it.getComment() !== 'undefined'
            ? it.getComment() : i18next.t('words.no') + ' ' + i18next.t('words.comment');
        document.forms.check.elements['status'].value = (it.getState() ? i18next.t('words.open')
            : (it.getUnknown() ? i18next.t('words.unknown') : i18next.t('words.closed')));
        const rule_index    = it.getMatchingRule();
        document.forms.check.elements['MatchingRule'].value = typeof rule_index === 'undefined'
            ? i18next.t('words.none') : oh.prettifyValue({ 'rule_index': rule_index });

        if (prettified !== value) {
            show_warnings_or_errors.innerHTML = '<p>' + i18next.t('texts.prettified value',
                { copyFunc: '#' }) + ':<br />'
                + '<input style="width: 100%" class="prettified-value" id="prettifiedValue" name="prettifiedValue" value="' + prettified.replace(/"/g, '&quot;') + '" data-value="' + prettified.replace(/"/g, '&quot;') + '" readonly /></p>';
        }

        const warnings = oh.getWarnings();
        if (warnings.length > 0) {
            show_warnings_or_errors.innerHTML += `
            <div class="warning"> ${i18next.t('texts.filter.error')}
                <div class="warning_error_message"> ${warnings.join('\n')} </div>
            </div>`;
        }

        if (prettified.length > 255) {
            show_warnings_or_errors.innerHTML += `
            <div class="warning"> ${i18next.t('texts.filter.error')}
                <div class="warning_error_message"> ${i18next.t('texts.value to long for osm',
                    { pretLength: prettified.length, valLength: value.length, maxLength: 255 })} </div>
            </div>`;
        }

        show_time_table.innerHTML = OpeningHoursTable.drawTableAndComments(oh, it);
    }

    updatePermalinkHref();
}

// eslint-disable-next-line no-unused-vars
function EX (element) {
    newValue(element.innerHTML);
    return false;
}

function newValue(value) {
    if (typeof document.forms.check.elements['prettifiedValue'] === 'object') {
        document.forms.check.elements['prettifiedValue'].focus();
        document.forms.check.elements['prettifiedValue'].focus();
    }
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
