const express = require('express');

const authroutes = require("./auth");


const router = express.Router();


router.use('/auth', authroutes);

module.exports = router;