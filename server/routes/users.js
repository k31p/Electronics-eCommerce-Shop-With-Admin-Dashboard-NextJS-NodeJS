const express = require('express');

const router = express.Router();

const {
    getUser,
    createUser,
    updateUser,
    updateUserProfile,
    deleteUser,
    getAllUsers, 
    getUserByEmail
  } = require('../controllers/users');

  router.route('/')
  .get(getAllUsers)
  .post(createUser);

  router.route('/:id')
  .get(getUser)
  .put(updateUser) 
  .delete(deleteUser);

  router.route('/:id/profile')
  .put(updateUserProfile);

  router.route('/email/:email')
  .get(getUserByEmail);


  module.exports = router;