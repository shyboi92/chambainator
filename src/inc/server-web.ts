import path from "path";
import express from "express";
import expressSession from "express-session";
import expressFileUpload from "express-fileupload";
import sessionFileStore from "session-file-store";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import fsRotator from "file-stream-rotator";
import moment from "moment";
import chalk from "chalk";
import cors from "cors";

import * as config from "./config.js";
import utils from "./utils.js";
import * as session from "./session.js";

const app = express();

const __dirname = utils.dirname(import.meta.url);

// take real remote IP address when working behind a reverse proxy
morgan.token(
	"remote-addr",
	(req, _res) => (req.headers["x-forwarded-for"] || req.socket.remoteAddress) as string
);
morgan.token("local-date", (_req, _res) =>
	moment().format("YYYY-MM-DD HH:mm:ss")
);

app.use(
	morgan(
		':remote-addr [:local-date] ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms ":referrer" ":user-agent"',
		{
			stream: fsRotator.getStream({
				date_format: "YYYYMMDD",
				filename: path.join(
					__dirname,
					"../../tmp/log/access-%DATE%.log"
				),
				audit_file: path.join(__dirname, "../../tmp/log/audit.json"),
				frequency: "daily",
				verbose: false,
			}),
		}
	)
);

app.use(morgan("dev"));

// app.use((req, res, next) => {
// 	const origin = req.get('origin');
// 	if (origin) {
// 		res.setHeader('Access-Control-Allow-Origin', origin);
// 		res.setHeader('Access-Control-Allow-Methods', '*');
// 		res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
// 		res.setHeader('Access-Control-Allow-Credentials', 'true');
// 	}

// 	if (req.method.toUpperCase() === 'OPTIONS') {
// 		res.sendStatus(httpCodes.OK);  // Only headers for preflight requests
// 	} else next();      // Continue the process for other ones
// });

app.use(cors());

app.use(cookieParser(config.SECRET_STRING));

const FileStore = sessionFileStore(expressSession);
app.use(
	expressSession({
		store: new FileStore({
			path: path.join(__dirname, "../../tmp/sessions"),
		}),
		secret: config.SECRET_STRING,
		name: config.SESSION_COOKIE_NAME,
		saveUninitialized: false,
		resave: false,
		rolling: true,
		proxy: true, // allows Secure cookies to be sent over HTTP to a proxy
		cookie: {
			...session.getCookieOptions(),
			maxAge: config.SESSION_MAX_AGE_SECONDS * 1000,
		},
	})
);

if (process.env.NODE_ENV === "development")
	console.log(
		chalk.yellow(
			"Session cookie SameSite is set to None in development mode"
		)
	);

// parsing application/json
app.use(express.json({ limit: "50mb" }));

// parsing application/x-www-form-urlencoded
app.use(
	express.urlencoded({
		extended: true,
		limit: `${config.UPLOAD_SIZE_LIMIT_MBS}mb`,
		parameterLimit: 1000,
	})
);

// parsing multipart/form-data
app.use(
	expressFileUpload({
		limits: { fileSize: config.UPLOAD_SIZE_LIMIT_MBS * 1024 * 1024 },
		abortOnLimit: true,
	})
);

app.use(
	process.env.WEB_LOCAL_PATH as string,
	express.static(
		path.join(
			__dirname,
			process.env.NODE_ENV == "development"
				? "../../dist-fe-dev"
				: "../../dist-fe-prod"
		)
	)
);
//app.use(process.env.WEB_LOCAL_PATH as string, express.static(path.join(__dirname, '../public')));

app.use(session.sessionContext);

import routeMain from "../routes/main.js";
import routeApiUser from "../routes/api-user.js";
import routeApiCourse from "../routes/api-course.js";
import routeApiClass from "../routes/api-class.js";
import routeApiExercise from "../routes/api-exercise.js";
import routeApiExam from "../routes/api-exam.js";
import routeApiSubmit from "../routes/api-submit.js";
import routeApiMct from "../routes/api-mct.js";

app.use(process.env.WEB_LOCAL_PATH as string, routeMain);
app.use(process.env.WEB_LOCAL_PATH as string, routeApiUser);
app.use(process.env.WEB_LOCAL_PATH as string, routeApiCourse);
app.use(process.env.WEB_LOCAL_PATH as string, routeApiClass);
app.use(process.env.WEB_LOCAL_PATH as string, routeApiExercise);
app.use(process.env.WEB_LOCAL_PATH as string, routeApiExam);
app.use(process.env.WEB_LOCAL_PATH as string, routeApiSubmit);
app.use(process.env.WEB_LOCAL_PATH as string, routeApiMct);

function initWebServer(httpServer) {
	httpServer.on("request", app);

	console.log("Web server working at", chalk.blue(utils.makeUrl("")));
}

export { initWebServer };
