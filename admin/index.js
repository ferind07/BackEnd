const express = require("express");
const router = express.Router();
const con = require("../skripsi_db_connection");
var jwt = require("jsonwebtoken");

router.get("/allUser", (req, res) => {
  const q = `select email, name, phoneNumber, role, saldo, status from user where role != 3`;
  con.query(q, (err, rows) => {
    if (err) throw err;
    res.status(200).send(rows);
  });
});

router.get("/getUnApprovedInstructor", (req, res) => {
  const token = req.query.token;

  try {
    const decoded = jwt.verify(token, "217116596");

    if (decoded.role == 3) {
      const q =
        `SELECT u.id, u.email, u.name, u.phoneNumber, u.saldo, u.status, u.image, i.katagori, i.berkas, i.valid ` +
        `FROM instructor i, user u WHERE i.idUser = u.id AND i.valid = 0;`;

      con.query(q, (err, rows) => {
        if (err) throw err;
        res.status(200).send({
          status: true,
          rows: rows,
        });
      });
    } else {
      res.status(200).send({
        status: false,
        msg: "This feature only for admin",
      });
    }
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

router.post("/banUser", (req, res) => {
  const idUser = req.query.id;
  const status = req.query.status;
  const q = "";
  if (status == 1) {
    q = `update user set status=0 where id=${idUser}`;
  } else {
    q = `update user set status=1 where id=${idUser}`;
  }
  con.query(q, (err, rows) => {
    if (err) throw err;
    if (rows.affectedRows == 1) {
      res.status(200).send({
        msg: "Success",
      });
    }
  });
  res.send(idUser);
});

router.post("/approveInstructor", (req, res) => {
  const idUser = req.body.idUser;
  const q = `update instructor set valid=1 where idUser=${idUser}`;
  con.query(q, (err, rows) => {
    if (err) throw err;
    if (rows.affectedRows == 1) {
      res.status(200).send({
        status: true,
        msg: "Success approve instructor",
      });
    }
  });
});

module.exports = router;
