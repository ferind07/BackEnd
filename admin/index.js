const express = require("express");
const router = express.Router();
const con = require("../skripsi_db_connection");

router.get("/allUser", (req, res) => {
  const q = `select email, name, phoneNumber, role, saldo, status from user where role != 3`;
  con.query(q, (err, rows) => {
    if (err) throw err;
    res.status(200).send(rows);
  });
});

router.post("/banUser", (req, res) => {
  const idUser = req.query.id;
  res.send(idUser);
});

module.exports = router;
