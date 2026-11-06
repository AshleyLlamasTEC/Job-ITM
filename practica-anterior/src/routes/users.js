const express = require('express');
const { getUsers } = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const users = await getUsers();
    res.render('users/index', { title: 'Usuarios', users });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
