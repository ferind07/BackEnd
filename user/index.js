const express = require("express");
const router = express.Router();
const con = require("../skripsi_db_connection");
var SHA256 = require("crypto-js/sha256");

const fs = require("fs");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);
const multer = require("multer");
const path = require("path");
const nodeMailer = require("nodemailer");
var jwt = require("jsonwebtoken");
const util = require("util");
const moment = require("moment");
var uuid = require("uuid");
const Xendit = require("xendit-node");
// Create Snap API instance

//xendit payment
const xenditSecretKEY = `xnd_development_gZ6UwlJq2YDJg9U046XEA91ueFkMsjCjWa0boSgIXE2Lygo6ko3zadK0l6gXw`;
//const Xendit = require("xendit-node");
//const x = new Xendit({ secretKey: xenditSecretKEY });

//const x = new require("xendit-node")({ secretKey: xenditSecretKEY });

const diskStorageBerkas = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads/berkas"));
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const diskStorageUserProfile = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads/userProfile"));
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const diskStorageClassImage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads/classImage"));
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const diskStorageReport = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads/report"));
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const uploadBerkas = multer({
  storage: diskStorageBerkas,
}).single("berkas");

const uploadClassImage = multer({
  storage: diskStorageClassImage,
}).single("classImage");

const uploadUserProfile = multer({
  storage: diskStorageUserProfile,
}).single("userProfile");

const uploadReport = multer({
  storage: diskStorageReport,
}).single("report");

router.get("/", (req, res) => {
  res.send("hello user");
});

async function sendEmail() {
  const transporter = nodeMailer.createTransport({
    service: "gmail",
    auth: {
      user: "ferryindra007@gmail.com",
      pass: "Surabaya",
    },
  });

  var mailOptions = {
    from: "ferryindra007@gmail.com",
    to: `${email}`,
    subject: "Sending Email using Node.js",
    html: await readFile("./user/email.html", "utf8"),
  };

  await transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

async function sendEmailForgetPassword(email, res, newPass) {
  const transporter = nodeMailer.createTransport({
    service: "gmail",
    auth: {
      user: "ferryindra007@gmail.com",
      pass: "utbiwqtobvulevci",
    },
  });

  var mailOptions = {
    from: "ferryindra007@gmail.com",
    to: `${email}`,
    subject: "T-DEMY new password",
    text:
      "New password for T-DEMY is " +
      newPass +
      " please change to new password",
  };

  await transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      res.send(error);
    } else {
      console.log("Email sent: " + info.response);
      res.send({ status: true, msg: "Please check your email" });
    }
  });
}

async function sendEmailRegister(email, res, id) {
  const transporter = nodeMailer.createTransport({
    service: "gmail",
    auth: {
      user: "ferryindra007@gmail.com",
      pass: "utbiwqtobvulevci",
    },
  });

  var url = process.env.URL + id;

  var mailOptions = {
    from: "ferryindra007@gmail.com",
    to: `${email}`,
    subject: "T-DEMY activation account",
    html: `<p>Click <a href=${url}>here</a> to activate your account</p>`,
  };

  await transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      res.send(error);
      res.send({ status: false, msg: error });
    } else {
      console.log("Email sent: " + info.response);
      res.send({ status: true, msg: "Please check your email" });
    }
  });
}

router.post("/forgetPassword", (req, res) => {
  const email = req.body.email;

  const qq = `select * from user where email='${email}'`;
  let valid = false;
  con.query(qq, (err, rows) => {
    if (rows.length > 0) {
      valid = true;
    }
  });

  if (valid) {
    const newPass = Math.floor(100000 + Math.random() * 900000);

    const hash = SHA256(newPass).toString();
    const q = `upadate user set password='${hash}' where email='${email}'`;

    con.query(q, (err, rows) => {
      if (err) throw err;

      if (rows.affectedRows == 1) {
        sendEmailForgetPassword(email, res, newPass);
      }
    });
  } else {
    res.send({
      status: false,
      msg: "Email not registered",
    });
  }
});

async function usePooledConnectionAsync(actionAsync) {
  const connection = await new Promise((resolve, reject) => {
    con.getConnection((ex, connection) => {
      if (ex) {
        reject(ex);
      } else {
        resolve(connection);
      }
    });
  });
  try {
    return await actionAsync(connection);
  } finally {
    connection.release();
  }
}

router.get("/semuaUser", async (req, res) => {
  const q = `select * from user`;

  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

router.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const hash = SHA256(password).toString();
  const q = `select * from user where email='${email}' and password='${hash}'`;

  con.query(q, (err, rows) => {
    if (err) throw err;
    if (rows.length == 0) {
      res.status(201).send({ msg: "Wrong email/password" });
    } else {
      const data = rows[0];
      if (data.status != 0) {
        if (data.status == 3) {
          res.status(201).send({ msg: "Please activate your account" });
        } else {
          const token = jwt.sign(
            {
              id: data.id,
              email: data.email,
              role: data.role,
              name: data.name,
              phoneNumber: data.phoneNumber,
            },

            "217116596"
          );
          res.status(200).send({
            msg: "Success login",
            token: token,
            id: data.id,
            role: data.role,
            status: data.status,
          });
        }
      } else {
        res.status(201).send({ msg: "User banned" });
      }
    }
  });
});

router.post("/register", async (req, res) => {
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  const role = req.body.role;
  const phoneNumber = req.body.phoneNumber;

  const q = `select * from user where email='${email}'`;
  con.query(q, (err, rows) => {
    if (err) throw err;
    if (rows.length == 0) {
      const hash = SHA256(password).toString();
      const q =
        `INSERT INTO user (id, email, password, name, phoneNumber, role) VALUES` +
        `(NULL, '${email}', '${hash}', '${name}', '${phoneNumber}', ${role})`;
      con.query(q, (err, rows) => {
        if (err) {
          console.log(err);
          res.send(err);
        }

        if (rows.affectedRows == 1) {
          sendEmailRegister(email, res, rows.insertId);
        }
      });
    } else {
      res.status(400).send({
        msg: "Fail email already registered",
      });
    }
  });
});

router.post("/activeUser", (req, res) => {
  const id = req.body.id;

  const q = `update user set status=1 where id=${id}`;
  con.query(q, (err, rows) => {
    if (err) throw err;

    if (rows.affectedRows == 1) {
      res.send({
        status: true,
        msg: "Activation success",
      });
    }
  });
});

router.get("/getInfo", (req, res) => {
  const token = req.query.token;
  //console.log(token);
  try {
    var decoded = jwt.verify(token, "217116596");
    const q = `select email, name, phoneNumber, role, saldo, status, image from user where id=${decoded.id}`;
    con.query(q, (err, rows) => {
      if (err) throw err;
      res.send(rows[0]);
    });
  } catch (err) {
    res.send(err);
  }
});

router.get("/getInstructorInfo", (req, res) => {
  const token = req.query.token;
  //console.log(token);
  try {
    var decoded = jwt.verify(token, "217116596");
    const q = `select * from instructor where idUser=${decoded.id}`;
    con.query(q, (err, rows) => {
      if (err) throw err;
      //console.log(rows[0]);
      res.send(rows[0]);
    });
  } catch (err) {
    res.send(err);
  }
});

router.get("/getInstructorDetail", (req, res) => {
  const id = req.query.id;
  const q = `select u.name, u.phoneNumber, u.image, i.katagoriDetail, i.berkas, i.instructorDetail, u.email, i.katagori, i.timeStart, i.timeEnd, i.activeDays from instructor i, user u where i.idUser=u.id and u.id=${id}`;
  con.query(q, (err, rows) => {
    if (err) throw err;
    //console.log(rows[0]);
    res.send(rows[0]);
  });
});

router.post("/registerInstructor", uploadBerkas, (req, res) => {
  const token = req.body.token;
  const katagori = req.body.katagori;
  const katagoriDetail = req.body.katagoriDetail;
  var detail = req.body.detail + "";
  detail = detail.toString().replaceAll("'", `\\'`);
  detail = detail.toString().replaceAll('"', `\\"`);
  const timeStart = moment(req.body.timeStart).format("HH:mm:ss");
  const timeEnd = moment(req.body.timeEnd).format("HH:mm:ss");
  const availableDay = req.body.availableDay;
  try {
    const file = req.file;
    const lokasi = `/public/uploads/berkas/${file.filename}`;
    var decoded = jwt.verify(token, "217116596");
    const q = `INSERT INTO instructor (idUser, name, instructorDetail, katagori, katagoriDetail, valid, berkas, timeStart, timeEnd, activeDays) VALUES (${
      decoded.id
    }, '${
      decoded.name
    }', '${detail}', ${katagori}, '${katagoriDetail}', 0, '${lokasi}', '${timeStart}', '${timeEnd}', '${availableDay.toString()}')`;
    //console.log(q);
    //console.log(decoded);
    con.query(q, (err, rows) => {
      if (err) console.log(err);
      if (rows.affectedRows == 1) {
        res.status(200).send({
          status: true,
          msg: "Success register instructor",
        });
      }
    });
  } catch (error) {
    console.log(error);
    //res.send(error);
  }
});

router.get("/getInstructorList", (req, res) => {
  const katagori = req.query.katagori;
  const q = `select u.id, u.email, u.name, u.phoneNumber, u.image, i.katagoriDetail from user u, instructor i where u.id=i.idUser and valid=1 and role=2 and katagori=${katagori}`;
  //console.log(q);
  con.query(q, (err, rows) => {
    if (err) throw err;
    //console.log(rows);
    res.send(rows);
  });
});

router.post("/updateUser", uploadUserProfile, (req, res) => {
  const token = req.body.token;
  const name = req.body.name;
  const phone = req.body.phoneNumber;
  const file = req.file;
  //console.log(token);
  if (file) {
    //ada gambar

    try {
      var decoded = jwt.verify(token, "217116596");
      const lokasi = `/public/uploads/userProfile/${file.filename}`;
      const q = `update user set name='${name}', phoneNumber='${phone}', image='${lokasi}' where id=${decoded.id}`;
      con.query(q, (err, rows) => {
        if (err) throw err;
        res.send({ status: true, msg: "success update profile" });
      });
    } catch (error) {
      console.log(error);
      res.send(error);
    }
  } else {
    //tidak ada gambar
    console.log("tidak ada gambar");
    try {
      var decoded = jwt.verify(token, "217116596");

      const q = `update user set name='${name}', phoneNumber='${phone}' where id=${decoded.id}`;
      con.query(q, (err, rows) => {
        if (err) throw err;
        res.send({ status: true, msg: "success update profile" });
      });
    } catch (error) {
      console.log(error);
      res.send(error);
    }
  }
});

router.post("/updateInstructor", uploadUserProfile, async (req, res) => {
  const token = req.body.token;
  const name = req.body.name;
  const phone = req.body.phoneNumber;
  var detail = req.body.detail + "";
  const timeStart = moment(req.body.timeStart).format("HH:mm");
  const timeEnd = moment(req.body.timeEnd).format("HH:mm");
  const file = req.file;
  const activeDays = req.body.activeDays;
  const katagoriDetail = req.body.katagoriDetail;

  detail = detail.toString().replaceAll("'", `\\'`);
  detail = detail.toString().replaceAll('"', `\\"`);

  //console.log(token);
  if (file) {
    //ada gambar

    try {
      var decoded = jwt.verify(token, "217116596");

      // const updateDetailInstructor = await updateDetailInstructor(
      //   decoded.id,
      //   detail,
      //   timeStart,
      //   timeEnd
      // );

      const qIns = `update instructor set instructorDetail='${detail}', timeStart='${timeStart}', timeEnd='${timeEnd}', activeDays='${activeDays.toString()}', katagoriDetail='${katagoriDetail}' where idUser=${
        decoded.id
      }`;
      console.log(qIns);
      con.query(qIns, (err, rows) => {
        if (err) throw err;

        if (rows.affectedRows == 1) {
          const lokasi = `/public/uploads/userProfile/${file.filename}`;
          const q = `update user set name='${name}', phoneNumber='${phone}', image='${lokasi}' where id=${decoded.id}`;
          con.query(q, (err, rows) => {
            if (err) throw err;
            res.send({ status: true, msg: "success update profile" });
          });
        }
      });
    } catch (error) {
      console.log(error);
      res.send(error);
    }
  } else {
    //tidak ada gambar
    console.log("tidak ada gambar");
    try {
      var decoded = jwt.verify(token, "217116596");

      const query = util.promisify(con.query).bind(con);
      const q1 = `update instructor set instructorDetail='${detail}', timeStart='${timeStart}', timeEnd='${timeEnd}', activeDays='${activeDays.toString()}', katagoriDetail='${katagoriDetail}' where idUser=${
        decoded.id
      }`;
      console.log(q1);
      const hasil = await query(q1);

      const q = `update user set name='${name}', phoneNumber='${phone}' where id=${decoded.id}`;
      con.query(q, (err, rows) => {
        if (err) throw err;
        res.send({ status: true, msg: "success update profile" });
      });
    } catch (error) {
      console.log(error);
      res.send(error);
    }
  }
});

router.post("/updateBerkas", uploadBerkas, async (req, res) => {
  const token = req.body.token;
  const file = req.file;
  const lokasi = `/public/uploads/berkas/${file.filename}`;

  try {
    var decoded = jwt.verify(token, "217116596");
    const q = `update instructor set berkas='${lokasi}' where idUser=${decoded.id}`;
    con.query(q, (err, rows) => {
      if (err) throw err;
      if (rows.affectedRows == 1) {
        res.send({ status: true, msg: "Success update document" });
      }
    });
  } catch (error) {
    console.log(error);
  }
});

router.post("/addClass", uploadClassImage, (req, res) => {
  const token = req.body.token;
  const title = req.body.title;
  let detail = req.body.detail + "";
  const duration = req.body.duration;
  const price = req.body.price;
  const classCount = req.body.classCount;

  detail = detail.toString().replaceAll("'", `\\'`);
  detail = detail.toString().replaceAll('"', `\\"`);

  try {
    var decoded = jwt.verify(token, "217116596");
    if (decoded.role == 2) {
      const file = req.file;
      const lokasi = `/public/uploads/classImage/${file.filename}`;
      const q = `INSERT INTO class (id, idInstructor, title, detail, duration, price, image, classCount) VALUES (NULL, ${decoded.id}, '${title}', '${detail}', ${duration}, ${price}, '${lokasi}', ${classCount})`;

      con.query(q, (err, rows) => {
        if (err) console.log(err);
        if (rows.affectedRows == 1) {
          res.status(200).send({
            status: true,
            msg: "Success add class",
          });
        }
      });
    } else {
      res.status(200).send({
        status: false,
        msg: "Only for Instructor",
      });
    }
  } catch (error) {
    console.log(error);
    //res.send(error);
  }
});

router.get("/getClassList", (req, res) => {
  const token = req.query.token;
  if (token) {
    //ada token
    //berguna untuk me load class yang sudah terdaftar (fitur instructor)
    try {
      var decoded = jwt.verify(token, "217116596");
      if (decoded.role == 2) {
        const q = `select * from class where idInstructor=${decoded.id} and status != 0`;
        con.query(q, (err, rows) => {
          if (err) throw err;
          res.send({
            status: true,
            rows: rows,
          });
        });
      } else {
        res.send({
          status: false,
          msg: "Not Instructor",
        });
      }
    } catch (error) {
      console.log(error);
      res.send(error);
    }
  } else {
    //tidak ada token
    //berguna untuk load class oleh user
    const idInstructor = req.query.idInstructor;
    const q = `select * from class where idInstructor=${idInstructor} and status != 0`;
    con.query(q, (err, rows) => {
      if (err) throw err;
      res.send({
        status: true,
        rows: rows,
      });
    });
  }
});

router.get("/getClassDetail", (req, res) => {
  const id = req.query.id;
  const q = `select * from class c, instructor i where c.id=${id} and c.idInstructor=i.idUser`;
  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows[0]);
  });
});

router.post("/registerClass", (req, res) => {
  const token = req.body.token;
  const duration = req.body.duration;
  const dateStart = req.body.dateStart;
  const dateEnd = req.body.dateEnd;
  const idClass = req.body.idClass;

  try {
    const decoded = jwt.verify(token, "217116596");
    const idUser = decoded.id;
    const q = `INSERT INTO schedule (id, idUser, idClass, duration, dateStart, dateEnd) VALUES (NULL, ${idUser}, ${idClass}, ${duration}, '${dateStart}', '${dateEnd}')`;
    con.query(q, (err, rows) => {
      if (err) console.log(err);
      if (rows.affectedRows == 1) {
        res.status(200).send({
          status: true,
          msg: "Success register class",
        });
      }
    });
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

async function checkSubmission(idUser, idInstructor, dateStart, dateEnd) {
  const query = util.promisify(con.query).bind(con);
  const q =
    `select s.dateStart, s.dateEnd, c.title from submission s, class c where c.id=s.idClass and ` +
    `('${dateStart}' between s.dateStart and s.dateEnd or ` +
    `'${dateEnd}' between s.dateStart and s.dateEnd or ` +
    `(s.dateStart >= '${dateStart}' and s.dateEnd <= '${dateEnd}')) and (s.idUser=${idUser} or s.idInstructor=${idInstructor}) and s.status != 3 and s.status != 2;`;
  const hasil = await query(q);
  return hasil;
}

router.post("/submissionClass", async (req, res) => {
  const token = req.body.token;
  const idClass = req.body.idClass;
  const idInstructor = req.body.idInstructor;
  const dateStart = req.body.dateStart;
  const dateEnd = req.body.dateEnd;

  //res.send({ jml: dateStart.length });
  //res.send(dateEnd);

  try {
    const decoded = jwt.verify(token, "217116596");
    const idUser = decoded.id;
    let ctr = 0;
    const query = util.promisify(con.query).bind(con);

    let intersecDate = [];

    for (let index = 0; index < dateStart.length; index++) {
      const data = await checkSubmission(
        idUser,
        idInstructor,
        dateStart[index],
        dateEnd[index]
      );
      console.log(data);
      intersecDate.push(data);
    }

    let intersec = false;
    for (let index = 0; index < intersecDate.length; index++) {
      const element = intersecDate[index];
      //console.log(element);
      if (element.length > 0) {
        intersec = true;
      }
    }

    if (!intersec) {
      //res.send("tidak ada jadwal menumpuk");

      const qHSubmission = `INSERT INTO hSubmission (id, idUser, idInstructor, idClass, status) VALUES (NULL, ${idUser}, ${idInstructor}, ${idClass}, 5);`;

      const hasilHSubmission = await query(qHSubmission);

      //console.log(hasilHSubmission);

      for (let index = 0; index < dateStart.length; index++) {
        checkSubmission(idUser, idInstructor, dateStart, dateEnd);
        const q = `INSERT INTO submission (id, idHSubmission, idUser, idInstructor, idClass, dateStart, dateEnd) VALUES (NULL, ${hasilHSubmission.insertId}, ${idUser}, ${idInstructor}, ${idClass}, '${dateStart[index]}', '${dateEnd[index]}')`;
        const hasil = await query(q);
        if (hasil.affectedRows == 1) {
          ctr++;
        }
      }
      if (ctr == dateStart.length) {
        res.status(200).send({
          status: true,
          msg: "Success submit class",
          data: hasilHSubmission,
        });
      }
    } else {
      res.send({
        status: false,
        msg: "Ada jadwal yang menumpuk",
        data: intersecDate[0],
      });
    }
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

router.get("/getSubmission", (req, res) => {
  const token = req.query.token;
  const id = req.query.id;
  try {
    const decoded = jwt.verify(token, "217116596");
    const q =
      `select s.id, c.title, u.name, s.dateStart, s.dateEnd, s.idUser, s.status, c.id as idClass ` +
      `from submission s, user u, class c ` +
      `where s.idInstructor=${decoded.id} and u.id=s.idUser and s.idClass=c.id and s.idHsubmission=${id}`;
    con.query(q, (err, rows) => {
      res.send(rows);
    });
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

router.get("/getSubmissionByIdsubmission", (req, res) => {
  const idHSubmission = req.query.idHsubmission;
  const q = `select * from submission where idHsubmission=${idHSubmission}`;
  con.query(q, (err, rows) => {
    res.send(rows);
  });
});

router.get("/getHSubmission", (req, res) => {
  const token = req.query.token;

  try {
    const decoded = jwt.verify(token, "217116596");
    //console.log("id user : " + decoded.id);
    const q = `select * from hSubmission where idInstructor=${decoded.id}`;
    console.log(q);
    con.query(q, (err, rows) => {
      res.send(rows);
    });
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

router.get("/getHSubmissionbyID", (req, res) => {
  const id = req.query.id;

  try {
    const q =
      `select u.name, c.title, c.image, i.name as iName, h.timeInsert, h.status, h.id, c.title, c.price, c.duration, u.image as userImage, u.id as idUser ` +
      `from hSubmission h, user u, instructor i, class c ` +
      `where u.id = h.idUser and i.idUser = h.idInstructor and c.id = h.idClass and h.id=${id}`;
    console.log(q);
    con.query(q, (err, rows) => {
      res.send(rows);
    });
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

router.post("/declineClass", async (req, res) => {
  const idUser = req.body.idUser;
  const price = req.body.price;

  const q = `select * from user where id=${idUser}`;
  console.log(q);

  const query = util.promisify(con.query).bind(con);

  const hasil = await query(q);

  const saldo = hasil[0].saldo;

  const q2 = `update user set saldo=${saldo + price} where id=${idUser}`;

  con.query(q2, (err, rows) => {
    if (err) throw err;
    if (rows.affectedRows == 1) {
      res.send({
        status: true,
        msg: "Success refund moneyd",
      });
    }
  });
});

router.post("/sendMoney", async (req, res) => {
  //const idHsubmission = req.body.idHSubmission;
  const idClass = req.body.idClass;
  const idSubmission = req.body.idSubmission;

  const q = `select * from class where id=${idClass}`;

  const query = util.promisify(con.query).bind(con);

  const hasil = await query(q);

  const gaji = hasil[0].price / hasil[0].classCount;

  const q2 = `select * from user where id=${hasil[0].idInstructor}`;

  const hasil2 = await query(q2);

  const saldo = hasil2[0].saldo + gaji;

  const q3 = `update user set saldo=${saldo} where id=${hasil[0].idInstructor}`;

  const hasil3 = await query(q3);

  const q4 = `update submission set status=1 where id=${idSubmission}`;

  const hasil4 = await q4;

  res.send(hasil4);
});

async function sendMoney(query, idClass) {
  const q = `select * from class where id=${idClass}`;

  const hasil = await query(q);

  const gaji = hasil[0].price / hasil[0].classCount;

  const q2 = `select * from user where id=${hasil[0].idInstructor}`;

  const hasil2 = await query(q2);

  const gajiInstructor = (gaji * 95) / 100;
  const gajiAdmin = (gaji * 5) / 100;

  const saldo = hasil2[0].saldo + gajiInstructor;

  const q3 = `update user set saldo=${saldo} where id=${hasil[0].idInstructor}`;

  const queryGajiAdmin = await sendMoneyToAdmin(query, gajiAdmin);

  const hasil3 = await query(q3);
}

async function sendMoneyToAdmin(query, amount) {
  const q = `select * from user where role=3`;
  const dataAdmin = await query(q);

  const saldoBaru = dataAdmin[0].saldo + amount;

  const q2 = `update user set saldo=${saldoBaru} where role=3`;
  const updateSaldo = await query(q2);
}

async function checkClassDone(query, idClass, idHSubmission) {
  const q3 = `select * from class where id=${idClass}`;

  const dataClass = await query(q3);

  const classCount = dataClass[0].classCount;

  const q4 = `select * from submission where idHsubmission=${idHSubmission} and status=3`;
  const dataSubmission = await query(q4);

  if (dataSubmission.length == classCount) {
    console.log("kelas sudah selesai");

    const q5 = `update hSubmission set status=3 where idHsubmission=${idHSubmission}`;

    const updateHSubmission = await query(q5);

    if (updateHSubmission.affectedRows == 1) {
      return true;
    } else {
      return false;
    }
  }
}

router.post("/finishClass", async (req, res) => {
  const idSubmission = req.body.idSubmission;

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

    res.send({
      status: true,
      msg: "Success finish this class",
      saldo: updateSaldo,
    });
  } else {
    res.send({
      status: true,
      msg: "Class not finished yet",
    });
  }
});

router.post("/actionClass", async (req, res) => {
  const action = req.body.action;
  const token = req.body.token;
  const id = req.body.id;
  const idUser = req.body.idUser;
  const saldoUser = req.body.saldoUser;
  const price = req.body.price;

  try {
    var decoded = jwt.verify(token, "217116596");
    if (decoded.role == 2) {
      let q = `update hSubmission set status=${action} where id=${id}`;
      const query = util.promisify(con.query).bind(con);
      let hasil = await query(q);
      console.log(hasil);

      if (hasil.affectedRows == 1) {
        let q2 = `update submission set status=${action} where idHsubmission=${id}`;
        const query2 = util.promisify(con.query).bind(con);
        let hasil2 = await query2(q2);
        //console.log(hasil2);

        if (action == 2) {
          //ins menolak kelas
          const newSaldo = saldoUser + price;
          const qKembali = `update user set saldo=${newSaldo} where id=${idUser}`;
          const hasilKembaliUangUser = await query(qKembali);

          const qIncome = `INSERT INTO income (id, idUser, idHsubmission, amount, type, date) VALUES (NULL, ${idUser}, ${id}, ${price}, 2, current_timestamp())`;
          const hasilInsertIncome = await query(qIncome);
        }

        if (hasil2.affectedRows > 0) {
          res.send({
            status: true,
            msg: "success update status",
          });
        } else {
          res.send({
            status: false,
            msg: "fail update status",
          });
        }
      }
    } else {
      res.send({
        status: false,
        msg: "Not Instructor",
      });
    }
  } catch (error) {
    console.log(error);
  }
});

router.get("/instructorEvent", (req, res) => {
  const token = req.query.token;
  try {
    var decoded = jwt.verify(token, "217116596");
    const q = `select u.name, s.dateStart, s.dateEnd, s.status, c.title from submission s, class c, user u where s.idInstructor=${decoded.id} and s.status != 4 and c.id=s.idClass and u.id = s.idUser and s.dateStart > now() order by s.dateStart asc`;
    //console.log(q);
    con.query(q, (err, rows) => {
      //console.log(rows);
      res.send(rows);
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/userEvent", (req, res) => {
  const token = req.query.token;

  try {
    var decoded = jwt.verify(token, "217116596");
    const q = `select u.name, s.dateStart, s.dateEnd, s.status, c.title from submission s, class c, user u where s.idUser=${decoded.id} and s.status = 1 and c.id=s.idClass and u.id = s.idUser`;
    console.log(q);
    con.query(q, (err, rows) => {
      res.send(rows);
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/instructorConfirmedSchedule", (req, res) => {
  const token = req.query.token;
  try {
    var decoded = jwt.verify(token, "217116596");
    const q = `select u.name, s.dateStart, s.dateEnd, s.status, c.title from submission s, class c, user u where s.idInstructor=${decoded.id} and s.status = 1 and c.id=s.idClass and u.id = s.idUser`;
    con.query(q, (err, rows) => {
      res.send(rows);
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/getSchedule", (req, res) => {
  const token = req.query.token;
  try {
    var decoded = jwt.verify(token, "217116596");
    var q = ``;
    //console.log(decoded);
    if (decoded.role == 1) {
      q =
        `select u.name, c.title, c.image, i.name as iName, h.timeInsert, h.status, h.id, h.linkPayment ` +
        `from hSubmission h, user u, instructor i, class c ` +
        `where u.id = h.idUser and i.idUser = h.idInstructor and c.id = h.idClass and u.id = ${decoded.id} order by h.timeInsert desc`;
    } else {
      q =
        `select u.name, c.title, c.image, i.name as iName, h.timeInsert, h.status, h.id ` +
        `from hSubmission h, user u, instructor i, class c ` +
        `where u.id = h.idUser and i.idUser = h.idInstructor and c.id = h.idClass and h.status != 5 and i.idUser = ${decoded.id} order by h.timeInsert desc`;
    }
    //console.log(q);
    con.query(q, (err, rows) => {
      if (err) console.log(err);
      res.send(rows);
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/getClassList", (req, res) => {
  const token = req.query.token;
  try {
    var decoded = jwt.verify(token, "217116596");
    const q = `select * from class where idInstructor=${decoded.id}`;
    con.query(q, (err, rows) => {
      if (err) throw err;
      res.send(rows);
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/getReview", (req, res) => {
  const token = req.query.token;

  try {
    var decoded = jwt.verify(token, "217116596");

    const q = `select u.name, r.rating, r.comment, c.title, r.createAt from review r, user u, class c, hSubmission h where idTo=${decoded.id} and r.idFrom=u.id and r.idHSubmission=h.id and h.idClass = c.id order by r.createAt desc`;

    con.query(q, (err, rows) => {
      if (err) throw err;
      res.send(rows);
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/getReviewByID", (req, res) => {
  const idInstructor = req.query.id;
  const q = `select u.name, r.rating, r.comment, c.title from review r, user u, hSubmission h, class c where idTo = ${idInstructor} and r.idFrom = u.id and h.id=r.idHSubmission and h.idClass=c.id`;
  console.log(q);
  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

router.post("/postReview", (req, res) => {
  const token = req.body.token;
  const idTo = req.body.idTo;
  const rating = req.body.rating;
  const comment = req.body.comment;

  try {
    var decoded = jwt.verify(token, "217116596");

    const q = `INSERT INTO review (id, idTo, idFrom, rating, comment, createAt) VALUES (NULL, ${idTo}, ${decoded.id}, ${rating}, '${comment}', current_timestamp())`;

    con.query(q, (err, rows) => {
      if (err) console.log(err);
      if (rows.affectedRows == 1) {
        res.status(200).send({
          status: true,
          msg: "Success add review",
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
});

// router.post("/userPay", (req, res) => {
//   const order_id = req.body.order_id;
//   const gross_amount = req.body.gross_amount;
//   console.log(order_id);
//   const token = req.body.token;
//   //console.log(token);
//   try {
//     var decoded = jwt.verify(token, "217116596");
//     let snap = new midtransClient.Snap({
//       // Set to true if you want Production Environment (accept real transaction).
//       isProduction: false,
//       serverKey: "SB-Mid-server-XESumlYA6kMhu4f4yT8KLauT",
//     });

//     let parameter = {
//       transaction_details: {
//         order_id: order_id,
//         gross_amount: gross_amount,
//       },
//       credit_card: {
//         secure: true,
//       },
//       customer_details: {
//         first_name: decoded.name,
//         email: decoded.email,
//         phone: decoded.phoneNumber,
//       },
//     };

//     snap.createTransaction(parameter).then((transaction) => {
//       // transaction token
//       let transactionToken = transaction.token;

//       console.log(transactionToken);
//       res.send(transactionToken);
//     });
//   } catch (error) {
//     console.log(error);
//   }
// });

// router.post("/finishPayment", (req, res) => {
//   const token = req.body.token;

//   try {
//     var decoded = jwt.verify(token, "217116596");
//     const order_id = req.body.order_id;
//     const transaction_id = req.body.transaction_id;
//     const transaction_type = req.body.transaction_type;
//     const transaction_status_code = req.body.transaction_status_code;
//     const transaction_hSubmission_id = req.body.transaction_hSubmission_id;
//     const transaction_time = req.body.transaction_time;

//     const q =
//       `INSERT INTO transaction (order_id, transaction_code, transaction_type, transaction_status_code, transaction_hSubmission_id, transaction_time, transaction_user_id) ` +
//       `VALUES ('${order_id}', '${transaction_id}', '${transaction_type}', ${transaction_status_code}, ${transaction_hSubmission_id}, '${transaction_time}', ${decoded.id})`;

//     con.query(q, (err, rows) => {
//       if (err) throw err;
//       if (rows.affectedRows == 1) {
//         res.send({
//           status: true,
//           msg: "Success add transaction",
//         });
//       }
//     });
//   } catch (error) {
//     console.log(error);
//   }
// });

// router.post("/unFinishedPayment", (req, res) => {
//   const insertId = req.body.insertId;

//   const q1 = `delete from hsubmission where id=${insertId}`;

//   con.query(q1, (err, rows) => {
//     if (err) throw err;
//     const q2 = `delete from submission where idHsubmission=${insertId}`;
//     con.query(q2, (err2, rows2) => {
//       if (err2) throw err2;
//       res.send({
//         status: true,
//         msg: "Success process unfinished payment",
//       });
//     });
//   });
// });

router.post("/deleteClass", (req, res) => {
  const idClass = req.body.idClass;

  const q = `update class set status=0 where id=${idClass}`;
  console.log(q);
  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send({
      status: true,
      msg: "Success deactived class",
    });
  });
});

router.post("/activedClass", (req, res) => {
  const idClass = req.body.idClass;

  const q = `update class set status=1 where id=${idClass}`;
  console.log(q);
  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send({
      status: true,
      msg: "Success actived class",
    });
  });
});

const x = new Xendit({
  secretKey:
    "xnd_development_gZ6UwlJq2YDJg9U046XEA91ueFkMsjCjWa0boSgIXE2Lygo6ko3zadK0l6gXw",
});

router.post("/xenditPAY", async (req, res) => {
  const token = req.body.token;
  const amount = req.body.amount;
  const id = req.body.id;

  const { Invoice } = x;
  const invoiceSpecificOptions = {};
  const i = new Invoice(invoiceSpecificOptions);

  try {
    var decoded = jwt.verify(token, "217116596");

    const resp = await i.createInvoice({
      externalID: "demo_" + id,
      amount: amount,
      payerEmail: decoded.email,
      description: "Payment for T-DEMY",
    });
    const q = `update hSubmission set linkPayment='${resp.invoice_url}' where id=${id}`;
    con.query(q, (err, rows) => {
      if (err) throw err;
      if (rows.affectedRows == 1) {
        console.log("success");
      }
    });
    res.send(resp);
  } catch (error) {
    console.log(error);
  }
});

router.get("/getBank", async (req, res) => {
  const { Disbursement } = x;
  const disbursementSpecificOptions = {};
  const d = new Disbursement(disbursementSpecificOptions);

  const bankList = await d.getBanks();

  res.send(bankList);
});

router.post("/addBankAccount", (req, res) => {
  const token = req.body.token;
  const bankCode = req.body.bankCode;
  const accountHolderName = req.body.accountHolderName;
  const accountNumber = req.body.accountNumber;

  try {
    var decoded = jwt.verify(token, "217116596");

    const q = `INSERT INTO bankAccount (id, idUser, bankCode, accountHolderName, accountNumber) VALUES (NULL, ${decoded.id}, '${bankCode}', '${accountHolderName}', '${accountNumber}')`;

    con.query(q, (err, rows) => {
      if (err) throw err;
      if (rows.affectedRows == 1) {
        res.status(200).send({
          status: true,
          msg: "Success insert bank account",
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
});

router.post("/updateBankAccount", (req, res) => {
  const token = req.body.token;
  const bankCode = req.body.bankCode;
  const accountHolderName = req.body.accountHolderName;
  const accountNumber = req.body.accountNumber;

  try {
    var decoded = jwt.verify(token, "217116596");

    const q = `update bankAccount set bankCode='${bankCode}', accountHolderName='${accountHolderName}', accountNumber='${accountNumber}' where idUser=${decoded.id}`;

    con.query(q, (err, rows) => {
      if (err) throw err;
      if (rows.affectedRows == 1) {
        res.status(200).send({
          status: true,
          msg: "Success edit bank account information",
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/getBankAccountInformation", (req, res) => {
  const token = req.query.token;

  try {
    var decoded = jwt.verify(token, "217116596");

    const q = `select * from bankAccount where idUser=${decoded.id}`;

    con.query(q, (err, rows) => {
      if (err) throw err;
      res.send(rows);
    });
  } catch (error) {
    console.log(error);
  }
});

router.post("/cashOut", async (req, res) => {
  const token = req.body.token;
  const amount = req.body.amount;
  const accountHolderName = req.body.accountHolderName;
  const accountNumber = req.body.accountNumber;
  const bankCode = req.body.bankCode;
  const saldoBaru = req.body.saldoBaru;

  try {
    var decoded = jwt.verify(token, "217116596");

    const q = `INSERT INTO dirbushment (id, idUser, dirbushmentId, amount, bankCode, accountHolderName, accountNumber, status) VALUES (NULL, ${decoded.id}, '', ${amount}, '${bankCode}', '${accountHolderName}', '${accountNumber}', 0)`;

    con.query(q, async (err, rows) => {
      if (err) throw err;
      //res.send(rows);

      const { Disbursement } = x;
      const disbursementSpecificOptions = {};
      const d = new Disbursement(disbursementSpecificOptions);

      d.create({
        externalID: "myDirbushment-" + rows.insertId,
        bankCode: bankCode,
        accountHolderName: accountHolderName,
        accountNumber: accountNumber,
        description: "description",
        amount: amount,
      })
        .then(({ id }) => {
          console.log(`Disbursement created with ID: ${id}`);
          const q2 = `update dirbushment set dirbushmentId='${id}' where id=${rows.insertId}`;

          con.query(q2, (err2, rows2) => {
            if (err2) throw err2;
            if (rows2.affectedRows == 1) {
              const q3 = `update user set saldo=${saldoBaru} where id=${decoded.id}`;

              con.query(q3, (err3, rows3) => {
                if (err3) throw err3;
                if (rows3.affectedRows == 1) {
                  res.send({
                    status: true,
                    msg: "Success create dirbushment",
                  });
                }
              });
            }
          });
        })
        .catch((e) => {
          console.log(e);
          console.error(
            `Disbursement creation failed with message: ${e.message}`
          );
        });
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/dirbushmentHistory", (req, res) => {
  const token = req.query.token;

  try {
    var decoded = jwt.verify(token, "217116596");

    const q = `select * from dirbushment where idUser=${decoded.id}`;

    con.query(q, (err, rows) => {
      if (err) throw err;
      res.send(rows);
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/getHSubmissionDone", (req, res) => {
  const token = req.query.token;

  try {
    var decoded = jwt.verify(token, "217116596");

    const q = `select h.id, h.timeInsert, i.name, c.image, c.title, c.price, i.idUser from hSubmission h, class c, instructor i where h.idClass = c.id and h.idInstructor = i.idUser and h.idUser = ${decoded.id} and h.status=3`;

    con.query(q, (err, rows) => {
      if (err) throw err;
      //console.log(rows);
      res.send(rows);
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/getComment", (req, res) => {
  const idHSubmission = req.query.idHSubmission;

  const q = `select * from review where idHSubmission=${idHSubmission}`;

  con.query(q, (err, rows) => {
    if (err) throw err;
    console.log(rows);
    res.send(rows);
  });
});

router.post("/giveReview", (req, res) => {
  const token = req.body.token;

  const idHSubmission = req.body.idHSubmission;
  const idInstructor = req.body.idInstructor;
  const rating = req.body.rating;
  const comment = req.body.comment;

  try {
    var decoded = jwt.verify(token, "217116596");

    const q = `INSERT INTO review (id, idHSubmission, idTo, idFrom, rating, comment, createAt) VALUES (NULL, ${idHSubmission}, ${idInstructor}, ${decoded.id}, ${rating}, '${comment}', current_timestamp())`;

    console.log(q);
    con.query(q, (err, rows) => {
      if (err) throw err;
      if (rows.affectedRows == 1) {
        res.status(200).send({
          status: true,
          msg: "Success submit review",
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
});

router.post("/changePassword", (req, res) => {
  const currentPassword = req.body.currentPassword;
  const newPassword = req.body.newPassword;
  const token = req.body.token;

  try {
    var decoded = jwt.verify(token, "217116596");
    const q = `select * from user where id=${decoded.id}`;
    con.query(q, (err, rows) => {
      if (err) throw err;
      const password = rows[0].password;
      const currPassword = SHA256(currentPassword).toString();
      if (password == currPassword) {
        const q2 = `update user set password=${newPassword} where id=${decoded.id}`;
        con.query(q2, (err2, rows2) => {
          if (err2) throw err2;
          if (rows2.affectedRows == 1) {
            res.send({
              status: true,
              msg: "success change password",
            });
          }
        });
      } else {
        res.send({
          status: false,
          msg: "Current password didn't match",
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
});

router.post("/invoicesPaid", (req, res) => {
  const id = req.body.id;
  const amount = req.body.amount;
  const status = req.body.status;
  const created_at = moment(req.body.created).format("YYYY-MM-DD HH:mm:ss");
  const paid_at = moment(req.body.paid_at).format("YYYY-MM-DD HH:mm:ss");
  const updated = moment(req.body.updated).format("YYYY-MM-DD HH:mm:ss");
  const bank_code = req.body.bank_code;
  const payer_email = req.body.payer_email;
  const external_id = req.body.external_id + "";

  const external_idArr = external_id.split("_");
  console.log(external_idArr[1]);

  const q = `INSERT INTO transaction (id, amount, status, created_at, paid_at, updated, bank_code, payer_email, external_id) VALUES ('${id}', ${amount}, '${status}', '${created_at}', '${paid_at}', '${updated}', '${bank_code}', '${payer_email}', '${external_idArr[1]}')`;

  con.query(q, (err, rows) => {
    if (err) console.log(err);
  });
  if (status == "PAID") {
    const qUpdateHSubmission = `update hSubmission set status=0 where id=${external_idArr[1]}`;
    con.query(qUpdateHSubmission, (err, rows) => {
      if (err) throw err;

      res.send(rows);
    });
  } else if (status == "EXPIRED") {
    const qUpdateHSubmission = `update hSubmission set status=4 where id=${external_idArr[1]}`;
    con.query(qUpdateHSubmission, (err, rows) => {
      if (err) throw err;

      const qUpdateSubmission = `update submission set status=3 where idHsubmission=${external_idArr[1]}`;

      con.query(qUpdateSubmission, (err2, rows2) => {
        if (err2) throw err2;

        res.send(rows2);
      });
    });
  }
});

router.get("/instructorSchedule", (req, res) => {
  const idInstructor = req.query.id;

  const q = `select * from submission where idInstructor=${idInstructor} and status=1`;
  //console.log(q);

  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

router.get("/getUser", (req, res) => {
  const id = req.query.id;

  const q = `select * from user where id=${id}`;

  con.query(q, (err, rows) => {
    res.send(rows[0]);
  });
});

router.post("/deleteProfilePic", (req, res) => {
  const token = req.body.token;

  try {
    var decoded = jwt.verify(token, "217116596");

    const q = `update user set image='' where id=${decoded.id}`;

    con.query(q, (err, rows) => {
      if (err) throw err;
      if (rows.affectedRows == 1) {
        res.send({
          status: true,
          msg: "Success delete profile picture",
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
});

router.post("/submitReport", uploadReport, async (req, res) => {
  const token = req.body.token;
  const idSubmission = req.body.idSubmission;
  const message = req.body.message;
  const file = "/public/uploads/report/" + req.file.filename;

  const query = util.promisify(con.query).bind(con);

  try {
    var decoded = jwt.verify(token, "217116596");

    const q = `INSERT INTO report (id, idUser, idSubmission, message, image, status) VALUES (NULL, ${decoded.id}, ${idSubmission}, '${message}', '${file}', 2)`;

    const qSubmissionData = `select * from submission where id=${idSubmission}`;
    const hasilQSubmission = await query(qSubmissionData);
    const idHsubmission = hasilQSubmission[0].idHsubmission;

    const qUpdateSubmission = `update submission set status=5 where id=${idSubmission}`;
    const hasilUpdateSubmission = await query(qUpdateSubmission);

    const qUpdateHSubmission = `update hSubmission set status=6 where id=${idHsubmission}`;
    const executeQuery = await query(qUpdateHSubmission);

    if (hasilUpdateSubmission.affectedRows == 1) {
      con.query(q, (err, rows) => {
        if (err) throw err;
        if (rows.affectedRows == 1) {
          res.send({
            status: true,
            msg: "Success submit report to admin",
          });
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
});

router.get("/getReport", (req, res) => {
  const token = req.query.token;

  try {
    var decoded = jwt.verify(token, "217116596");
    const q = `select r.id, r.idUser, r.idSubmission, r.message, r.image, r.status, r.date, u.name, c.title, u.email, s.idInstructor from report r, user u, class c, submission s, instructor i where s.idInstructor=u.id and i.idUser=u.id and r.idSubmission=s.id and s.idClass=c.id and r.idUser=${decoded.id} order by r.date desc`;

    con.query(q, (err, rows) => {
      if (err) throw err;
      res.send(rows);
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/getClassDetailByIDSubmission", (req, res) => {
  const idSubmission = req.query.idSubmission;

  const q =
    "select c.title, c.image, s.dateStart, s.dateEnd " +
    "from submission s, hSubmission h, class c " +
    `where s.idHsubmission=h.id and h.idClass=c.id and s.id=${idSubmission}`;

  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

router.get("/getIncome", (req, res) => {
  const token = req.query.token;

  try {
    var decoded = jwt.verify(token, "217116596");
    var q = "";
    if (decoded.role == 1) {
      //role user
      q = `select h.timeUpdate as time, c.price as amount from hSubmission h, class c where h.idClass=c.id and h.status=7 and h.idUser=${decoded.id} order by 1 desc`;
    } else if (decoded.role == 2) {
      //role instructor
      q = `select h.timeUpdate as time, (c.price*95)/100 as amount from hSubmission h, class c where h.idClass=c.id and h.status=3 and h.idInstructor=${decoded.id}  order by 1 desc`;
    } else {
      //role admin
      q = `select h.timeUpdate as time, (c.price*5)/100 as amount from hSubmission h, class c where h.idClass=c.id and h.status=3 order by 1 desc`;
    }
    console.log(q);
    con.query(q, (err, rows) => {
      if (err) throw err;
      res.send(rows);
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/userSchedule", (req, res) => {
  const token = req.query.token;

  try {
    var decoded = jwt.verify(token, "217116596");
    const q = `select s.dateStart, s.dateEnd from submission s, hSubmission h where h.id=s.idHsubmission and s.idUser=${decoded.id} and s.status=1`;
    console.log(q);
    con.query(q, (err, rows) => {
      if (err) throw err;
      res.send(rows);
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/userReview", (req, res) => {
  const idTo = req.query.idUser;
  const idHSubmission = req.query.idHSubmission;

  const q = `select * from review where idTo=${idTo} and idHSubmission=${idHSubmission}`;

  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

router.post("/placeUserReview", (req, res) => {
  const token = req.body.token;
  const idTo = req.body.idUser;
  const rating = req.body.rating;
  const comment = req.body.comment;
  const idHSubmission = req.body.idHSubmission;

  try {
    var decoded = jwt.verify(token, "217116596");
    const idFrom = decoded.id;

    const q = `INSERT INTO review (id, idHSubmission, idTo, idFrom, rating, comment, createAt) VALUES (NULL, ${idHSubmission}, ${idTo}, ${idFrom}, ${rating}, '${comment}', current_timestamp())`;

    con.query(q, (err, rows) => {
      if (err) throw err;
      if (rows.affectedRows == 1) {
        res.send({
          status: true,
          msg: "Success place review to user",
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/getUserReview", (req, res) => {
  const idUser = req.query.idUser;

  const q = `select * from review r, user u where u.id=r.idFrom and idTo=${idUser}`;

  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

router.post("/insEndClass", (req, res) => {
  const idSubmission = req.body.idSubmission;

  const q = `update submission set status=4 where id=${idSubmission}`;

  con.query(q, (err, rows) => {
    if (err) throw err;

    if (rows.affectedRows == 1) {
      res.send({
        status: true,
        msg: "Success end Class",
      });
    }
  });
});

module.exports = router;
