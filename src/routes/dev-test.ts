// The routes in this file are intended for testing in the development process, and are only mounted in development mode.

import {Router, Request, Response} from 'express';
import cors from 'cors';
import {WebSocketMessages} from '../inc/constants.js';
import {ParsedRequest} from '../inc/session.js';
import db from '../inc/database.js';
import {notifyWSUserClients} from '../inc/server-ws.js';

const router = Router();
export default router;
router.use(cors({
	origin: '*',
	methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  }));

router.all('/test/login', async (req: Request, res: Response) => {
	const preq = req as ParsedRequest;

	if (req.body?.action == 'login') {
		const userId = await preq.ctx.loginWithUsernameAndPassword(req.body.username, req.body.password, req.body.rememberLogin?.toLowerCase() == 'on');

		if (userId) preq.ctx.logActivity('Đăng nhập bằng tài khoản', {user_id: userId});

	} else if (req.body?.action == 'logout') {
		preq.ctx.logActivity('Đăng xuất');

		await preq.ctx.logout();
	}

	if (preq.ctx.isAuthenticated()) {
		res.write(`<p>Logged in.</p>
			<form method="post">
				<input type="hidden" name="action" value="logout" />
				<button type="submit">Logout</button>
			</form>`);
	} else {
		res.write(`<p>Welcome, please login!</p>
			<form method="post">
				<input type="hidden" name="action" value="login" />
				<p>Username: <input type="text" name="username" placeholder="Username" /></p>
				<p>Password: <input type="password" name="password" placeholder="Password" /></p>
				<p><label>Remember login <input type="checkbox" name="rememberLogin" /></label></p>
				<button type="submit">Login</button>
			</form>`);
	}

	res.write('<p><a href="./">Come back.</a></p>');
	res.send();
});



router.all('/test', async (req: Request, res: Response) => {
	const preq = req as ParsedRequest;

	res.write('<p>Server is working</p>');

	const dbOk = await db.queryValue('select 1');
	res.write('<p>Database is working</p>');

	const userInfo = await preq.ctx.getUser()?.getInfo();
	res.write(`<p>You are ${userInfo ? `logged in as ${userInfo.username}` : 'not <a href="./test/login">logged in</a>'}`);

	res.write(`<script>
		const userId = ${userInfo?.id ?? 'null'};

		function fetchApi(url, options) {
			fetch(url, {
				"headers": { "content-type": "application/json" },
				"method": "POST",
				...options
			}).then(a => a.json()).then(a => console.log(a))
		}

		function postApi(url, data) {
			fetchApi(url, {
				"headers": { "content-type": "application/json" },
				"body": JSON.stringify(data),
				"method": "POST",
			})
		}

		function getApi(url, data) {
			fetchApi(url + '?' + new URLSearchParams(data), {
				"method": "GET",
			})
		}

		const socket = new WebSocket('wss://' + window.location.host);
		
		socket.addEventListener('open', () => {
			socket.send(JSON.stringify({message: '${WebSocketMessages.SUBSCRIBE}', userId}));
			console.log('WebSocket connection established');
		});
		
		socket.addEventListener('message', async event => {
			const data = event.data;
			const jsonData = JSON.parse(data);
			console.log(jsonData);
		});

		</script>`);

	res.send();
});




router.get('/test/notify', async (req: Request, res: Response) => {
	const message = req.query.message as string;
	const targetUser = +(req.query.targetUser as string);

	notifyWSUserClients([targetUser], message, {test1: 1, test2: "2"});
	res.send('ok')
});
