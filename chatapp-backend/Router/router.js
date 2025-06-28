const express = require('express');
const router = express.Router();
const upload = require("../Middleware/multerMiddleware");
const jwtMiddleware = require("../Middleware/jwtMiddleware");
const userController = require("../Controller/userController");
const requestController = require("../Controller/requestController");
const messageController = require("../Controller/messageController");

// User routes
router.post('/register', upload.single('profile'), userController.registerUser);
router.post('/login', userController.loginUser);
router.get("/getallusers", jwtMiddleware, userController.getallusers);
router.put("/edituser/:id", jwtMiddleware, upload.single("profile"), userController.edituserController);

// Request routes
router.post("/request", jwtMiddleware, requestController.sendRequest);
router.get("/requests", jwtMiddleware, requestController.getRequests);
router.put("/request/:id", jwtMiddleware, requestController.updateRequestStatus);
router.get('/requests/accepted', jwtMiddleware, requestController.getAcceptedRequests);

// Message routes
router.post('/messages', messageController.sendMessage);
router.get('/messages/:user1/:user2', messageController.getMessages);
router.delete('/messages/:messageId', messageController.deleteMessage);

module.exports = router;