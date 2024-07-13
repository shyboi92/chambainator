import { Connection, createConnection } from 'mysql2';
import moment from 'moment';



let conn: Connection | null = null;
let connectionPromise: Promise<void> | null = null;


const MYSQL_ERRCODES__PROTOCOL_CONNECTION_LOST = ['PROTOCOL_CONNECTION_LOST', 4031];


function connect() {
	if (conn != null) return;

	if (connectionPromise) return connectionPromise;

	let __conn = createConnection({
		host: process.env.DB_HOST,
		port: Number(process.env.DB_PORT),
		user: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_SCHEMA,
		insecureAuth: true
	});

	__conn.on('error', err => {
		if ('code' in err && MYSQL_ERRCODES__PROTOCOL_CONNECTION_LOST.includes(err.code as string | number)) {
			// set to null to reconnect in the next query
			console.error('Database connection lost');
			conn = null;
		} else throw err;
	});

	connectionPromise = new Promise<void>((resolve, reject) => {
		__conn.connect(err => {
			connectionPromise = null;
			
			if (err) reject(err);
			else {
				conn = __conn;
				resolve();
			}
		});
	});
	return connectionPromise;
}


function toSqlDate(date: Date): string {
	return moment(date).format('YYYY-MM-DD');
}

function toSqlDatetime(date: Date): string {
	return moment(date).format('YYYY-MM-DD HH:mm:ss');
}

function query(sql: string, args?: any[]) {
	if (conn == null) {
		console.log('Database connection not ready, connecting...');
		return connect()?.then(result => {
			return query(sql, args);
		});
	}

	return new Promise((resolve, reject) => {
		conn?.query(sql, args, (err, rows) => {
			if (err) return reject(err);
			resolve(rows);
		});
	}).catch(err => {
		console.error(err);
	});
}


async function queryValue(sql: string, args?: any[]) {
	const rows = await query(sql, args);
	return rows.length == 0 ? null : Object.values(rows[0])[0];
}


async function queryRow(sql: string, args?: any[]) {
	const rows = await query(sql, args);
	return (!rows || rows.length == 0) ? null : rows[0];
}

async function queryColumn(sql: string, args?: any[]) {
	const rows = await query(sql, args);
	return rows.map(r => Object.values(r)[0]);
}

async function insert(tableName: string, params: object | object[]) {
	if (!Array.isArray(params)) {
		const keys = Object.keys(params).map(e => '`' + e + '`');
		return query(`insert into ${tableName}(${keys.join(',')}) values(${keys.map(e => '?').join(',')})`, Object.values(params));
	}

	const keys = Object.keys(params[0]).map(e => '`' + e + '`');
	const placeholders = `(${keys.map(e => '?').join(',')})`;
	return query(`insert into ${tableName}(${keys.join(',')}) values ${params.map(e => placeholders).join(',')}`,
		params.flatMap(e => Object.values(e)));
}

async function updateRow(tableName: string, id: number, params: object) {
	const keys = Object.keys(params);
	const placeholders = keys.map(e => `\`${e}\` = ?`).join(',');
	return query(`update ${tableName} set ${placeholders} where id = ?`,
		[...Object.values(params), id]);
}


async function transaction(executor: (reject: (returnValue: any) => any) => Promise<any>): Promise<any> {
	await query('start transaction');

	try {
		const ret = await executor(
			async (returnValue: any): Promise<any> => {
				throw { type: 'my-error', returnValue };
			}
		);

		await query('commit');
		return ret;

	} catch(err) {
		await query('rollback');
		return (typeof err === 'object' && err.type === 'my-error') ? err.returnValue : null;
	}
}


export default {
	connect,
	toSqlDate,
	toSqlDatetime,
	query,
	queryValue,
	queryRow,
	queryColumn,
	insert,
	updateRow,
	transaction
};