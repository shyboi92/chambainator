import fs from 'fs';

import mysqldump from 'mysqldump';
import moment from 'moment';
import gunzip from 'gunzip-file';
import mysqlImporter from 'mysql-import';
import archiver from 'archiver';

import utils from './utils.js';


let underMaintenance = false;


function isUnderMaintenance() {
    return underMaintenance;
}


function backupFileName(timestamp: moment.Moment) {
    return `database-${timestamp.format('YYYYMMDD.HHmmss')}`;
}


function enumBackups() {
	const regex = new RegExp('database-([0-9]{8}).([0-9]{6}).sql');

    const folder = utils.getDataFilePath('', utils.DataFileTypes.BACKUP);
	const files = fs.readdirSync(folder).reduce((accu, e) => {
		const m = e.match(regex);
		if (m) {
			accu.push({
				filename: e,
				timestamp: moment(`${m[1]}${m[2]}`, 'YYYYMMDDHHmmss'),
                id: `${m[1]}${m[2]}`
			});
		}

		return accu;
	}, [] as any).sort((a: any, b: any) => b.id.localeCompare(a.id));

	return files;
}


function createBackup() {
    const backupFilename = backupFileName(moment());
    const sqlTmpFilePath = utils.getDataFilePath(`${backupFilename}.sql`, utils.DataFileTypes.TMP_UNCATEGORIZED);
    const backupFilePath = utils.getDataFilePath(`${backupFilename}.zip`, utils.DataFileTypes.BACKUP);

    return new Promise((resolve, reject) => {
        if (underMaintenance) return reject('Hệ thống đang bảo trì.');
        underMaintenance = true;
    
        mysqldump({
            connection: {
                host: process.env.DB_HOST,
                user: process.env.DB_USERNAME as string,
				password: process.env.DB_PASSWORD as string,
				database: process.env.DB_SCHEMA as string,
            },
            dumpToFile: sqlTmpFilePath,
            compressFile: false,
            dump: {
                schema: {
                    table: {
                        dropIfExist: true
                    }
                }
            }
        }).then(() => {
            // Currently, mysqldump package breaks when compressFile option is set:
            // https://github.com/bradzacher/mysqldump/issues/119

            // We create the backup zip file manually!

            const output = fs.createWriteStream(backupFilePath);
            output.on('close', () => {
                fs.unlink(sqlTmpFilePath, err => {});
                resolve(null);
            });
            
            const archive = archiver('zip');
            archive.on('error', err => reject(err.message));
            archive.pipe(output);

            archive.append(fs.createReadStream(sqlTmpFilePath), {name: `${backupFilename}.sql`});
            archive.finalize();

        }).catch(reject)
        .finally(() => {
            underMaintenance = false;
        });
    });
}


function restoreBackup(timestamp) {
    return new Promise((resolve, reject) => {
        if (underMaintenance) return reject('Hệ thống đang bảo trì.');
        underMaintenance = true;

        const zipFile = utils.getDataFilePath(backupFileName(moment(timestamp, 'YYYYMMDDHHmmss')), utils.DataFileTypes.BACKUP);
        if (!fs.existsSync(zipFile)) return reject('File không tồn tại.');

        const tmpSqlFile = 'dist/tmp/backup.sql';
        gunzip(zipFile, tmpSqlFile, async () => {
            const importer = new mysqlImporter({
                host: process.env.DB_HOST,
                user: process.env.DB_USERNAME as string,
				password: process.env.DB_PASSWORD as string,
				database: process.env.DB_SCHEMA as string,
            });

            await importer.import(tmpSqlFile);

            fs.unlink(tmpSqlFile, err => {
                if (err && process.env.NODE_ENV == 'development') console.error(err);
            });

            resolve(importer.getImported() > 0);
        });
        
    }).finally(() => {
        underMaintenance = false;
    });
}


export default {
    isUnderMaintenance,
    enumBackups,
	createBackup,
	restoreBackup,
}