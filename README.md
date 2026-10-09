# OngVang Web

## Install and run

1. Install Node.js 22 or later on the computer running the API.
2. From the project root, install the exact dependencies recorded in the lockfile:
   - PowerShell: `npm.cmd ci`
   - Command Prompt: `npm ci`
3. Create `OngVang-Backend/.env` from `OngVang-Backend/.env.example`:
   - PowerShell: `Copy-Item OngVang-Backend/.env.example OngVang-Backend/.env`
   - Command Prompt: `copy OngVang-Backend\.env.example OngVang-Backend\.env`
4. Edit `.env` with the SQL Server address, database name, username, and password for this computer. Do not commit `.env`.
5. Start SQL Server, then start the API from the project root:
   - PowerShell: `npm.cmd start`
   - Command Prompt: `npm start`
6. Open `http://localhost:3001`. Check the API and database connection at `http://localhost:3001/api/health`.

The web app and API are served by the same Node.js process. Re-run `npm.cmd ci` after cloning the repository or whenever `package-lock.json` changes; it installs both root and backend workspace dependencies. Do not open the HTML files directly or use a separate static server.

## Run on a local network

1. Complete the install and run steps above on the server computer.
2. On another computer on the same network, open `http://<LAN-IP-of-server>:3001`. Allow inbound TCP port 3001 through the server computer's firewall if Windows blocks access.

The backend serves both the web app and API from the same address, and listens on all network interfaces. Keep the backend running while other computers use the site.

Each computer that runs the API needs its own Node.js installation, dependencies (`npm.cmd ci`), reachable SQL Server, and local `.env` configuration. Browsers on other computers only need to open the server computer's address; do not start another API server on each client computer.

For access over the public Internet, deploy this app to a reachable server and route HTTPS traffic to the Node.js app. Public deployment also requires configuring SQL Server network access and credentials on that server.
