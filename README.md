# Online 2-Player Space Shooter

## Run locally
Install Node.js 18+.
```bash
npm install
npm start
```
Open http://localhost:3000 in two browser tabs/devices.

## Deploy for a public shareable link
Use Render (recommended):
1. Create a GitHub repository and upload `server.js`, `package.json`, and the `public` folder.
2. In Render, create a new **Web Service** connected to the repository.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. After deployment, Render gives a public `https://...onrender.com` URL.
6. Send that URL to your friend.
7. One player clicks **Create Game**, copies the room code, and sends the code to the other player. The second clicks **Join Game**.

The server is authoritative for player positions, bullets, health, and scores. Socket.IO provides the real-time connection.
