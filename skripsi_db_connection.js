var mysql = require("mysql");

var con = mysql.createConnection({
  host: "103.145.226.115",
  user: "ferryind_ferry",
  password: "ferry123",
  database: "ferryind_skripsi",
});

con.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
});

module.exports = con;
