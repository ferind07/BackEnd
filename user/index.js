const express = require("express");
const router = express.Router();
const con = require("../skripsi_db_connection");
var SHA256 = require("crypto-js/sha256");

const fs = require("fs");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);

const nodeMailer = require("nodemailer");

var jwt = require("jsonwebtoken");

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
            name: data.name,
            phoneNumber: data.phoneNumber,
            saldo: data.saldo,
            role: data.role,
          },
          "217116596"
        );
        res.status(200).send({ msg: "Success login", token: token });
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

module.exports = router;
