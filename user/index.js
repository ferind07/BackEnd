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
const midtransClient = require("midtrans-client");
// Create Snap API instance

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

const uploadBerkas = multer({
  storage: diskStorageBerkas,
}).single("berkas");

const uploadClassImage = multer({
  storage: diskStorageClassImage,
}).single("classImage");

const uploadUserProfile = multer({
  storage: diskStorageUserProfile,
}).single("userProfile");

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

router.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const hash = SHA256(password).toString();
  const q = `select * from user where email='${email}' and password='${hash}'`;
  //console.log(q);
  con.query(q, (err, rows) => {
    if (err) throw err;
    //res.send(rows);
    if (rows.length == 0) {
      res.status(201).send({ msg: "Wrong email/password" });
    } else {
      const data = rows[0];
      if (data.status != 0) {
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
    //console.log(rows.length);
    if (rows.length == 0) {
      const hash = SHA256(password).toString();
      const q =
        `INSERT INTO user (id, email, password, name, phoneNumber, role) VALUES` +
        `(NULL, '${email}', '${hash}', '${name}', '${phoneNumber}', ${role})`;
      //console.log(q);
      con.query(q, (err, rows) => {
        if (err) {
          console.log(err);
          res.send(err);
        }

        if (rows.affectedRows == 1) {
          res.status(200).send({
            msg: "Success register " + email,
          });
        }
      });
    } else {
      res.status(400).send({
        msg: "Fail email already registered",
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
  const q = `select u.name, u.phoneNumber, u.image, i.berkas, i.instructorDetail, u.email, i.katagori, i.timeStart, i.timeEnd from instructor i, user u where i.idUser=u.id and u.id=${id}`;
  con.query(q, (err, rows) => {
    if (err) throw err;
    //console.log(rows[0]);
    res.send(rows[0]);
  });
});

router.post("/registerInstructor", uploadBerkas, (req, res) => {
  const token = req.body.token;
  const katagori = req.body.katagori;
  const detail = req.body.detail;
  const timeStart = moment(req.body.timeStart).format("HH:mm:ss");
  const timeEnd = moment(req.body.timeEnd).format("HH:mm:ss");

  try {
    const file = req.file;
    const lokasi = `/public/uploads/berkas/${file.filename}`;
    var decoded = jwt.verify(token, "217116596");
    const q = `INSERT INTO instructor (idUser, name, instructorDetail, katagori, valid, berkas, timeStart, timeEnd) VALUES (${decoded.id}, '${decoded.name}', '${detail}', ${katagori}, 0, '${lokasi}', '${timeStart}', '${timeEnd}')`;
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
  const q = `select u.id, u.email, u.name, u.phoneNumber, u.image from user u, instructor i where u.id=i.idUser and valid=1 and role=2 and katagori=${katagori}`;
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
  const detail = req.body.detail;
  const timeStart = moment(req.body.timeStart).format("HH:mm");
  const timeEnd = moment(req.body.timeEnd).format("HH:mm");
  const file = req.file;
  //console.log(token);
  if (file) {
    //ada gambar

    try {
      var decoded = jwt.verify(token, "217116596");

      const updateDetailInstructor = await updateDetailInstructor(
        decoded.id,
        detail,
        timeStart,
        timeEnd
      );

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

      const query = util.promisify(con.query).bind(con);
      const q1 = `update instructor set instructorDetail='${detail}', timeStart='${timeStart}', timeEnd='${timeEnd}' where idUser=${decoded.id}`;
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

router.post("/addClass", uploadClassImage, (req, res) => {
  const token = req.body.token;
  const title = req.body.title;
  const detail = req.body.detail;
  const duration = req.body.duration;
  const price = req.body.price;
  const classCount = req.body.classCount;

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
        const q = `select * from class where idInstructor=${decoded.id}`;
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
    const q = `select * from class where idInstructor=${idInstructor}`;
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
    `select * from submission where ` +
    `('${dateStart}' between dateStart and dateEnd or ` +
    `'${dateEnd}' between dateStart and dateEnd or ` +
    `(dateStart >= '${dateStart}' and dateEnd <= '${dateEnd}')) and (idUser=${idUser} or idInstructor=${idInstructor});`;
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
      intersecDate.push(
        await checkSubmission(
          idUser,
          idInstructor,
          dateStart[index],
          dateEnd[index]
        )
      );
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

      const qHSubmission = `INSERT INTO hSubmission (id, idUser, idInstructor, idClass, status) VALUES (NULL, ${idUser}, ${idInstructor}, ${idClass}, 0);`;

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
        data: intersecDate,
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
      `select s.id, c.title, u.name, s.dateStart, s.dateEnd, s.idUser ` +
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
      `select u.name, c.title, c.image, i.name as iName, h.timeInsert, h.status, h.id ` +
      `from hSubmission h, user u, instructor i, class c ` +
      `where u.id = h.idUser and i.idUser = h.idInstructor and c.id = h.idClass and h.id=${id}`;
    con.query(q, (err, rows) => {
      res.send(rows);
    });
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

router.post("/actionClass", async (req, res) => {
  const action = req.body.action;
  const token = req.body.token;
  const id = req.body.id;

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
    const q = `select u.name, s.dateStart, s.dateEnd, s.status, c.title from submission s, class c, user u where s.idInstructor=${decoded.id} and s.status != 4 and c.id=s.idClass and u.id = s.idUser order by s.dateStart`;
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
    if (decoded.role == 1) {
      q =
        `select u.name, c.title, c.image, i.name as iName, h.timeInsert, h.status, h.id ` +
        `from hSubmission h, user u, instructor i, class c ` +
        `where u.id = h.idUser and i.idUser = h.idInstructor and c.id = h.idClass and u.id = ${decoded.id}`;
    } else {
      q =
        `select u.name, c.title, c.image, i.name as iName, h.timeInsert, h.status, h.id ` +
        `from hSubmission h, user u, instructor i, class c ` +
        `where u.id = h.idUser and i.idUser = h.idInstructor and c.id = h.idClass and i.idUser = ${decoded.id}`;
    }
    console.log(q);
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

    const q = `select * from review r, user u where idTo=${decoded.id} and r.idFrom=u.id`;

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
  const q = `select * from review r, user u where idTo = ${idInstructor} and r.idFrom = u.id`;
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

router.post("/userPay", (req, res) => {
  const order_id = req.body.order_id;
  const gross_amount = req.body.gross_amount;
  console.log(order_id);
  const token = req.body.token;
  //console.log(token);
  try {
    var decoded = jwt.verify(token, "217116596");
    let snap = new midtransClient.Snap({
      // Set to true if you want Production Environment (accept real transaction).
      isProduction: false,
      serverKey: "SB-Mid-server-XESumlYA6kMhu4f4yT8KLauT",
    });

    let parameter = {
      transaction_details: {
        order_id: order_id,
        gross_amount: gross_amount,
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        first_name: decoded.name,
        email: decoded.email,
        phone: decoded.phoneNumber,
      },
    };

    snap.createTransaction(parameter).then((transaction) => {
      // transaction token
      let transactionToken = transaction.token;

      console.log(transactionToken);
      res.send(transactionToken);
    });
  } catch (error) {
    console.log(error);
  }
});

router.post("/unFinishedPayment", (req, res) => {
  const insertId = req.body.insertId;

  const q1 = `delete from hsubmission where id=${insertId}`;

  con.query(q1, (err, rows) => {
    if (err) throw err;
    const q2 = `delete from submission where idHsubmission=${insertId}`;
    con.query(q2, (err2, rows2) => {
      if (err2) throw err2;
      res.send({
        status: true,
        msg: "Success process unfinished payment",
      });
    });
  });
});

router.post("/deleteClass", (req, res) => {
  const idClass = req.body.idClass;

  const q = `update class set status=0 where id=${idClass}`;
  console.log(q);
  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send({
      status: true,
      msg: "Success delete class",
    });
  });
});

module.exports = router;
