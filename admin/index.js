const express = require("express");
const router = express.Router();
const con = require("../skripsi_db_connection");
var jwt = require("jsonwebtoken");

router.get("/allUser", (req, res) => {
  const q = `select id, email, name, phoneNumber, role, saldo, status from user where role != 3`;
  con.query(q, (err, rows) => {
    if (err) throw err;
    res.status(200).send(rows);
  });
});

router.get("/allClass", (req, res) => {
  const q = `select * from class where status = 1`;
  con.query(q, (err, rows) => {
    if (err) throw err;
    res.status(200).send(rows);
  });
});

// router.get("/unApprovedInstructor", (req, res) => {
//   const q = `select * from instructor where valid`
// })

router.get("/getDetailInstructor", (req, res) => {
  const id = req.query.id;

  const q = `select * from instructor where idUser=${id}`;

  con.query(q, (err, rows) => {
    if (err) throw err;

    res.send(rows[0]);
  });
});

router.get("/getUserInfo", (req, res) => {
  const id = req.query.id;

  const q = `select * from user where id=${id}`;

  con.query(q, (err, rows) => {
    if (err) throw err;

    res.send(rows[0]);
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
  const idUser = req.body.id;
  const status = req.body.status;
  let q = "";
  if (status == 1) {
    q = `update user set status=0 where id=${idUser}`;
  } else {
    q = `update user set status=1 where id=${idUser}`;
  }
  //console.log(q);
  con.query(q, (err, rows) => {
    if (err) throw err;
    if (rows.affectedRows == 1) {
      res.status(200).send({
        msg: "Success",
      });
    }
  });
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

router.get("/incomeData", (req, res) => {
  const q = `select h.id as idHsubmission, c.price, h.timeUpdate from hSubmission h, class c where h.idClass=c.id and h.status=3`;

  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

router.get("/catagoryInfo", (req, res) => {
  const q = `select * from hSubmission h, instructor i where h.idInstructor=i.idUser and h.status!=0`;

  con.query(q, (err, rows) => {
    if (err) throw err;
    //console.log(rows);
    res.send(rows);
  });
});

router.get("/instructorCatagory", (req, res) => {
  const q = `select * from instructor`;

  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

router.get("/cashOutHistory", (req, res) => {
  const q = `select * from dirbushment d, user u where d.idUser=u.id`;

  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

router.get("/topUser", (req, res) => {
  const dateStart = req.query.dateStart;
  const dateEnd = req.query.dateEnd;

  const q =
    `select count(u.id) as total, sum(c.price) as totalPrice, u.id, u.image, u.name ` +
    `from hSubmission h, user u, class c ` +
    `where h.idUser=u.id and h.status=3 and h.timeUpdate between '${dateStart}' and '${dateEnd}' and h.idClass=c.id ` +
    `group by u.id ` +
    `order by 1 desc`;

  console.log(q);

  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

router.get("/topInstructor", (req, res) => {
  const dateStart = req.query.dateStart;
  const dateEnd = req.query.dateEnd;
  const q =
    `select count(h.idInstructor) as total, sum(c.price) as totalPrice, h.idInstructor as id, i.name, u.image, i.katagori ` +
    `from hSubmission h, user u, instructor i, class c ` +
    `where h.idUser=u.id and h.status=3 and h.timeUpdate between '${dateStart}' and '${dateEnd}' and h.idInstructor=i.idUser and h.idClass=c.id ` +
    `group by h.idInstructor ` +
    `order by 1 desc`;

  console.log(q);

  con.query(q, (err, rows) => {
    if (err) throw err;
    console.log(rows);
    res.send(rows);
  });
});

function returnDataset(data) {
  console.log(data.length);
  const tempLabelData = [];
  const tempGraphLineData = [];

  data.map((res) => {
    tempLabelData.push(res.monthName);
    tempGraphLineData.push(res.total);
  });

  const tmp = {
    tempLabelData,
    datasets: [
      {
        label: "Transaction",
        data: tempGraphLineData,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
    ],
  };

  return tmp;
}

router.get("/getIncomeData", (req, res) => {
  const dateStart = req.query.dateStart;
  const dateEnd = req.query.dateEnd;
  //format YYYY-MM-DD
  //jangan lupa ganti status
  const q = `select h.id, c.price, h.timeUpdate from hSubmission h, class c where h.idClass=c.id and h.status=3 and h.timeUpdate between '${dateStart}' and '${dateEnd}'`;

  const q2 =
    `SELECT MONTH(h.timeUpdate) as month, MONTHNAME(h.timeUpdate) as monthName, SUM(c.price) as total ` +
    `FROM hSubmission h, class c ` +
    `WHERE h.idClass=c.id and h.status=3 and h.timeUpdate between '${dateStart}' and '${dateEnd}' ` +
    `GROUP BY MONTH(h.timeUpdate)`;

  console.log(q2);

  con.query(q2, (err, rows) => {
    if (err) throw err;
    //returnDataset(rows);
    console.log(returnDataset(rows));
    res.send(rows);
  });
});

module.exports = router;
