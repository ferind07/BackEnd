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
          },

          "217116596",
          {
            expiresIn: "2d",
          }
        );
        res.status(200).send({
          msg: "Success login",
          token: token,
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
    console.log(rows.length);
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

router.post("/registerInstructor", uploadBerkas, (req, res) => {
  const token = req.body.token;
  const katagori = req.body.katagori;

  try {
    const file = req.file;
    const lokasi = `/public/uploads/berkas/${file.filename}`;
    var decoded = jwt.verify(token, "217116596");
    const q = `INSERT INTO instructor (idUser, katagori, valid, berkas) VALUES (${decoded.id}, ${katagori}, 0, '${lokasi}')`;
    console.log(q);
    console.log(decoded);
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
  const q = `select u.id, u.email, u.name, u.phoneNumber from user u, instructor i where u.id=i.idUser and valid=1 and role=2 and katagori=${katagori}`;
  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

router.post("/updateUser", (req, res) => {});

router.post("/addClass", uploadClassImage, (req, res) => {
  const token = req.body.token;
  const title = req.body.title;
  const detail = req.body.detail;
  const duration = req.body.duration;

  try {
    var decoded = jwt.verify(token, "217116596");
    if (decoded.role == 2) {
      const file = req.file;
      const lokasi = `/public/uploads/berkas/${file.filename}`;
      const q = `INSERT INTO class (id, idInstructor, title, detail, duration, image) VALUES (NULL, ${decoded.id}, '${title}', '${detail}', ${duration}, '${lokasi}')`;

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

module.exports = router;
