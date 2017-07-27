const Users = require('../datasets/users'), fs = require('fs'), UsersConnected = require('../datasets/connected-users');
const jwt = require('jsonwebtoken');
let uploadUtil = (req, res, callback) => {
  let userId = req.params.id;
  let directory = `${process.cwd()}\\src\\assets\\upload\\${userId}\\`;
  try {
    let files = fs.readdirSync(directory);
    callback(files, directory, userId)
  } catch (err) {
    res.json([]);
  }
};

module.exports = function (io) {
  const utils = require('../utils/utils')(io);

  let getlistOfFriends = (req, res) => {
    return utils.listOfFriends(req.body, 0, false, (followers) => {
      res.json(followers)
    })
  };

  /**
   * Get all Users and add the connected carcterisitc
   * limitData
   * searchData for autocompletion
   * @param req
   * @param res
   */


  let getUsers = function (req, res) {
    let search = new RegExp(req.query.searchData, 'i');
    let limitData = req.query.limitData ? Number(req.query.limitData) : 0;
    Users.find({username: search} || {}).select({
      password: 0,
      __v: 0
    }).limit(limitData).sort({modifiedAt: 1}).exec(function (err, usersData) {
      if (err) {
        res.status(500).send(err);
      } else {
        if (Array.isArray(usersData) && usersData.length) {
          let asyncLoop = (i, usersData) => {
            utils.listOfFriends(usersData[i].following, 10, false, waster => {
              usersData[i].following = waster;
              if (i === usersData.length - 1) {
                UsersConnected.find().exec((err, userConnected) => {
                  let connectedId = userConnected.map(elem => {
                    return elem.userId
                  });
                  usersData.map(doc => {
                    if (doc && doc._id) {
                      connectedId.forEach(elem => {
                        return doc._doc.isConnected = elem === doc._id.toString()
                      })
                    }
                  });
                  res.json(usersData);
                });
              } else {
                asyncLoop(++i, usersData)
              }
            });
          };
          asyncLoop(i = 0, usersData);
        } else {
          res.json([]);
        }
      }
    })
  };

  let deconnection = function (req, res) {
    console.log(req.body.userId);
    jwt.verify(req.body.token, process.env.SECRET_TOKEN, (err, decoded) => {
      UsersConnected.findOne({userId: decoded.user._id}, (err, user) => {
        if (!err) {
          if (user) {
            if (user.location.length <= 1) {
              user.remove()
            } else {
              if (!err) {
                let indexObj = user.location.indexOf(user.location.find(elem => {
                  return elem._id.toString() === decoded.user.idOfLocation
                }));
                user.location.splice(indexObj, 1);
                user.save()
              }
            }
          }
          res.send("deconnection effectuée")
        }
      });
      //TODO  deconnectionMethod('userId', decoded.user._id)
    })
  };

  /**
   * Delete socket ID from MongoDB server
   * @param socketId string
   */
  let deleteSocketIdDB = (socketId) => {
    //TODO  deconnectionMethod('location.socketId', socketId)
    UsersConnected.findOne({'location.socketId': socketId}, (err, locationUser) => {
      if (!err) {
        if (locationUser) {
          if (locationUser.location.length <= 1) {
            locationUser.remove()
          } else {
            let indexOfLocation = locationUser.location.indexOf(locationUser.location.find(elem => {
              return elem.socketId === socketId
            }));
            //locationUser.location[indexOfLocation].remove();
            locationUser.location.splice(indexOfLocation, 1);
            locationUser.save()
          }
        }
      }
    })
  };

  //TODO merge all following function
  let functionFollowing = (req, res) => {

    let obj = {
      follow: {socketNotification: '', user: 'pending', waster: 'requested'},
      followUserOk: {socketNotification: '', user: accepted, waster: 'accepted'},
      unfollow: {socketNotification: ''}
    };

    let typeFollower = req.body.typeFollo
    var userId = req.body.userId,
      wasterId = req.body.wasterId;
    let userIdWaster;
    let date = new Date();
    console.log("req.body", req.body);
    Users.findById(wasterId, function (err, waster) {
      if (!waster.following.length) { //init s tableau vide
        waster.following.push({
          userId: userId,
          statut: "requested",
          date: date
        })
      } else {
        console.log(waster);
        let already = false; // test si l'user ID est deja présent
        waster.following.forEach(function (doc) {
          if (doc && doc.userId === userId) {
            already = true;
            console.log("deja présent");
          }
        });
        if (!already) {
          waster.following.push({
            userId: userId,
            statut: "requested",
            date: date
          });

        }
      }
      waster.save(function () {
        userIdWaster = waster.username;
        sendSocketNotification(waster, 'friendRequest')
      })
    });
    Users.findById(userId, function (err, follower) {
      if (!follower.following.length) { //init
        follower.following.push({
          userId: wasterId,
          statut: "pending",
          date: date
        })
      } else {
        let already = false; // test si l'user ID est deja présent
        follower.following.forEach(function (doc) {
          if (doc.userId && doc.userId === wasterId) {
            already = true;
          }
        });
        if (!already) {
          follower.following.push({
            userId: wasterId,
            statut: "pending",
            date: date
          });
        }
      }
      follower.save(function () {
        res.json(follower);
      })
    });
  };

  let followUser = function (req, res) {
      let userId = req.body.userId,
        wasterId = req.body.wasterId;
      let userIdWaster;
      let date = new Date();
      console.log("req.body", req.body);
      Users.findById(wasterId, function (err, waster) {
          if (!waster.following.length) { //init s tableau vide
            waster.following.push({
              userId: userId,
              statut: "requested",
              date: date
            })
          } else {
            console.log(waster);
            // test si l'user ID est deja présent
            let already = waster.following.some(doc => {
              console.log("deja présent");
              return doc && doc.userId === userId
            });
            if (!already) {
              waster.following.push({
                userId: userId,
                statut: "requested",
                date: date
              });
            }
          }
          waster.save(function () {
            userIdWaster = waster.username;
            sendSocketNotification(waster, 'friendRequest')
          })
        }
      );
      Users.findById(userId, function (err, follower) {
        if (!follower.following.length) { //init
          follower.following.push({
            userId: wasterId,
            statut: "pending",
            date: date
          })
        } else {
          let already = false; // test si l'user ID est deja présent
          follower.following.forEach(function (doc) {
            if (doc.userId && doc.userId === wasterId) {
              already = true;
            }
          });
          if (!already) {
            follower.following.push({
              userId: wasterId,
              statut: "pending",
              date: date
            });
          }
        }
        follower.save(function () {
          res.json(follower);
        })
      });
    }
  ;

  /**
   * Send private notification to the receiver of the request
   * @type {(p1?:*, p2?:*)}
   */
  let sendSocketNotification = ((waster, notif) => {
    UsersConnected.findOne({userId: waster._id}, (err, userCo) => {
      if (userCo) {
        userCo.location.forEach(elem => {
          io.sockets.connected[elem.socketId].emit(notif, waster)
        })
      }
    })
  });

  let followUserOk = function (req, res) {
    let userId = req.body.userId,
      wasterId = req.body.wasterId;
    let userIdWaster;
    console.log("user e waster");
    console.log(userId + wasterId);
    Users.findById(wasterId, function (err, waster) {
      if (!err) {

      }
      waster.following.forEach(function (doc) {
        console.log(doc);
        if (doc.userId == userId) {
          doc.statut = "accepted"
        }

      });
      waster.save(() => {
        sendSocketNotification(waster, 'friendRequestAccepted')
      });
    });
    Users.findById(userId, function (err, follower) {
      if (err) {
        console.log("failed save");
      } else {
        follower.following.forEach(function (doc) {
          if (doc.userId === wasterId) {
            doc.statut = "accepted"
          }
        });
        follower.save(function () {
        });
        res.json(follower);
      }
    });
  };
  let unfollowUser = function (req, res) {
    let userId = req.body.userId,
      wasterId = req.body.wasterId;
    Users.findById(wasterId, function (err, waster) {
      console.log(waster);
      let index = waster.following.findIndex(function (doc) {
        return doc.userId === userId
      });
      waster.following.splice(index, 1);
      waster.save(() => {
        sendSocketNotification(waster, 'removeFriend');
        Users.findById(userId, function (err, follower) {
          let wasterIndex = follower.following.findIndex(function (doc) {
            return doc.userId === wasterId;
          });
          follower.following.splice(wasterIndex, 1);
          follower.save();
          res.json(follower);
        })
      });
    });
  };
  let getThisUser = (req, res) => {
    let userId = req.body.userId;
    Users.findById(userId).select({password: 0, __v: 0}).exec((err, user) => {
      if (!err) {
        utils.listOfFriends(user.following, 10, false, waster => {
          user.following = waster;
          res.json(user)
        });
      }
    });
  };

  let uploadPicture = (req, res) => {
    return uploadUtil(req, res, (files, directory, userId) => {
      if (files.length === 0) {
        fs.rmdir(directory, function (err) {
          if (err) {
            res.status(400).send(err)
          }
        });
      } else {
        res.json(files);
      }
    })
  };

  /**
   * Delete all Picture of a specific user
   * @param req
   * @param res
   */
  let deleteAllPictures = (req, res) => {
    uploadUtil(req, res, (files, directory, userId) => {
      if (files.length === 0) {
        fs.rmdir(directory, function (err) {
          if (err) {
            res.status(400).send(err)
          }
        });
      }
      else {
        Users.findById(userId).select({password: 0, __v: 0}).exec((err, user) => {
          if (err) {
            res.status(500).send("unerreru a la suppression:", err);
          }
          files.forEach((file, i) => {
            let filePath = directory + file;
            fs.stat(filePath, function (err, stats) {
              if (err) {
                console.log(JSON.stringify(err));
              } else {
                if (stats.isFile()) {
                  fs.unlink(filePath, function (err) {
                    if (err) {
                      res.status(400).json(err)
                    }
                  });
                }
              }
            });
          });
          user.image = undefined;
          user.save(() => {
            res.json(user);
          })
        });
      }
    })
  };

  return {
    getUsers,
    followUserOk,
    getThisUser,
    deleteSocketIdDB,
    deconnection,
    followUser,
    unfollowUser,
    uploadPicture,
    deleteAllPictures,
    getlistOfFriends
  }
};


