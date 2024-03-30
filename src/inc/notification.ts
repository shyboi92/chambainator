
import {WebSocketMessages} from './constants.js';
import db from './database.js';
import {notifyWSUserClients} from './server-ws.js';


/**
 * Creates a notification.
 * @param content 
 * @param actionUrl 
 * @param targetUsers IDs of the target users.
 */
async function createNotification(content: string, targetUsers: number[], actionUrl: string | null): Promise<boolean> {
	if (targetUsers.length == 0) return false;

	await db.query('start transaction');

	try {
		const notificationInsert = await db.insert('notification', {
			content,
			action_url: actionUrl
		});

		await db.insert('notification_user', targetUsers.map(userId => ({
			notification: notificationInsert.insertId,
			user: userId
		})));

		await db.query('commit');

		notifyWSUserClients(targetUsers, WebSocketMessages.NEW_NOTIFICATION);

		return true;

	} catch(err) {
		await db.query('rollback');
		return false;
	}
}


export default {
	createNotification,
}