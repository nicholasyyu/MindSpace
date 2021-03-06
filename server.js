"use strict";

require('dotenv').config();

process.title = "mindspace";

const cluster              = require('cluster');

const PORT                 = process.env.PORT || 8080;
const ENV                  = process.env.ENV || "development";
const $                    = process.env;

const express              = require("express");
const bodyParser           = require("body-parser");
const sass                 = require("node-sass-middleware");
const session              = require('express-session');
    
// memory cache    
const memjs                = require('memjs');
const MemcachedStore       = require('connect-memjs')(session);
const mc                   = memjs.Client
                             .create(process.env.MEMCACHIER_SERVERS 
                                || 'localhost:11211', 
                                {
                                  failover: false,  // default: false
                                  timeout: 1,      // default: 0.5 (seconds)
                                  keepAlive: true  // default: false
                                });

// unique userID for user in DB 
const uuid                 = require('uuid/v1');

const app                  = express();

const knexConfig           = require("./knexfile");
const knex                 = require("knex")(knexConfig[ENV]);
const morgan               = require('morgan');
const knexLogger           = require('knex-logger');

//local imports
const helper               = require('./helper_functions/helpers');
const query                = require('./db/db_data_query_functions.js');
const insert               = require('./db/db_data_insert_functions.js');
const update               = require('./db/db_data_update_functions.js');


// Mount router and user query routes
const usersRoutes          = require("./routes/users");


// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, 
//         cyan for redirection codes, and uncolored for all other codes.
app.use(morgan('dev'));

// Log knex SQL queries to STDOUT as well
app.use(knexLogger(knex));

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/styles", sass({
  src: __dirname + "/styles",
  dest: __dirname + "/public/styles",
  debug: true,
  outputStyle: 'expanded'
}));
app.use(express.static("public"));

if (cluster.isMaster) {

  const WORKERS = process.env.WEB_CONCURRENCY || 1;

  for (let i = 0; i < WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {

    console.log('Worker %d died:', worker.id, "in process", process.pid);
    cluster.fork();

  });

} else {

//configure session
const store = new MemcachedStore({
  hosts: process.env.MEMCACHIER_SERVERS || 
         process.env.MEMCACHE_SERVERS || ['localhost:11211']});

app.use(session({
  genid: (req) => {
    return uuid();
  },
  secret: [ $.KEY1, $.KEY2 ],
  store, 
  resave: false,
  saveUninitialized: false,
  unset: 'destroy'
}));

const cacheView = (req, res, next) => {
  // let view_key = '_view_cache_' + req.originalUrl || req.url;
  // mc.get(view_key, (err, val) => {
  //   if (err === null && val !== null) {
  //     res.send(val.toString('utf8'));
  //     return;
  //   }
  //   res.sendRes = res.send;
  //   res.send = (body) => {
  //     mc.set(view_key, body, { expires: 0 }, (err, val) => {
  //       if (err) throw err;
  //     });
  //     res.sendRes(body);
  //   }
  //   next();
  // });
  next();
}

  /* APP GET ROUTES */

  
  // Mount all resource routes
  app.use("/api/users", usersRoutes(knex));

  app.get("/getJSON/:url", (req, res) => {
    if(!req.params.url) {
      res.status(500);
      res.send({"Error": "Wrong url, bitch"});
    }
    request.get({ url: `http://api.linkpreview.net/?key=AIzaSyDozAdVk-H_5_JuiAzAUa275tToyJrosk0&q=${req.params.url}`,
    function(error, response, body) { 
      if (!error && response.statusCode == 200) { 
        res.json(body); 
      } 
    }
  })  

  // Home page - list of subjects in grid format
  app.get("/", cacheView, (req, res) => {
    res.render("index");
  });

<<<<<<< HEAD
  app.get("/search", (req, res) => {

  });

=======
  // test templates
>>>>>>> 56d43eaa9eb158d116024ce6cb00c7b734a179e0
  app.get("/ardelia", cacheView, (req, res) => {
    res.render("test_templates");
  });

  app.get("/rohit", cacheView, (req, res) => {
    res.render("rohit");
  });

  app.get("/edit-profile", cacheView, (req, res) => {
    res.render("edit-profile");
  });

  app.get("/view-profile", cacheView, (req, res) => {
    res.render("view-profile");
  });





  // view profile- bio etc.
  app.get("/profile/:email", cacheView, (req, res) => {
    const email = req.params.email;
    query.findUser(email).then((result) => {
      console.log("let's pass this to html:", result);
    });
    res.render("user_profile");
  });

  // view main user page w/ posts and likes
  app.get("/posts/:user_id", cacheView, (req, res) => {
    const user_id = req.params.user_id;
    query.findUserResources(user_id).then((result) => {
      console.log("let's pass this to html:", result);
    });
    query.findUserLikedResources(user_id).then((result) => {
      console.log("let's pass this to html:", result);
    });
    res.render("user_posts");
  });

  // view posts for specific subject
  app.get("/subjects/:subject_id", cacheView, (req, res) => {
    let subject = req.params.subject_id;
    console.log(subject);
    //query subject from DB
    query.findSubjects(subject).then((result) => {
      let subject_id = result[0]['id'];
      return subject_id;
    }).then((subject_id) => {
      query.findSubjectPosts(subject_id).then((results) => {
        return (async () => {
          try {
            let resultArr = [];
            for (let row of results) {
              resultArr.push(row['post_id']);
            }
            let promise = resultArr;
            let value = await promise;
            return value;
          } catch (err) {
            throw err;
          }
        })();
      }).catch((err) => {
        throw err;
      }).then((postIdArray) => {
        query.findResources(postIdArray)
          .then((postResults) => {
            if (postResults.length < 1) {
              return res.status(204).redirect('/');
            } else {
              res.status(200)
              return res.json(postResults);
            }
          }).catch((err) => {
            throw err;
          });
      }).catch((err) => {
        throw err;
      });
    }).catch((err) => {
      throw err;
    });
  });

  // view post in specific subject 
  //**TODO: Make AJAX function to render over posts
  app.get("/subjects/:subject_id/:post_id", cacheView, (req, res) => {
    res.render('view_post');
  });

  /* APP POST ROUTES */

  // clear user session
  app.post('/logout', (req, res) => {
    store.destroy(req.session.id, (err) => {
      if (err) throw err;
    });
    req.session.destroy((err) => {
      if (err) throw err; 
    });
    res.status(200).send();
  });

  // submit post, add subject tags, assign unique ID and reference user ID
  // store in DB
  app.post('/post', (req, res) => {
    const { external_url, title, description, user_created, subject_name } = req.body;
    let post_id = helper.generateRandomString();

    let resource = {
      external_url,
      post_id,
      title,
      description,
      user_created
    };
    let subject = {
      subject_name
    };
    insert.insertSource(resource, subject);
    res.status(201).send();

  });

  // like post, increment like count, add post to user likes 
  // (user cannot like own post)
  app.put('/like', (req, res) => {

    const { user_id, post_id } = req.body;

    insert.insertLike(user_id, post_id);
    res.status(201).send();

  });

  // rate post, calculate average and display
  // (user cannot rate own post) 
  app.put('/rate', (req, res) => {

    const { user_id, post_id, rating } = req.body;

    insert.insertRating(user_id, post_id, rating);
    res.status(201).send();

  });

  // submit comment
  app.post('/comment', (req, res) => {

    const { user_id, post_id, comment } = req.body;

    insert.insertComment(user_id, post_id, comment);
    res.status(201).send();

  });

  // owner remove post from DB
  app.delete('/post/delete/:post_id', (req, res) => {

    const post_id = req.params.post_id;

    update.deletePost(post_id);
    res.status(201).send();

  });

  // edit post
  // (user can only edit own post) 
  app.put('/post/edit/:post_id', (req, res) => {
    let post_id = req.params.post_id;
    const { external_url, title, description, user_created} = req.body;

    let newResource = {
      external_url,
      post_id,
      title,
      description,
      user_created
    };
    update.updatePost(newResource);
    res.status(201).send();
  });

  // edit comment
  // (user can only edit own comment)
  app.put('/comment/:comment_id', (req, res) => {

    const { content } = req.body;
    let id = req.params.comment_id;
    let newComment = {
      content
    }

    update.updateComment(newComment, id);
    res.status(201).send();
  });

})}
console.log(process.env.PORT);
app.listen(PORT, () => {
  console.log("Example app listening on port " + PORT);
});