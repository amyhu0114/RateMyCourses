// start app with 'npm run dev' in a terminal window
// go to http://localhost:port/ to view your deployment!
// every time you change something in server.js and save, your deployment will automatically reload
//NEW NYA EDIT
// to exit, type 'ctrl + c', then press the enter key in a terminal window
// if you're prompted with 'terminate batch job (y/n)?', type 'y', then press the enter key in the same terminal
// standard modules, loaded from node_modules
const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const express = require('express');
const morgan = require('morgan');
const serveStatic = require('serve-static');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const flash = require('express-flash');
const multer = require('multer');

// our modules loaded from cwd

const { Connection } = require('./connection');
const cs304 = require('./cs304');
const counter = require('./counter-utils.js')


// Create and configure the app

const app = express();

// Morgan reports the final status code of a request's response
app.use(morgan('tiny'));

app.use(cs304.logStartRequest);

// This handles POST data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cs304.logRequestData);  // tell the user about any request data
app.use(flash());


app.use(serveStatic('public'));
app.set('view engine', 'ejs');

const mongoUri = cs304.getMongoUri();

app.use(cookieSession({
    name: 'session',
    keys: ['horsebattery'],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

const ROUNDS = 15;

// ================================================================
// custom routes here

const DB = process.env.USER;
const WMDB = 'wmdb';
const STAFF = 'staff';

// main page. This shows the use of session cookies
app.get('/', (req, res) => {
    let uid = req.session.uid || 'unknown';
    let visits = req.session.visits || 0;
    visits++;
    req.session.visits = visits;
    console.log('uid', uid);
    loggedIn = (req.session.loggedIn)||false;
    return res.render('main.ejs', {loggedIn: loggedIn});
});

const DTB = 'RateMyCourse';
app.get('/course/:cid', async (req, res) => {
  // TO DO: make course star calc functions
  // Standardize review dtb, add review text, poster, date, title?
  // Make course look nice
 
  const cid = req.params.cid;
  const db = await Connection.open(mongoUri, DTB);

  // Get course data
  const courseList = await db.collection('courses').find({courseId: parseInt(cid)}).toArray();
  // if (courseList.length === 0) {
  //   return; //ELEPHANT
  // }
  const courseData = courseList[0]
  // console.log("courseData", courseData)


  // Get department name
  const deptList = await db.collection('departments').find({departmentId: courseData.departmentId}).toArray();

  // if (deptList.length === 0) {
  //   return; //ELEPHANT
  // }
  const departmentName = deptList[0].departmentName;

  const reviewData = await db.collection('reviews').find({courseId: parseInt(cid)}).toArray();
  console.log(reviewData)
  const reviewList = reviewData.map((reviewObj) => {
    const workloadNum = parseInt(reviewObj.workloadRating);
    const accessibilityNum = parseInt(reviewObj.contentDifficulty);
    const contentNum = parseInt(reviewObj.accessibility);

    return {workloadStars: '★'.repeat(workloadNum) + '☆'.repeat(5-workloadNum),
            accessibilityStars: '★'.repeat(accessibilityNum) + '☆'.repeat(5-accessibilityNum),
            contentStars: '★'.repeat(contentNum) + '☆'.repeat(5-contentNum),
            }
  })

  console.log(reviewList)
  return res.render("course.ejs", {courseHeader: `${courseData.courseCode}: ${courseData.courseName}`,
                                  courseSubheader: `${departmentName} - Taught By: ${courseData.professorNames.join(", ")}`,
                                  accessibilityStars: 5,
                                  workloadStars: 2, 
                                  contentStars: 4,
                                  reviewList: reviewList
                                })

})



// ===============Beginning of Amy Work ============================
const DBNAME = "RateMyCourse";
const USERS = "users";
app.post("/join", async (req, res) => {
    try {
      const username = req.body.username;
      const password = req.body.password;
      const db = await Connection.open(mongoUri, DBNAME);
      var existingUser = await db.collection(USERS).findOne({userName: username});
      if (existingUser) {
        req.flash('error', "Login already exists - please try logging in instead.");
        console.log("Login already exists - please try logging in instead.");
        return res.redirect('/')
      }
      const hash = await bcrypt.hash(password, ROUNDS);
      
      const counterCol = db.collection('counters');
      var uID = await counter.incrCounter(counterCol, USERS);
      await db.collection(USERS).insertOne({
          userId: uID,
          userName: username,
          hash: hash
      });
      console.log('successfully joined', username, password, hash);
      req.flash('info', 'successfully joined and logged in as ' + username);
      req.session.username = username;
      req.session.userId = uID
      req.session.loggedIn = true;
      return res.redirect('/');
    } catch (error) {
      req.flash('error', `Form submission error: ${error}`);
      return res.redirect('/')
    }
  });
  
  app.post("/login", async (req, res) => {
    try {
      const username = req.body.username;
      const password = req.body.password;
      const db = await Connection.open(mongoUri, DBNAME);
      var existingUser = await db.collection(USERS).findOne({userName: username});
      console.log('user', existingUser);
      if (!existingUser) {
        req.flash('error', "Username does not exist - try again.");
        console.log("Username does not exist - try again.");
       return res.redirect('/')
      }
      const match = await bcrypt.compare(password, existingUser.hash); 
      console.log('match', match);
      if (!match) {
          req.flash('error', "Username or password incorrect - try again.");
          console.log("Username or password incorrect - try again.");
          return res.redirect('/')
      }
      req.flash('info', 'successfully logged in as ' + username);
      console.log('successfully logged in as ' + username);
      req.session.username = username;
      req.session.userId = existingUser.userId
      req.session.loggedIn = true;
      console.log('login as', username);
      return res.redirect('/');
    } catch (error) {
      req.flash('error', `Form submission error: ${error}`);
      console.log(`Form submission error: ${error}`);
      return res.redirect('/')
    }
  });
  
  app.post('/logout', (req,res) => {
    if (req.session.username) {
      req.session.username = null;
      req.session.userId = null
      req.session.loggedIn = false;
      req.flash('info', 'You are logged out');
      return res.redirect('/');
    } else {
      req.flash('error', 'You are not logged in - please do so.');
      return res.redirect('/');
    }
  });

  function requiresLogin(req, res, next) {
    if (!req.session.loggedIn) {
      req.flash('error', 'This page requires you to be logged in - please do so.');
      return res.redirect("/");
    } else {
        next();
    }
  }
// ===============End of Amy Work ==================================

// ===============Beginning of Nya Work ============================
function insertReview(db, courseId, difficulty, workload, text, userId, rating, accessibility){
  let result = db.collection("reviews").insertOne({courseId: courseId, contentDifficulty: difficulty, workloadRating: workload, reviewText: text, userId: userId, overallRating: rating, accessibilityRating: accessibility});
  return result;
}

app.get('/review/', requiresLogin, async (req, res) => {
  if (!req.session.loggedIn) {
    req.flash('error', 'You are not logged in - please do so.');
    console.log('You are not logged in - please do so.');
    return res.redirect("/");
  }
  const db = await Connection.open(mongoUri, DBNAME);
  var courses = await db.collection("courses").find({}).toArray();
  res.render('makeReview.ejs', {courses: courses});
});

app.post("/review/", async (req, res) => {
  try {
    const db = await Connection.open(mongoUri, DBNAME);
    var course_id = req.body.courseId;
    var difficulty = req.body.contentDifficulty;
    var accessibility = req.body.accessibility;
    var rating = req.body.rating;
    var workload = req.body.workloadRating;
    var text = req.body.reviewText;
    var userId = req.session.userId
    insertReview(db, course_id, difficulty, workload, text, userId, rating, accessibility);
    req.flash("info", "You have successfully submitted a review!");
    return res.redirect('/');
  } catch (error) {
    req.flash('error', `Form submission error: ${error}`);
    return res.redirect('/')
  }
});

function insertCourse(db, course_id, course_name, course_code, department_id, professor_list){
  let result = db.collection("courses").insertOne({courseId: course_id, courseName: course_name, courseCode: course_code, departmentId: department_id, professorNames: professor_list});
  return result;
}

app.get('/inputCourse/', requiresLogin, async (req, res) => {
  if (!req.session.loggedIn) {
    req.flash('error', 'You are not logged in - please do so.');
    console.log('You are not logged in - please do so.');
    return res.redirect("/");
  }
  const db = await Connection.open(mongoUri, DBNAME);
  var departments = await db.collection("departments").find({}).toArray();
  res.render('makeCourse.ejs', {departments: departments});
});

app.post("/inputCourse/", async (req, res) => {
  try {
    const db = await Connection.open(mongoUri, DBNAME);
    var course_id = req.body.courseId;
    var course_name = req.body.courseName;
    var course_code = req.body.courseCode;
    var department_id = req.body.department;
    var userId = req.session.userId;
    insertCourse(db, course_id, course_name, course_code, department_id, []);
    req.flash("info", "You have successfully submitted a Course!");
    return res.redirect('/review/');
  } catch (error) {
    req.flash('error', `Form submission error: ${error}`);
    return res.redirect('/')
  }
});

// ===============End of Nya Work ==================================

//================Start of Nico Work ===============================

app.get('/search/', async (req, res) => {
  let formData = req.query.term;
  console.log(`you submitted ${formData} to the search`)

  //create Regular expression to search
  let customRegex = new RegExp(formData, 'i');
  //console.log(customRegex);

  //open database connection
  const db = await Connection.open(mongoUri, DBNAME);
  const classDB = db.collection("classes");
  console.log("successfully connected to database")
  
  //search database for term
  let searchResults = await db.collection("courses").find({courseCode: {$regex: customRegex}}).project({_id: 0, courseCode: 1, courseId: 1}).toArray();
  console.log(searchResults);
  console.log("successfully queried database");

  //handle no search results
  if(searchResults.length <1){
    console.log("no results identified");
    req.flash('error', 'Sorry, your search did not return any results.');
    console.log("flashed");
    return res.redirect("/");
  }

  //handle one to multiple results
  else if(searchResults.length >= 1){
    console.log("Search results identified");
    let searchStrings = [];
    searchResults.forEach(((elt) => searchStrings.push(searchLinkGenerator(elt))));
    console.log(searchStrings);
    return res.render("searchResult.ejs", {searchResults: searchStrings, formData: formData})
  }
})
/**
 * Function for generating search results with clickable hyperlinks
 * @param {*} searchResult tuple containing coursecode and coursename info from database
 * @returns hyperlink and class name to be displayed on site
 */
function searchLinkGenerator(searchResult) {
  let className = searchResult.courseCode;
  let courseID = searchResult.courseId
  console.log(`/course/${courseID}`, `${className}`);
  return [`/course/${courseID}`, `${className}`]
}

//================End of Nico Work =================================

// ===============Given Code Below (Don't Delete yet)===============

// // shows how logins might work by setting a value in the session
// // This is a conventional, non-Ajax, login, so it redirects to main page 
// app.post('/set-uid/', (req, res) => {
//     console.log('in set-uid');
//     req.session.uid = req.body.uid;
//     req.session.logged_in = true;
//     res.redirect('/');
// });

// // shows how logins might work via Ajax
// app.post('/set-uid-ajax/', (req, res) => {
//     console.log(Object.keys(req.body));
//     console.log(req.body);
//     let uid = req.body.uid;
//     if(!uid) {
//         res.send({error: 'no uid'}, 400);
//         return;
//     }
//     req.session.uid = req.body.uid;
//     req.session.logged_in = true;
//     console.log('logged in via ajax as ', req.body.uid);
//     res.send({error: false});
// });

// // conventional non-Ajax logout, so redirects
// app.post('/logout/', (req, res) => {
//     console.log('in logout');
//     req.session.uid = false;
//     req.session.logged_in = false;
//     res.redirect('/');
// });

// two kinds of forms (GET and POST), both of which are pre-filled with data
// from previous request, including a SELECT menu. Everything but radio buttons

app.get('/form/', requiresLogin, (req, res) => {
    console.log('get form');
    // START OF AMY TEST
    if (!req.session.loggedIn) {
        req.flash('error', 'You are not logged in - please do so.');
        console.log('You are not logged in - please do so.');
        return res.redirect("/");
    }
    console.log("hi");
    // End of AMY TEST
    loggedIn = (req.session.loggedIn)||false;
    return res.render('form.ejs', {action: '/form/', data: req.query, loggedIn: loggedIn });
});

app.post('/form/', requiresLogin, (req, res) => {
    console.log('post form');
    return res.render('form.ejs', {action: '/form/', data: req.body });
});

app.get('/staffList/', async (req, res) => {
    const db = await Connection.open(mongoUri, WMDB);
    let all = await db.collection(STAFF).find({}).sort({name: 1}).toArray();
    console.log('len', all.length, 'first', all[0]);
    return res.render('list.ejs', {listDescription: 'all staff', list: all});
});

// ================================================================
// postlude

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`open http://localhost:${serverPort}`);
});
