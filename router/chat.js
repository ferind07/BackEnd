var router = require('express').Router();

router.get("/testChat", (req, res) => {
  res.send("test chat");
});

module.exports = router;