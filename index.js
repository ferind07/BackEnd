const express = require("express");
const http = require("http");
const app = express();
const cors = require("cors");
const server = http.createServer(app);
const socket = require("socket.io");
const bodyParser = require("body-parser");
const io = socket(server);

var userRoutes = require("./user/index");
var adminRoutes = require("./admin/index");

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/user", userRoutes);
app.use("/admin", adminRoutes);

const users = {};

const socketToRoom = {};

app.get("/getListUser", (req, res) => {
  const roomID = req.query.roomID;
  res.send(users[roomID]);
});

io.on("connection", (socket) => {
  socket.emit("yourID", socket.id);
  socket.on("join room", (roomID) => {
    //console.log(roomID);
    if (users[roomID]) {
      const length = users[roomID].length;
      if (length === 4) {
        socket.emit("room full");
        return;
      }
      users[roomID].push(socket.id);
      console.log(users[roomID]);
    } else {
      users[roomID] = [socket.id];
    }
    socketToRoom[socket.id] = roomID;
    const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);

    socket.emit("all users", usersInThisRoom);
  });

  socket.on("user in the room", (roomID) => {
    const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);

    socket.emit("list user in the room", usersInThisRoom);
  });

  socket.on("sending signal", (payload) => {
    io.to(payload.userToSignal).emit("user joined", {
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });

  socket.on("returning signal", (payload) => {
    io.to(payload.callerID).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on("sending share screen signal", (payload) => {
    const to = payload.userToSignal;
    const from = payload.callerID;
    const signal = payload.signal;

    console.log("sending share screen signal from " + from + " to " + to);

    io.to(to).emit("recive share screen signal", {
      callerID: from,
      signal: signal,
    });
  });

  socket.on("return share screen signal", (payload) => {
    const signal = payload.signal;
    const to = payload.to;

    console.log("return share screen signal from " + socket.id + " to " + to);

    io.to(to).emit("receiving returned share screen signal", {
      signal: signal,
      id: socket.id,
    });
  });

  socket.on("sending share screen signal2", (payload) => {
    const to = payload.userToSignal;
    const from = payload.callerID;
    const signal = payload.signal;

    console.log("sending share screen signal from " + from + " to " + to);

    io.to(to).emit("recive share screen signal2", {
      callerID: from,
      signal: signal,
    });
  });

  socket.on("return share screen signal2", (payload) => {
    const signal = payload.signal;
    const to = payload.to;

    console.log("return share screen signal from " + socket.id + " to " + to);

    io.to(to).emit("receiving returned share screen signal2", {
      signal: signal,
      id: socket.id,
    });
  });

  socket.on("disconnect", () => {
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    if (room) {
      room = room.filter((id) => id !== socket.id);
      users[roomID] = room;
      console.log(users[roomID]);
    }
    socket.broadcast.emit("user left", socket.id);
    console.log("disconnect");
  });
});

server.listen(process.env.PORT || 8000, () =>
  console.log("server is running on port 8000")
);
