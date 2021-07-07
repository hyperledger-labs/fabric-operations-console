/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/
//------------------------------------------------------------
// Integration Test Client-side JavaScript
//------------------------------------------------------------

//------------------------------------------------------------
// Globals
//------------------------------------------------------------
const total_number_of_tests = 13;                               // used through the script. define it once here and use it everywhere

//------------------------------------------------------------
// Setup the page
//------------------------------------------------------------
/*
    Runs when the page loads.
    - pre-checks all checkboxes
    - disables all checkboxes except "run_all"
    - adds event listeners to each checkbox along with the data each needs
    - adds event listener to form's submit button
 */
document.addEventListener('DOMContentLoaded', () => {
    const form_elements = document.getElementById('test_input_form').elements;
    const form = document.getElementById('test_input_form');
    form.addEventListener('submit', handle_submit);
    for (const element in form_elements) {
        const current_element = form_elements[element];
        if (current_element.type === 'checkbox') {
            current_element.checked = true;
            current_element.addEventListener('change', () => {
                manage_checkbox_change(current_element);
            });
        }
        if (current_element.id === 'download_logs_button') {
            current_element.disabled = true;
        }
    }
}, false);


//------------------------------------------------------------
// Event handlers
//------------------------------------------------------------
const manage_checkbox_change = (current_element) => {
    if (current_element.id === 'run_all') {                             // manages checking the "run all" box - will either select or deselect all other boxes
        if (current_element.checked) {
            select_or_deselect_boxes(true);
        } else {
            select_or_deselect_boxes(false);
        }
    } else {
        const run_all = document.getElementById('run_all');
        const num_checked = get_number_of_checked_boxes();
        run_all.checked = num_checked === total_number_of_tests;        // uncheck "run_all" if any other box is checked and check it if all are selected
    }
};

const select_or_deselect_boxes = (value) => {
    const form_elements = document.getElementById('test_input_form').elements;
    for (const element in form_elements) {
        const current_element = form_elements[element];
        if (current_element.type === 'checkbox') {
            current_element.checked = value;
        }
    }
};

const get_number_of_checked_boxes = () => {
    const form_elements = document.getElementById('test_input_form').elements;
    let num_checked = 0;
    for (const element in form_elements) {
        const current_element = form_elements[element];
        if (current_element.type === 'checkbox' && current_element.checked && current_element.id !== 'run_all') {
            num_checked++
        }
    }
    return num_checked;
};

//------------------------------------------------------------
// Handle submit button being pushed
//------------------------------------------------------------
const handle_submit = event => {
    // Stop the form from submitting since we’re handling that with AJAX.
    event.preventDefault();

    const url = event.currentTarget ? event.currentTarget.baseURI: null;
    build_data_object(url, (data) => {
        if (data.bypassed_tests.length === total_number_of_tests) {
            alert('you need to run at least one test. try again');
        } else {
            make_ajax_call(data);
        }
    });
};

const build_data_object = (url, cb) => {
    const data = {
        bypassed_tests: [],
        token: null,
        print_docs: null,
        url: url
    };
    const form_elements = document.getElementById('test_input_form').elements;
    const form_elements_object = objectify_form_elements();                                 // easy to make and useful for any direct lookups
    const use_api_key = form_elements_object.api_key.checked;
    let force_return_after_ajax = false;
    for (const element in form_elements) {
        const current_element = form_elements[element];
        if (current_element.type === 'checkbox' && !current_element.checked) {
            // if not "run all" then create objects for any checkboxes that are NOT checked and send those to the server
            if (current_element.id !== 'run_all') {
                data.bypassed_tests.push(current_element.id);
            }
        } else if (current_element.type === 'textarea') {
            data.token = current_element.value;
            if (use_api_key) {                         // need to get a token - user hopefully passed in an api-key
                force_return_after_ajax = true;
                const get_token_settings = {
                    unimportant_string: data.token,
                    url: create_get_token_url(url)
                };
                get_token(get_token_settings, (token) => {
                    data.token = token;
                    return cb(data);
                });
            }
        } else if (current_element.type === 'radio' && current_element.checked) {
            if (current_element.id === 'verbose') {
                data.print_docs = 'yes';
            } else {
                data.print_docs = 'no';
            }
        }
    }
    if (!force_return_after_ajax) {
        return cb(data);
    }
};

const objectify_form_elements = () => {
    const form_elements = document.getElementById('test_input_form').elements;
    const form_elements_object = {};
    for (const element in form_elements) {
        const current_element = form_elements[element];
        form_elements_object[current_element.id] = current_element;
    }
    return form_elements_object;
};

const make_ajax_call = (data) => {
    const token_textarea = document.getElementById('token_input_text_area');
    data.token = !data.token ? token_textarea.value: data.token;
    const xhr = new XMLHttpRequest();
    const url = data.url;                                               // e.g., 'http://127.0.0.1:3000/ak/api/v1/integration_test';
    xhr.open('POST', url, true);

    //Send the proper header information along with the request
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + data.token);
    xhr.send(JSON.stringify(data));
    xhr.onload = () => {
        try {
            const response = JSON.parse(xhr.response);
            if (response && response.statusCode === 200) {
                const download_button = document.getElementById('download_logs_button');
                download_button.disabled = false;
                download_button.addEventListener('click', () => {
                    download_file(response.log_file_contents, 'integration_test');
                });
            } else {
                console.log('something terrible happened ', xhr.responseText);
            }
        } catch (e) {
            console.log('something terrible happened ', e);
        }
    };

    // Function to download data to a file
    const download_file = (filename, text) => {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(filename));
        element.setAttribute('download', text);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    };
    token_textarea.value = '';
};

const create_get_token_url = (url) => {
    if (url.indexOf('integration_test') > -1) {
        url = url.replace('integration_test', 'get-token');
    }
    return url;
};

const get_token = (settings, cb) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', settings.url, true);

    //Send the proper header information along with the request
    xhr.setRequestHeader('Content', 'application/json');
    xhr.send(JSON.stringify(settings));
    xhr.onprogress = () => {
        return cb(JSON.parse(xhr.responseText));
    };
};
