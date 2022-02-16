const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
//app.use(express.static(__dirname + '/public'))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

var userRoutes = require("./user/index");

app.use("/user", userRoutes);

app.get("/coba", (req, res) => {
  res.send("hello world");
});

const server = require("http").createServer(app);
const io = require("socket.io")(server);

const users = {};

io.on("connection", (socket) => {
  if (!users[socket.id]) {
    users[socket.id] = socket.id;
  }
  socket.emit("yourID", socket.id);
  io.sockets.emit("allUsers", users);

  socket.on("disconnect", () => {
    delete users[socket.id];
    console.log(users);
    io.emit("allUsers", users);
  });

  socket.on("callUser", (data) => {
    io.to(data.userToCall).emit("hey", {
      signal: data.signalData,
      from: data.from,
    });
  });

  socket.on("acceptCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(8000, () => {
  console.log(`server run... on port ${PORT}`);
});
