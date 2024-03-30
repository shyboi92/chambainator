# express-react-boilerplate

A boilerplate project with Express.js backend, and React frontend.

## Supported functionalities:

- HTTPS
- Database connection to MySQL
- Rotating logs
- Old log erasing
- Authentication with user accounts and permission control
- Login API using JWT
- Login remembering using cookie

## Getting started

- Download the project
- Import the database from `misc\dump.sql`
- Create the SSL certificate files in `back\data\cert`
  - For development purpose with `localhost`, create a self-signed certificate by:
    ```
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout private.key -out public.crt
    ```
- Create the config files (`front\.env`, `back\.env`) from the corresponding `*-template` files
- Edit `front\package.json` and change `homepage` to have the same value with `WEB_PUBLIC_PATH` in `back\.env`
- Run `npm install` and `npm start` in both apps
