const Sequelize = require('sequelize');
const uuid = require('uuid');

const get_secure_random_string = require('./utils.js').get_secure_random_string;
const get_hashed_password = require('./utils.js').get_hashed_password;

var sequelize = new Sequelize(
	process.env.DATABASE_NAME,
	process.env.DATABASE_USER,
	process.env.DATABASE_PASSWORD,
	{
		host: process.env.DATABASE_HOST,
		dialect: 'postgres',
		benchmark: true,
		logging: false
	},
);

const Model = Sequelize.Model;

/*
	User accounts in the web panel
*/
class Users extends Model {}
Users.init({
	id: {
		allowNull: false,
		primaryKey: true,
		type: Sequelize.UUID,
		defaultValue: uuid.v4()
	},
	// Whether or not the email address has been verified.
	// Username
	username: {
		type: Sequelize.TEXT,
		allowNull: true,
		unique: true
	},
	// Bcrypt
	password: {
		type: Sequelize.TEXT,
		allowNull: true,
	},
	// Whether the password should be changed
	// by the user when they log in.
	password_should_be_changed: {
		type: Sequelize.BOOLEAN,
		allowNull: false,
		default: false,
	}
}, {
	sequelize,
	modelName: 'users',
	indexes: [
		{
			unique: true,
			fields: ['username'],
			method: 'BTREE',
		}
	]
});

class Bots extends Model {}
Bots.init({
	id: {
		allowNull: false,
		primaryKey: true,
		type: Sequelize.UUID,
		defaultValue: uuid.v4()
	},
	// The unique ID for the specific browser
	browser_id: {
		type: Sequelize.TEXT,
		allowNull: false,
		unique: false
	},
	// Name of the browser proxy
	name: {
		type: Sequelize.TEXT,
		allowNull: false,
		unique: false,
		default: 'Untitled Proxy'
	},
	// The username to access the browser
	// HTTP proxy.
	proxy_username: {
		type: Sequelize.TEXT,
		allowNull: false,
		unique: true
	},
	// The password to access the browser
	// HTTP proxy.
	proxy_password: {
		type: Sequelize.TEXT,
		allowNull: false,
	},
	// Whether the proxy is currently online
	is_online: {
		type: Sequelize.BOOLEAN,
		allowNull: false,
		defaultValue: true
	},
	// Bot user agent
	user_agent: {
		type: Sequelize.TEXT,
		allowNull: true,
		unique: false,
		default: 'Unknown'
	},
}, {
	sequelize,
	modelName: 'bots',
	indexes: [
		{
			unique: false,
			fields: ['browser_id'],
			method: 'BTREE',
		},
		{
			unique: true,
			fields: ['proxy_username'],
			method: 'BTREE',
		},
		{
			unique: false,
			fields: ['proxy_password'],
			method: 'BTREE',
		}
	]
});

/*
	Various key/values for settings
*/
class Settings extends Model {}
Settings.init({
	id: {
		allowNull: false,
		primaryKey: true,
		type: Sequelize.UUID,
		defaultValue: uuid.v4()
	},
	// Setting name
	key: {
		type: Sequelize.TEXT,
		allowNull: true,
		unique: true
	},
	// Setting value
	value: {
		type: Sequelize.TEXT,
		allowNull: true,
	},
}, {
	sequelize,
	modelName: 'settings',
	indexes: [
		{
			unique: true,
			fields: ['key'],
			method: 'BTREE',
		}
	]
});

async function create_new_user(username, password) {
	const bcrypt_hash = await get_hashed_password(password);

	const new_user = await Users.create({
		id: uuid.v4(),
		username: username,
		password: bcrypt_hash,
		password_should_be_changed: true,
	});

	return new_user;
}

function get_default_user_created_banner(username, password) {
	return `
============================================================================

 █████╗ ████████╗████████╗███████╗███╗   ██╗████████╗██╗ ██████╗ ███╗   ██╗
██╔══██╗╚══██╔══╝╚══██╔══╝██╔════╝████╗  ██║╚══██╔══╝██║██╔═══██╗████╗  ██║
███████║   ██║      ██║   █████╗  ██╔██╗ ██║   ██║   ██║██║   ██║██╔██╗ ██║
██╔══██║   ██║      ██║   ██╔══╝  ██║╚██╗██║   ██║   ██║██║   ██║██║╚██╗██║
██║  ██║   ██║      ██║   ███████╗██║ ╚████║   ██║   ██║╚██████╔╝██║ ╚████║
╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
                                                                           
vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv

	An admin user (for the admin control panel) has been created
	with the following credentials:

	USERNAME: ${username}
	PASSWORD: ${password}

	Upon logging in to the admin control panel with these
	credentials you will be prompted to change your password.
	Please do so at your earliest convenience as this message
	is potentially being logged by Docker.

^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

 █████╗ ████████╗████████╗███████╗███╗   ██╗████████╗██╗ ██████╗ ███╗   ██╗
██╔══██╗╚══██╔══╝╚══██╔══╝██╔════╝████╗  ██║╚══██╔══╝██║██╔═══██╗████╗  ██║
███████║   ██║      ██║   █████╗  ██╔██╗ ██║   ██║   ██║██║   ██║██╔██╗ ██║
██╔══██║   ██║      ██║   ██╔══╝  ██║╚██╗██║   ██║   ██║██║   ██║██║╚██╗██║
██║  ██║   ██║      ██║   ███████╗██║ ╚████║   ██║   ██║╚██████╔╝██║ ╚████║
╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
                                                                           
============================================================================
`;
}

async function initialize_users() {
	// Check if there is at least one User account
	// that exists in the database. If not, create
	// one and write the auth information to the
	// filesystem for the admin to get.
	const existing_users = await Users.findAll();

	// If there are already users we can stop here.
	if(existing_users.length > 0) {
		return
	}

	// Since there's no users, we need to create one.
	// Otherwise there's nothing to log in with.

	// Generate cryptographically-secure random
	// password for the default user we're adding.
	const new_username = "admin";
	const new_password = get_secure_random_string(32);

	// Create user and add to database
	const new_user = await create_new_user(
		new_username,
		new_password
	);

	// Now we need to write these credentials to the
	// filesystem in a file so the user can retrieve
	// them.
	const banner_message = get_default_user_created_banner(
		new_username,
		new_password
	);

	console.log(banner_message);
}

async function initialize_configs() {
	const session_secret_key = 'SESSION_SECRET';

	// Check for existing session secret value
	const session_secret_setting = await Settings.findOne({
		where: {
			key: session_secret_key
		}
	});

	// If it exists, there's nothing else to do here.
	if(session_secret_setting) {
		return
	}

	console.log(`No session secret set, generating one now...`);

	// Since it doesn't exist, generate one.
	await Settings.create({
		id: uuid.v4(),
		key: session_secret_key,
		value: get_secure_random_string(64)
	});

	console.log(`Session secret generated successfully!`);
}

async function database_init() {
	const force = false;
	await Users.sync({ force: force });
	await Bots.sync({ force: force });
	await Settings.sync({ force: force });

	// Set up configs if they're not already set up.
	await initialize_configs();

	// Set up admin panel user if not already set up.
	await initialize_users();
}

module.exports.sequelize = sequelize;
module.exports.Users = Users;
module.exports.Bots = Bots;
module.exports.Settings = Settings;
module.exports.database_init = database_init;