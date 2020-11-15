toastr.options.closeButton = true;
toastr.options.progressBar = true;

function clear_cookie(url, name) {
    return new Promise(function(resolve, reject) {
        try {
        	chrome.cookies.remove({
        		url: url,
        		name: name
        	}, () => {
        		resolve();
        	});
        } catch(e) {
            reject(e);
        }
    });
}

function get_all_cookies() {
    return new Promise(function(resolve, reject) {
        try {
        	chrome.cookies.getAll({}, (cookies) => {
        		resolve(cookies);
        	});
        } catch(e) {
            reject(e);
        }
    });
}

function get_url_from_cookie_data(cookie_data) {
	const protocol = cookie_data.secure ? 'https' : 'http';
	var host = cookie_data.domain;
	if(host.startsWith('.')) {
		host = host.substring(1);
	}

	return `${protocol}://${host}${cookie_data.path}`;
}

const app = new Vue({
    el: '#app',
    data: {
        loading: false,
        page: 'config',
        config: {
            url: '',
            username: '',
            password: '',
            sync_button_disabled: true,
        }
    },
    methods: {
        check_login_credentials: async function(event) {
            // Save valid config to localStorage
            save_bot_config(
                this.config.url,
                this.config.username,
                this.config.password
            );

            if (this.config.url === '' || this.config_message !== null) {
                return
            }

            const url_object = new URL(this.config.url);

            const check_url = `${url_object.origin}/api/v1/verify-proxy-credentials`;

            try {
                var response = await api_request(
                    'POST',
                    check_url, {
                        username: this.config.username,
                        password: this.config.password,
                    }
                );
                this.config.sync_button_disabled = false;
            } catch (e) {
                this.config.sync_button_disabled = true;
                console.error(`Error while trying to check credentials against '${check_url}'`);
                console.error(e);
            }
        },
        sync_cookies_to_browser: async function(event) {
        	const url_object = new URL(this.config.url);
            const check_url = `${url_object.origin}/api/v1/get-bot-browser-cookies`;
            const response = await api_request(
                'POST',
                check_url, {
                    username: this.config.username,
                    password: this.config.password,
                }
            );

            const attrs_to_copy = [
				'domain',
				'expirationDate',
				'httpOnly',
				'name',
				'path',
				'sameSite',
				'secure',
				'value'
            ];

            const browser_cookie_array = response.cookies.map(cookie => {
            	let cookie_data = {};
            	attrs_to_copy.map(attribute_name => {
            		// Firefox and Chrome compatibility bullshit
            		if(attribute_name === 'sameSite' && cookie[attribute_name] === 'unspecified') {
            			cookie_data[attribute_name] = 'lax';
            			return
            		}

            		if(attribute_name in cookie) {
            			cookie_data[attribute_name] = cookie[attribute_name];
            		}
            	});

            	// For some reason we have to generate this even though
            	// we already provide a domain, path, and secure param...
            	const url = get_url_from_cookie_data(cookie_data);
            	cookie_data.url = url;

            	return cookie_data;
            });

            // Clear existing cookies
            // clear_cookie(url, name)
            const existing_cookies = await get_all_cookies();
            const cookie_clear_promises = existing_cookies.map(async existing_cookie => {
            	const url = get_url_from_cookie_data(existing_cookie);
            	return clear_cookie(url, existing_cookie.name);
            });
            await Promise.all(cookie_clear_promises);

            browser_cookie_array.map(cookie => {
            	chrome.cookies.set(cookie, () => {});
            });

            toastr.success('Cookies synced successfully.');
        }
    },
    computed: {
        config_message: function() {
            if (this.config.url === '') {
                return null;
            }

            if (!this.config.url.startsWith('http://') && !this.config.url.startsWith('https://')) {
            	this.config.sync_button_disabled = true;
                return 'Web Panel URL must start with either http:// or https://';
            }

            if (!this.config.username.startsWith('botuser')) {
            	this.config.sync_button_disabled = true;
                return 'Bot username should start with "botuser"';
            }

            if (this.config.password === '') {
            	this.config.sync_button_disabled = true;
                return 'Bot password must not be empty';
            }

            return null;
        },
    },
    watch: {
        config: {
            handler(val) {
                this.check_login_credentials();
            },
            deep: true
        }
    },
    mounted: function() {
        this.$nextTick(function() {
            load_bot_config();
            this.check_login_credentials();
        });
    }
});

function save_bot_config(url, username, password) {
    localStorage.setItem('BOT_CREDENTIALS', JSON.stringify({
        'url': url,
        'username': username,
        'password': password
    }));
}

function load_bot_config() {
    const raw_localstorage_data = localStorage.getItem('BOT_CREDENTIALS');

    if (!raw_localstorage_data) {
        return;
    }

    const bot_credentials = JSON.parse(localStorage.getItem('BOT_CREDENTIALS'));

    app.config.url = bot_credentials.url;
    app.config.username = bot_credentials.username;
    app.config.password = bot_credentials.password;
}

$(function() {
    $("[rel='tooltip']").tooltip();
});

async function api_request(method, url, body) {
    var request_options = {
        method: method,
        credentials: 'include',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
        },
        redirect: 'follow'
    };

    if (body) {
        request_options.body = JSON.stringify(body);
    }

    window.app.loading = true;

    try {
        var response = await fetch(
            `${url}`,
            request_options
        );
    } catch (e) {
        window.app.loading = false;
        throw e;
    }
    window.app.loading = false;

    const response_body = await response.json();

    if (!response_body.success) {
        return Promise.reject({
            'error': response_body.error,
            'code': response_body.code
        })
    }

    return response_body.result;
}