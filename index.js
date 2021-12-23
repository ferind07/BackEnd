const express = require("express");
const http = require("http");
const app = express();

const chat = require("./router/chat");

const cors = require("cors");
app.use(cors);

const server = http.createServer(app);
const socket = require("socket.io");
const req = require("express/lib/request");
const io = socket(server);

const users = [];

io.on('connection', socket => {
  
  if (!users[socket.id]) {
    users.push(socket.id)
  }
  console.log(users);

  socket.emit("yourID", socket.id);

  io.sockets.emit("allUsers", users);

  socket.on('disconnect', () => {
    const id = socket.id;
    for (let index = 0; index < users.length; index++) {
      const element = users[index];
      if (element === id){
        users.splice(index, 1);
      }
    }
    io.emit("allUsers", users);
    console.log(users);
  })

  socket.on("callUser", (data) => {
    io.to(data.userToCall).emit('hey', {signal: data.signalData, from: data.from});
  })

  socket.on("acceptCall", (data) => {
    io.to(data.to).emit('callAccepted', data.signal);
  })
});

app.use("/chat", chat);

app.get("/", (req, res) => {
  res.send("Hello world")
});

server.listen(8000, () => {
  console.log("Server running");
});