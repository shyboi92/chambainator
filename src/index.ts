import fs from 'fs';
import http from 'http';
import https from 'https';
import dotenv from 'dotenv';
import chalk from 'chalk';
import cron from 'node-cron';

import utils from './inc/utils.js';
import backup from './inc/backup.js';
import * as config from './inc/config.js';

import {initWebServer} from './inc/server-web.js';
import {initWSServer} from './inc/server-ws.js';


dotenv.config();


console.log(chalk.yellow(`Running in ${process.env.NODE_ENV} mode...`));


utils.prepateDataFolders();



cron.schedule('1 0 * * 0', () => {	// 1:00 every Sunday
	console.log('Creating backup...');
	backup.createBackup();

	const backupPath = utils.getDataFilePath('', utils.DataFileTypes.BACKUP);
	console.log('Cleaning up: ' + backupPath);
	utils.cleanOldFiles(backupPath, config.BACKUP_FILES_MAX_AGE_DAYS * 3600 * 24);

	const tmpUncategorizedPath = utils.getDataFilePath('', utils.DataFileTypes.TMP_UNCATEGORIZED);
	console.log(`Cleaning up: ${tmpUncategorizedPath}`);
	utils.cleanOldFiles(tmpUncategorizedPath, config.UNCATEGORIZED_TMP_FILES_MAX_AGE_DAYS * 3600 * 24);

	const logPath = utils.getDataFilePath('', utils.DataFileTypes.TMP_LOG);
	console.log(`Cleaning up: ${logPath}`);
	utils.cleanOldFiles(logPath, config.LOG_FILES_MAX_AGE_DAYS * 3600 * 24);

	const uploadPath = utils.getDataFilePath('', utils.DataFileTypes.TMP_UPLOAD);
	console.log(`Cleaning up: ${uploadPath}`);
	utils.cleanOldFiles(uploadPath, config.UPLOAD_FILES_MAX_AGE_DAYS * 3600 * 24, true);
});




const httpServer = (() => {
	if (process.env.WEB_LOCAL_HTTPS === '1') {
		const credentials = {
			key: fs.readFileSync(utils.getDataFilePath('private.key', utils.DataFileTypes.CERTS)),
			cert: fs.readFileSync(utils.getDataFilePath('public.crt', utils.DataFileTypes.CERTS))
		}
		return https.createServer(credentials);
	}
	
	return http.createServer();
})();


initWebServer(httpServer);
initWSServer(httpServer);


const port = process.env.WEB_LOCAL_PORT ?? 8080;
httpServer.listen(port);


