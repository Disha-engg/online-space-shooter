const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static("public"));

const rooms = new Map();

function newRoom() {
  let code;
  do { code = crypto.randomBytes(3).toString("hex").toUpperCase(); }
  while (rooms.has(code));
  rooms.set(code, {
    players: {},
    bullets: [],
    started: false,
    winner: null
  });
  return code;
}

function cleanRoom(code) {
  const room = rooms.get(code);
  if (room && Object.keys(room.players).length === 0) rooms.delete(code);
}

io.on("connection", socket => {
  socket.on("createRoom", (cb) => {
    const code = newRoom();
    join(socket, code, cb);
  });

  socket.on("joinRoom", (code, cb) => {
    code = String(code || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return cb?.({ok:false, error:"Room not found."});
    if (Object.keys(room.players).length >= 2) return cb?.({ok:false, error:"Room is full."});
    join(socket, code, cb);
  });

  socket.on("input", data => {
    const code = socket.data.room;
    const room = rooms.get(code);
    const id = socket.data.player;
    if (!room || !id || !room.players[id]) return;
    const p = room.players[id];
    p.x = Math.max(50, Math.min(950, Number(data?.x) || p.x));
    p.y = Math.max(100, Math.min(600, Number(data?.y) || p.y));
    if (data?.shoot && Date.now() - p.lastShot >= 250) {
      p.lastShot = Date.now();
      room.bullets.push({owner:id, x:p.x + (id===1?42:-42), y:p.y, dx:id===1?13:-13});
    }
  });

  socket.on("disconnect", () => {
    const code=socket.data.room, room=rooms.get(code), id=socket.data.player;
    if (!room || !id) return;
    delete room.players[id];
    io.to(code).emit("playerLeft");
    cleanRoom(code);
  });
});

function join(socket, code, cb) {
  const room=rooms.get(code);
  const id=Object.keys(room.players).length===0 ? 1 : 2;
  room.players[id]={x:id===1?150:850,y:325,health:100,score:0,lastShot:0};
  socket.join(code);
  socket.data.room=code;
  socket.data.player=id;
  room.started=Object.keys(room.players).length===2;
  cb?.({ok:true, code, player:id});
  io.to(code).emit("lobby", {count:Object.keys(room.players).length, started:room.started});
}

setInterval(() => {
  for (const [code,room] of rooms) {
    const ids=Object.keys(room.players);
    for (const b of room.bullets) {
      b.x += b.dx;
      const target=b.owner===1?2:1, p=room.players[target];
      if (p && Math.abs(b.x-p.x)<40 && Math.abs(b.y-p.y)<40) {
        p.health=Math.max(0,p.health-10);
        room.players[b.owner].score += 10;
        b.hit=true;
      }
      if (b.x<0 || b.x>1000) b.hit=true;
    }
    room.bullets=room.bullets.filter(b=>!b.hit);
    if (room.started) {
      for (const id of ids) {
        if (room.players[id].health<=0) room.winner=String(id===1?2:1);
      }
    }
    io.to(code).emit("state", {
      players:room.players,
      bullets:room.bullets,
      started:room.started,
      winner:room.winner
    });
  }
}, 30);

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`Space Shooter server running on port ${PORT}`));
