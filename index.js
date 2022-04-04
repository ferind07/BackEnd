const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
var jwt = require("jsonwebtoken");
//app.use(express.static(__dirname + '/public'))
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/public", express.static("public"));

var userRoutes = require("./user/index");
var adminRoutes = require("./admin/index");
const con = require("./skripsi_db_connection");
const e = require("express");

app.use("/user", userRoutes);
app.use("/admin", adminRoutes);

app.get("/coba", (req, res) => {
  res.send("hello world");
});

const server = require("http").createServer(app);
const io = require("socket.io")(server);

// var CronJob = require("cron").CronJob;
// var job = new CronJob("* * * * *", function () {
//   updateHsubmissionExpired();
//   console.log("run every 1 minute");
// });
// job.start();

function updateHsubmissionExpired() {
  const q = `update hSubmission set status=4 WHERE timeInsert < (NOW() - INTERVAL 1 DAY)`;
  con.query(q, (err, rows) => {
    if (err) console.log(err);
    console.log(rows);
  });
}

function notifToUser(socket) {
  setInterval(() => {
    const q1 = `select * from submission where notif=0 and status=1 and dateStart between NOW() and (NOW() + INTERVAL 5 MINUTE)`;
    const q2 = `update submission set notif=1 where notif=0 and status=1 and dateStart between NOW() and (NOW() + INTERVAL 5 MINUTE)`;

    con.query(q1, (err, rows) => {
      //console.log(rows);
      if (rows.length > 0) {
        console.log(rows.length);
        rows.forEach((element) => {
          const idUser = element.idUser;
          const idInstructor = element.idInstructor;
          if (userData[idUser]) {
            io.to(userData[idUser]).emit("notif", {
              message: "ada notifikasi",
              description: "ini notifikasi",
            });
          }
          if (userData[idInstructor]) {
            io.to(userData[idInstructor]).emit("notif", {
              message: "ada notifikasi",
              description: "ini notifikasi",
            });
          }
        });
        con.query(q2, (err2, rows2) => {
          console.log(rows2);
          if (rows2.affectedRows > 0) {
            console.log("notif send");
          }
        });
      }
    });

    console.log("notif user");
  }, 30000);
}

app.post("/createRoom", (req, res) => {
  const idSubmission = req.body.idSubmission;
  const idUser = req.body.idUser;
  const token = req.body.token;
  try {
    var decoded = jwt.verify(token, "217116596");
    if (decoded.role == 2) {
      const idInstructor = decoded.id;

      createRoom(idSubmission, idUser, idInstructor);
      console.log(room);
      res.send({
        status: true,
        msg: "Success create ROOM",
      });
    } else {
      res.send({
        status: false,
        msg: "Not instructor",
      });
    }
  } catch (error) {
    console.log(error);
  }
});

app.post("/joinRoom", (req, res) => {
  const roomID = req.body.roomID;
  const token = req.body.token;

  try {
    var decoded = jwt.verify(token, "217116596");
    const obj = room[roomID];

    if (obj) {
      //obj.socketID.push(userData[decoded.id]);
      console.log(obj);
      res.send({ status: true, msg: "Join to room" });
    } else {
      res.send({ status: false, msg: "Room doesn't created yet" });
    }
  } catch (error) {
    console.log(error);
  }
});

function createRoom(id, idUser, idInstructor) {
  // room.push({
  //   id: id,
  //   idUser: idUser,
  //   idInstructor: idInstructor,
  //   socketID: [],
  // });
  room[id] = {
    id: id,
    idUser: idUser,
    idInstructor: idInstructor,
    socketID: [],
  };
}

const users = {};
const userData = {};
const room = {};

io.on("connection", (socket) => {
  if (!users[socket.id]) {
    users[socket.id] = socket.id;
    console.log(users);
  }

  socket.emit("yourID", socket.id);
  io.sockets.emit("allUsers", users);

  //notifToUser(socket);

  socket.on("join room", (id) => {
    console.log("room id : " + id);
    console.log("socket id : " + socket.id);
    if (room[id].socketID.length < 2) {
      const obj = room[id].socketID.find((element) => element == socket.id);
      if (obj) {
        //found
      } else {
        //not found
        room[id].socketID.push(socket.id);
      }

      console.log(room);
      const usersInThisRoom = room[id].socketID.filter(
        (id) => id !== socket.id
      );
      socket.emit("all users", usersInThisRoom);
    } else {
      console.log("room full");
    }
  });

  socket.on("sending signal", (payload) => {
    io.to(payload.userToSignal).emit("user joined", {
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });

  socket.on("kirim signal", (payload) => {
    io.to(payload.ke).emit("user masuk", {
      signal: payload.signal,
      dari: payload.dari,
    });
  });

  socket.on("returning signal", (payload) => {
    io.to(payload.callerID).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on("kembalikan signal", (payload) => {
    io.to(payload.ke).emit("terima signal kembalian", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on("login", (data) => {
    try {
      var decoded = jwt.verify(data.token, "217116596");
      users[socket.id] = decoded.id;
      userData[decoded.id] = socket.id;
      console.log(userData);
    } catch (error) {
      console.log(error);
    }

    //console.log(users[socket.id]);
  });

  socket.on("disconnect", () => {
    delete userData[users[socket.id]];
    delete users[socket.id];

    console.log(users);
    console.log(userData);
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
