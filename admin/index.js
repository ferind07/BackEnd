const express = require("express");
const router = express.Router();
const con = require("../skripsi_db_connection");
var jwt = require("jsonwebtoken");
const util = require("util");
const moment = require("moment");

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
    `select count(h.idInstructor) as total, sum(c.price) as totalPrice, h.idInstructor as id, i.name, i.katagori ` +
    `from hSubmission h, user u, instructor i, class c ` +
    `where h.idUser=u.id and h.status=3 and h.timeUpdate between '${dateStart}' and '${dateEnd}' and h.idInstructor=i.idUser and h.idClass=c.id ` +
    `group by h.idInstructor ` +
    `order by 2 desc`;

  const qq = `select * from (${q}) as t, user u where t.id=u.id`;
  console.log(qq);

  con.query(qq, (err, rows) => {
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

function returnDatasetSales(data) {
  const labelData = [];
  const dataChart = [];
  const color = [];

  data.map((data) => {
    labelData.push(data.monthName);
    dataChart.push(data.sales);
    color.push("#fff");
  });

  const eChart = {
    series: [
      {
        name: "Sales",
        data: dataChart,
        color: "#fff",
      },
    ],

    options: {
      chart: {
        type: "bar",
        width: "100%",
        height: "auto",

        toolbar: {
          show: false,
        },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "55%",
          borderRadius: 5,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: 1,
        colors: ["transparent"],
      },
      grid: {
        show: true,
        borderColor: "#ccc",
        strokeDashArray: 2,
      },
      xaxis: {
        categories: labelData,
        labels: {
          show: true,
          align: "right",
          minWidth: 0,
          maxWidth: 160,
          style: {
            colors: color,
          },
        },
      },
      yaxis: {
        labels: {
          show: true,
          align: "right",
          minWidth: 0,
          maxWidth: 160,
          style: {
            colors: color,
          },
        },
      },

      tooltip: {
        y: {
          formatter: function (val) {
            return "Rp. " + val + " thousands";
          },
        },
      },
    },
  };

  return eChart;
}

router.get("/getSales", (req, res) => {
  const q =
    `select MONTH(h.timeInsert) as month, MONTHNAME(h.timeInsert) as monthName, SUM(c.price) as sales ` +
    `from hSubmission h, class c ` +
    `where h.idClass=c.id and h.timeInsert > DATE_SUB(now(), INTERVAL 6 MONTH) ` +
    `GROUP BY MONTH(h.timeInsert)`;

  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

router.get("/getReport", (req, res) => {
  const q = `select r.id, r.idUser, r.idSubmission, r.message, r.image, r.status, r.date, u.name, c.title, u.email, s.idInstructor from report r, user u, class c, submission s where r.idUser=u.id and r.idSubmission=s.id and s.idClass=c.id order by r.date desc`;

  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

router.get("/getNeedResponseReport", (req, res) => {
  const q = `select r.id, r.idUser, r.idSubmission, r.message, r.image, r.status, r.date, u.name, c.title, u.email, s.idInstructor from report r, user u, class c, submission s where r.idUser=u.id and r.idSubmission=s.id and s.idClass=c.id and r.status=2 order by r.date desc`;

  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

router.get("/getReportByID", (req, res) => {
  const id = req.query.id;
  const q = `select r.id, r.idUser, r.idSubmission, r.message, r.image, r.status, r.date, u.name, c.title, u.email, s.idInstructor, s.idHsubmission, c.price, s.idClass from report r, user u, class c, submission s where r.idUser=u.id and r.idSubmission=s.id and s.idClass=c.id and r.id=${id}`;

  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows[0]);
  });
});

router.get("/instructorInfo", (req, res) => {
  const id = req.query.id;

  const q = `select * from user u, instructor i where u.id=i.idUser and u.id=${id}`;

  con.query(q, (err, rows) => {
    if (err) throw err;
    res.send(rows[0]);
  });
});

router.get("/getHSubmission", (req, res) => {
  const q = `select * from hSubmission`;

  con.query(q, (err, rows) => {
    console.log(rows);
    res.send(rows);
  });
});

router.post("/declineReport", async (req, res) => {
  const idReport = req.body.idReport;
  const idSubmission = req.body.idSubmission;
  const idHSubmission = req.body.idHSubmission;

  const query = util.promisify(con.query).bind(con);

  const q1 = `update report set status=0 where id=${idReport}`;
  const q2 = `update submission set status=2 where id=${idSubmission}`;
  const q3 = `update hSubmission set status=1, timeUpdate=now() where id=${idHSubmission}`;

  const executeQ1 = await query(q1);
  const executeQ2 = await query(q2);
  const executeQ3 = await query(q3);

  if (
    executeQ1.affectedRows == 1 &&
    executeQ2.affectedRows == 1 &&
    executeQ3.affectedRows == 1
  ) {
    const q2 = `select * from submission where id=${idSubmission}`;

    const dataSubmission = await query(q2);

    const idHSubmission = dataSubmission[0].idHsubmission;
    const idClass = dataSubmission[0].idClass;

    const q3 = `select * from class where id=${idClass}`;

    const dataClass = await query(q3);

    const classCount = dataClass[0].classCount;

    const q4 = `select * from submission where idHsubmission=${idHSubmission} and status=2`;
    const dataSubmissionDone = await query(q4);

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

      const hasil3 = await query(q8);

      const q9 = `select * from user where role=3`;
      const dataAdmin = await query(q9);

      const saldoBaru = dataAdmin[0].saldo + gajiAdmin;

      const q10 = `update user set saldo=${saldoBaru} where role=3`;
      const updateSaldo = await query(q10);
    }
    res.send({
      status: true,
      msg: "Success decline report",
    });
  }
});

router.post("/approveReport", async (req, res) => {
  const idReport = req.body.idReport;
  const idSubmission = req.body.idSubmission;
  const idHSubmission = req.body.idHSubmission;
  const price = req.body.price;
  const idUser = req.body.idUser;

  const query = util.promisify(con.query).bind(con);

  const q1 = `update report set status=1 where id=${idReport}`;
  const q2 = `update submission set status=5 where id=${idSubmission}`;
  const q3 = `update hSubmission set status=7, timeUpdate=now() where id=${idHSubmission}`;

  const executeQ1 = await query(q1);
  const executeQ2 = await query(q2);
  const executeQ3 = await query(q3);

  if (
    executeQ1.affectedRows == 1 &&
    executeQ2.affectedRows == 1 &&
    executeQ3.affectedRows == 1
  ) {
    const qUser = `select * from user where id=${idUser}`;
    const executeQUser = await query(qUser);

    const newSaldo = executeQUser[0].saldo + price;
    const qTambahSaldo = `update user set saldo=${newSaldo} where id=${idUser}`;
    const executeTambahSaldo = await query(qTambahSaldo);

    if (executeTambahSaldo.affectedRows == 1) {
      res.send({
        status: true,
        msg: "Success approve report",
      });
    }
  }
});

module.exports = router;
