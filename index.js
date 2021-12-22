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

const users = {};

io.on('connection', socket => {
  if (!users[socket.id]) {
      users[socket.id] = socket.id;
  }

  socket.emit("yourID", socket.id);

  io.sockets.emit("allUsers", users);

  socket.on('disconnect', () => {
      delete users[socket.id];
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