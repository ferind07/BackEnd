const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
var jwt = require("jsonwebtoken");
const util = require("util");
//app.use(express.static(__dirname + '/public'))
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/public", express.static("public"));

var userRoutes = require("./user/index");
var adminRoutes = require("./admin/index");
const con = require("./skripsi_db_connection");

app.use("/user", userRoutes);
app.use("/admin", adminRoutes);

app.get("/coba", (req, res) => {
  res.send("hello world");
});

const server = require("http").createServer(app);
const io = require("socket.io")(server);

var CronJob = require("cron").CronJob;
var job = new CronJob("10 * * * *", function () {
  //endClassByDay();
  hSubmissionExpired();
  console.log("run every day midnight");
});
job.start();

function updateHsubmissionExpired() {
  const q = `update hSubmission set status=4 WHERE timeInsert < (NOW() - INTERVAL 1 DAY)`;
  con.query(q, (err, rows) => {
    if (err) console.log(err);
    console.log(rows);
  });
}

async function hSubmissionExpired() {
  const qIdhSubmission = `select * from hSubmission where status=0 and timeInsert > (NOW() + INTERVAL 1 DAY)`;

  con.query(qIdhSubmission, (err, rows) => {
    if (err) throw err;
    rows.forEach(async (element) => {
      const idHSubmission = element.id;

      let q = `update hSubmission set status=2 where id=${idHSubmission}`;
      const query = util.promisify(con.query).bind(con);
      let hasil = await query(q);
      console.log(hasil);

      if (hasil.affectedRows == 1) {
        let q2 = `update submission set status=2 where idHsubmission=${idHSubmission}`;
        const query2 = util.promisify(con.query).bind(con);
        let hasil2 = await query2(q2);
        //console.log(hasil2);
        const qUser = `select * from user where id=${element.idUser}`;
        const userData = await query(qUser);

        const qClass = `select * from class where id=${element.idClass}`;
        const classData = await query(qClass);

        const newSaldo = userData[0].saldo + classData[0].price;
        const qKembali = `update user set saldo=${newSaldo} where id=${element.idUser}`;
        const hasilKembaliUangUser = await query(qKembali);
      }
    });
  });
}

async function endClassByDay() {
  const qIdSubmission = `select * from submission where status=4 and dateEnd < now()`;

  con.query(qIdSubmission, (err, rows) => {
    if (err) throw err;
    rows.forEach(async (element) => {
      const idSubmission = element.id;

      const query = util.promisify(con.query).bind(con);

      const q = `update submission set status=2 where id=${idSubmission}`;

      const updateSubmission = await query(q);

      // const q2 = `select * from class submission where id=${idSubmission}`;
      const q2 = `select * from submission where id=${idSubmission}`;

      const dataSubmission = await query(q2);

      // const q3 = `select * from class where id=${dataSubmission[0].idClass}`

      // const dataClass = await query(q3);

      // console.log(q2);
      // console.log(dataSubmission);
      const idHSubmission = dataSubmission[0].idHsubmission;
      const idClass = dataSubmission[0].idClass;

      // const checkClassDone = await checkClassDone(query, idClass, idHSubmission);
      // const sendMoney = await sendMoney(query, idClass);
      //finish class
      //1. update status
      //2. check class done
      //3. send money

      const q3 = `select * from class where id=${idClass}`;

      const dataClass = await query(q3);

      const classCount = dataClass[0].classCount;

      const q4 = `select * from submission where idHsubmission=${idHSubmission} and status=2`;
      const dataSubmissionDone = await query(q4);
      console.log(q4);

      if (dataSubmissionDone.length == classCount) {
        console.log("kelas sudah selesai");

        const q5 = `update hSubmission set status=3 where id=${idHSubmission}`;

        const updateHSubmission = await query(q5);

        const q6 = `update hSubmission set timeUpdate=now() where id=${idHSubmission}`;

        const updateTimeUpdate = await query(q6);

        const gaji = dataClass[0].price / dataClass[0].classCount;

        const q7 = `select * from user where id=${dataClass[0].idInstructor}`;

        const hasil2 = await query(q7);

        const gajiInstructor = (gaji * 95) / 100;
        const gajiAdmin = (gaji * 5) / 100;

        const saldo = hasil2[0].saldo + gajiInstructor;

        const q8 = `update user set saldo=${saldo} where id=${dataClass[0].idInstructor}`;

        // const queryGajiAdmin = await sendMoneyToAdmin(query, gajiAdmin);

        const hasil3 = await query(q8);

        const q9 = `select * from user where role=3`;
        const dataAdmin = await query(q9);

        const saldoBaru = dataAdmin[0].saldo + gajiAdmin;

        const q10 = `update user set saldo=${saldoBaru} where role=3`;
        const updateSaldo = await query(q10);

        res.send(updateSaldo);
      }
    });
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

      if (!room[idSubmission]) {
        createRoom(idSubmission, idUser, idInstructor);
        console.log(room);
        res.send({
          status: true,
          msg: "Success create ROOM",
        });
      } else {
        res.send({
          status: true,
          msg: "Success join ROOM",
        });
      }
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
      console.log(obj);

      if (obj.socketID.length >= 2) {
        res.send({ status: false, msg: "Unable to join room" });
      } else {
        res.send({ status: true, msg: "Join to room" });
      }
    } else {
      res.send({ status: false, msg: "Room doesn't created yet" });
    }
  } catch (error) {
    console.log(error);
  }
});

app.post("/insEndRoom", (req, res) => {
  const idSubmission = req.body.idSubmission;

  const q = `update submission set status=4 where id=${idSubmission}`;

  con.query(q, (err, rows) => {
    if (err) throw err;
    if (rows.affectedRows == 1) {
      res.send({
        status: true,
        msg: "Success end room",
      });
    }
  });
});

function createRoom(id, idUser, idInstructor) {
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
const socketToRoom = {};

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
      socketToRoom[socket.id] = id;
      //console.log(socketToRoom);
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

  socket.on("returning signal", (payload) => {
    io.to(payload.callerID).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on("share screen", (payload) => {
    console.log("share screen to " + payload.to);
    io.to(payload.to).emit("reciveShareScreen", {
      signal: payload.signal,
      from: socket.id,
    });
  });

  socket.on("stop share screen", (payload) => {
    console.log("stop share screen to " + payload.to);
    io.to(payload.to).emit("share screen stopped");
  });

  socket.on("return share screen signal", (payload) => {
    const signal = payload.signal;
    const to = payload.to;

    io.to(to).emit("receiving returned share screen signal", {
      signal: signal,
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

    console.log("disconnect");
    // console.log(room);
    // console.log(socketToRoom);
    const roomID = socketToRoom[socket.id];

    if (room[roomID]) {
      var data = room[roomID].socketID.filter((id) => id !== socket.id);
      room[roomID].socketID = data;
    }
    console.log("room id");
    console.log(room[roomID]);
    console.log(socket.id);

    socket.broadcast.emit("user left", socket.id);

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

  socket.on("sendChat", (data) => {
    const roomID = data.room;
    const text = data.text;
    const sender = socket.id;

    room[roomID].socketID.forEach((element) => {
      if (element != sender) {
        console.log("send " + element + " from " + sender);
        io.to(element).emit("newChat", {
          text: text,
          sender: false,
        });
      }
    });
  });

  socket.on("leave", (data) => {
    // console.log(data.id);
    // console.log(data.to);
    const id = data.id;
    console.log(room);
    io.to(data.to).emit("goToResultPage");
  });

  socket.on("shareScreenError", (data) => {
    io.to(data.to).emit("partnerShareScreenError");
  });

  socket.on("peerDestroy", (payload) => {
    io.to(payload.to).emit("peerDestroy");
  });
});

const PORT = process.env.PORT || 8000;
server.listen(8000, () => {
  console.log(`server run... on port ${PORT}`);
});
