var mysql = require("mysql");
require("dotenv").config();
// var con = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "",
// });

// var con = mysql.createConnection({
//   host: "103.145.226.115",
//   user: "ferryind_ferry",
//   password: "ferry123",
//   database: "ferryind_skripsi",
// });

// try {
//   con.connect(function (err) {
//     if (err) {
//       console.error("error connecting: " + err.stack);
//       return;
//     }

//     console.log("connected as id " + con.threadId);
//   });
// } catch (error) {
//   console.log(error);
// }

// var con = mysql.createPool({
//   host: "103.145.226.115",
//   user: "ferryind_ferry",
//   password: "ferry123",
//   database: "ferryind_skripsi",
// });

var con = mysql.createPool({
  host: process.env.HOST,
  user: process.env.DB_USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
});

// con.connect(function (err) {
//   if (err) console.log(err);
//   console.log("Connected!");
// });

// var db_config = {
//   host: "103.145.226.115",
//   user: "ferryind_ferry",
//   password: "ferry123",
//   database: "ferryind_skripsi",
// };

// var con;

// function handleDisconnect() {
//   con = mysql.createConnection(db_config); // Recreate the connection, since
//   // the old one cannot be reused.

//   con.connect(function (err) {
//     // The server is either down
//     if (err) {
//       // or restarting (takes a while sometimes).
//       console.log("error when connecting to db:", err);
//       setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
//     } // to avoid a hot loop, and to allow our node script to
//   }); // process asynchronous requests in the meantime.
//   // If you're also serving http, display a 503 error.
//   con.on("error", function (err) {
//     console.log("db error", err);
//     if (err.code === "PROTOCOL_CONNECTION_LOST") {
//       // Connection to the MySQL server is usually
//       handleDisconnect(); // lost due to either server restart, or a
//     } else {
//       // connnection idle timeout (the wait_timeout
//       throw err; // server variable configures this)
//     }
//   });
// }

// handleDisconnect();

module.exports = con;
