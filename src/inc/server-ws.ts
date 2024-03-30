import { WebSocket, WebSocketServer } from 'ws';
import chalk from 'chalk';

import {WebSocketMessages} from './constants.js';
import * as config from './config.js';


interface WSInfo {
	ws: WebSocket;
	userId: number | null;
	expire: number;
};

const wsConnections: WSInfo[] = [];

function setConnection(inf: WSInfo) {
	const oldInfIdx = wsConnections.findIndex(e => e.ws == inf.ws);
	if (oldInfIdx == -1) wsConnections.push(inf);
	else wsConnections[oldInfIdx] = inf;
}

function findConnection(ws: WebSocket): WSInfo | undefined {
	return wsConnections.find(e => e.ws == ws);
}

function removeConnection(ws: WebSocket) {
	const idx: number = wsConnections.findIndex(e => e.ws == ws);
	if (idx >= 0) {
		wsConnections.splice(idx);
		console.log('Connection closed');
	}
}




function getWebSocketUrl(): string {
    const protocolStr = process.env.WEB_PUBLIC_HTTPS === '1' ? 'wss' : 'ws';
    const portStr = (
            (process.env.WEB_PUBLIC_HTTPS === '0' && process.env.WEB_PUBLIC_PORT === '80') ||
            (process.env.WEB_PUBLIC_HTTPS === '1' && process.env.WEB_PUBLIC_PORT === '443')
        ) ? '' : `:${process.env.WEB_PUBLIC_PORT}`;

    return `${protocolStr}://${process.env.WEB_PUBLIC_HOST}${portStr}/`;
}



function initWSServer(httpServer) {
	const wss = new WebSocketServer({ server: httpServer });

	wss.on('connection', (ws: WebSocket, req) => {
		ws.on('message', data => {
			const jsonData = JSON.parse(data);

			if (process.env.NODE_ENV === 'development') console.log(chalk.gray('WS message:'), jsonData);

			if (jsonData.message === WebSocketMessages.SUBSCRIBE) {
				const wsInf: WSInfo = {
					ws,
					userId: jsonData.userId ?? null,
					expire: Date.now() + config.SESSION_MAX_AGE_SECONDS * 1000
				}
				setConnection(wsInf);
			}
		});

		ws.on('close', removeConnection);
		ws.on('error', removeConnection);
		ws.on('disconnect', removeConnection);
	});

	console.log('WebSocket server working at', chalk.blue(getWebSocketUrl()));
}


/**
 * Returns number of clients notified.
 */
function notifyWSUserClients(targetUserIds: number[], message: string, payload: object | null = null): number {
	const now = Date.now();

	let count = 0;
	wsConnections.forEach(wsInf => {
		if (wsInf.userId && now < wsInf.expire && targetUserIds.includes(wsInf.userId)) {
			wsInf.ws.send({
				message,
				...(payload ? payload : {})
			});

			count++;
		}
	});

	return count;
}


export {
	getWebSocketUrl,
	initWSServer,
	notifyWSUserClients
}