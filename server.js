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

const DTB = 'RateMyCourse';
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


/**
 * Calculates the given number out of a 5-point scale represented with star symbols.
 * @param {number} starNum 
 * @returns {string} star representation of given number
 */
function makeStars(starNum) {
  return '★'.repeat(starNum) + '☆'.repeat(5-starNum);
}

/**
 * Takes review data from database, formats relevant data.
 * @param {Array} reviewData 
 * @returns {Array}
 */
async function formatReveiws(reviewData) {
  // Get relevant review data
  const reviewList = await Promise.all(reviewData.map(async (reviewObj) => {
    // Must parseInt since data wasn't consistently integers for a while
    const workloadNum = parseInt(reviewObj.workloadRating);
    const accessibilityNum = parseInt(reviewObj.accessibilityRating);
    const contentNum = parseInt(reviewObj.contentDifficulty);
    const overallNum = parseInt(reviewObj.overallRating);
    const cid = parseInt(reviewObj.courseId);
    const db = await Connection.open(mongoUri, DTB);

    // Get course data
    const courseList = await db.collection('courses').find({courseId: parseInt(cid)}).toArray();
    const courseName = courseList[0].courseName;

    return {workloadStars: makeStars(workloadNum),
            accessibilityStars: makeStars(accessibilityNum),
            contentStars: makeStars(contentNum),
            overallStars:makeStars(overallNum),
            text: reviewObj.reviewText,
            courseName: courseName,
            }
  }));
  return reviewList;
}

app.get('/course/:cid', async (req, res) => {
  // Set relevant variables
  const cid = req.params.cid;
  const db = await Connection.open(mongoUri, DTB);

  // Get course data
  const courseList = await db.collection('courses').find({courseId: parseInt(cid)}).toArray();
  if (courseList.length === 0) {
    req.flash('error', `Course with courseId ${cid} not found!`);
    return res.redirect("/");
  }
  const courseData = courseList[0]

  // Get department data
  const deptList = await db.collection('departments').find({departmentId: courseData.departmentId}).toArray();
  if (deptList.length === 0) {
    req.flash('error', `Department with departmentId ${courseData.departmentId} not found!`);
    return res.redirect("/");
  }
  const departmentName = deptList[0].departmentName;

  // Get review data
  const reviewData = await db.collection('reviews').find({courseId: parseInt(cid)}).toArray();
  const reviewList = await formatReveiws(reviewData);

  // Get session data
  const loggedIn = (req.session.loggedIn) || false;

  // TO DO IN ALPHA: implement summing for course ratings from avg of reviews
  return res.render("course.ejs", {courseHeader: `${courseData.courseCode}: ${courseData.courseName}`,
                                  courseSubheader: `${departmentName} - Taught By: ${courseData.professorNames.join(", ")}`,
                                  overallStars: makeStars(4),
                                  accessibilityStars: makeStars(5),
                                  workloadStars: makeStars(2), 
                                  contentStars: makeStars(4),
                                  reviewList: reviewList,
                                  loggedIn: loggedIn
                                })

})




// ===============Beginning of Amy Work ============================
const DBNAME = "RateMyCourse";
const USERS = "users";
// POST Handler to enable signup
app.post("/join", async (req, res) => {
    try {
      // obtain user-entered username and password from the sign up form
      const username = req.body.username;
      const password = req.body.password;
      const db = await Connection.open(mongoUri, DBNAME);
      // check if the username is already in use
      var existingUser = await db.collection(USERS).findOne({userName: username});
      if (existingUser) {
        req.flash('error', "Login already exists - please try logging in instead.");
        console.log("Login already exists - please try logging in instead.");
        return res.redirect('/')
      }

      // given that the username does not exist, hash the password and add the user (userID, userName, hashed passwrod) to the user database
      const hash = await bcrypt.hash(password, ROUNDS);
      const counterCol = db.collection('counters');
      // use the counter module to generate the next userID
      var uID = await counter.incrCounter(counterCol, USERS);
      await db.collection(USERS).insertOne({
          userId: uID,
          userName: username,
          hash: hash
      });
      console.log('successfully joined', username, password, hash);
      req.flash('info', 'successfully joined and logged in as ' + username);
      // set the username and userID of the session and set loggedIn of the session to true
      req.session.username = username;
      req.session.userId = uID
      req.session.loggedIn = true;
      return res.redirect('/');
    } catch (error) {
      req.flash('error', `Form submission error: ${error}`);
      return res.redirect('/')
    }
  });
  
  // POST handler to enable login
  app.post("/login", async (req, res) => {
    try {
      // obtain user-entered username and password from the sign up form
      const username = req.body.username;
      const password = req.body.password;
      const db = await Connection.open(mongoUri, DBNAME);
      // checks if the username matches any existing account
      var existingUser = await db.collection(USERS).findOne({userName: username});
      console.log('user', existingUser);
      if (!existingUser) {
        req.flash('error', "Username does not exist - try again.");
        console.log("Username does not exist - try again.");
       return res.redirect('/')
      }
      // given that the username exists, compare the hashed password stored in database with the hashed version of the password entered by the user
      const match = await bcrypt.compare(password, existingUser.hash); 
      console.log('match', match);
      if (!match) {
          req.flash('error', "Username or password incorrect - try again.");
          console.log("Username or password incorrect - try again.");
          return res.redirect('/')
      }
      req.flash('info', 'successfully logged in as ' + username);
      console.log('successfully logged in as ' + username);
      // set the username and userID of the session and set loggedIn of the session to true
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
  
  // POST handler to enable log out
  app.post('/logout', (req,res) => {
    if (req.session.username) {
      // nullify the username and userID of the session and set loggedIn of the session to false
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

  // function that ensure the user is logged in to be called by any endpoints that requires login
  function requiresLogin(req, res, next) {
    // if the user is not logged in, flash the error and redirect to home
    if (!req.session.loggedIn) {
      req.flash('error', 'This page requires you to be logged in - please do so.');
      return res.redirect("/");
    } else {
        next();
    }
  }

  app.get("/profile", async (req, res) => {
    // Get review data given the logged in user from the database
    var userId = req.session.userId;
    var username = req.session.username;
    const db = await Connection.open(mongoUri, DTB);
    const reviewData = await db.collection('reviews').find({userId: parseInt(userId)}).toArray();
    const reviewList = await formatReveiws(reviewData);
    
    // Get session data
    const loggedIn = (req.session.loggedIn) || false;
    return res.render("profile.ejs", {userName: username, reviewList: reviewList, loggedIn: loggedIn});
  })
// ===============End of Amy Work ==================================

// ===============Beginning of Nya Work ============================
/* funtion to insert reviews, 
  takes in database, courseID, difficulty, workload, review text, userId, rating, and accessibility
  returns a promise to update the database
  Helper function for the Post handler of the /review/ page
*/
function insertReview(db, courseId, difficulty, workload, text, userId, rating, accessibility, professor){
  let result = db.collection("reviews").insertOne({courseId: parseInt(courseId), contentDifficulty: parseInt(difficulty), workloadRating: parseInt(workload), reviewText: text, userId: parseInt(userId), overallRating: parseInt(rating), accessibilityRating: parseInt(accessibility), professor: professor});
  return result;
}

/* Get handler for the /review/ page.
Renders the makeReview.ejs page, with the courses in the database as options for courses to review
*/
app.get('/review/', requiresLogin, async (req, res) => {
  if (!req.session.loggedIn) {
    req.flash('error', 'You are not logged in - please do so.');
    console.log('You are not logged in - please do so.');
    return res.redirect("/");
  }
  const db = await Connection.open(mongoUri, DBNAME);
  //finds courses to feed into rendering of makeReview.ejs page
  var courses = await db.collection("courses").find({}).toArray();
  var professors = {};
  courses.forEach(course => professors[course.courseId]=course.professorNames)
  console.log(professors);
  const loggedIn = (req.session.loggedIn) || false;
  res.render('makeReview.ejs', {courses: courses, professors:professors,
                                loggedIn: loggedIn
                              });
});

/* Post handler for the /review/ page to enable form submission 
  Inserts a review into the database, with the information submitted in the form
*/
app.post("/review/", async (req, res) => {
  console.log("HI")
  try {
    const db = await Connection.open(mongoUri, DBNAME);
    //getting relevant variables
    var course_id = req.body.courseIdReview;
    var difficulty = req.body.contentDifficulty;
    var accessibility = req.body.accessibility;
    var rating = req.body.rating;
    var workload = req.body.workloadRating;
    var text = req.body.reviewText;
    var userId = req.session.userId;
    var professor = req.body.Professor;
    //inserting the review
    insertReview(db, course_id, difficulty, workload, text, userId, rating, accessibility, professor);
    //flashing verification that the review is submitted, and redirecting to the home page
    req.flash("info", "You have successfully submitted a review!");
    return res.redirect('/course/'+course_id);
  } catch (error) {
    //error handler, redirects to home page
    req.flash('error', `Form submission error: ${error}`);
    return res.redirect('/')
  }
});

/* funtion to insert courses, helper function for the /inputCourse/ POST handler
  takes in database, courseID, course name, course code, department id, and a list of professors
  returns a promise to update the database
*/
function insertCourse(db, course_id, course_name, course_code, department_id, professor_list){
  let result = db.collection("courses").insertOne({courseId: parseInt(course_id), courseName: course_name, courseCode: course_code, departmentId: parseInt(department_id), professorNames: professor_list});
  return result;
}

/* get handler for /inputCourse/ page
The input course button on the /review/ page, redirects to this page
renders the makeCourse.ejs form, with the available departments as options on the form
*/
app.get('/inputCourse/', requiresLogin, async (req, res) => {
  if (!req.session.loggedIn) {
    //flashes error and does not let you access this page if you are not logged in
    req.flash('error', 'You are not logged in - please do so.');
    console.log('You are not logged in - please do so.');
    return res.redirect("/");
  }
  const db = await Connection.open(mongoUri, DBNAME);
  //finds departments to put in the ejs form when rendering
  var departments = await db.collection("departments").find({}).toArray();
  
  const loggedIn = (req.session.loggedIn) || false;
  res.render('makeCourse.ejs', {departments: departments, loggedIn: loggedIn});
});

/* POST handler for /inputCourse/
  inserts a course into the database, with the data inputted in the form
  Redirects to teh review page
*/
app.post("/inputCourse/", async (req, res) => {
  try {
    const db = await Connection.open(mongoUri, DBNAME);
    //getting the relevant variables
    var course_id = req.body.courseId;
    var course_name = req.body.courseName;
    var course_code = req.body.courseCode;
    var department_id = req.body.department;
    //inserting the course
    insertCourse(db, course_id, course_name, course_code, department_id, []);
    //flashing and redirecting after insertion
    req.flash("info", "You have successfully submitted a Course!");
    return res.redirect('/review/');
  } catch (error) {
    //Error handler, redirects to home page, and flashes the error
    req.flash('error', `Form submission error: ${error}`);
    return res.redirect('/')
  }
});

// ===============End of Nya Work ==================================

//================Start of Nico Work ===============================

/**
 * Route to find search results when a search term is submitted on the home page. 
 * Opens a database connection, queries for search term, and then responds appropriately.
 * If search results are identified, the route will render the search page, if no search results are detected,
 * it will redirect to the homepage and flash an error. 
 */
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
  let listOfDepts = await db.collection("departments").find().toArray();
  console.log("Depts list: ", listOfDepts);
  
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
    
    loggedIn = (req.session.loggedIn) || false;

    return res.render("searchResult.ejs", {searchResults: searchStrings, 
                                          loggedIn: loggedIn,
                                          formData: formData, depts: listOfDepts})
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


//new route to "browse all courses" page
app.get('/browse/', async (req, res) => {
  let queryDept = req.query.department;
  console.log(req.body);
  console.log(`you submitted ${queryDept} to the search`)
  
  //open database connection
  const db = await Connection.open(mongoUri, DBNAME);
  const classDB = db.collection("classes");
  console.log("successfully connected to database")
  let blank = "";

  let deptIdInt = parseInt(queryDept)
  //now, search courses for department ID

  const loggedIn = (req.session.loggedIn) || false;

  let searchResults = await db.collection("courses").find({departmentId: deptIdInt}).toArray();

  let listOfDepts = await db.collection("departments").find().toArray();
  //now we have our list of search results
  
  //handle no search results
  if(searchResults.length <1){
    console.log("no results identified");
    req.flash('error', 'Sorry, there are no courses currently listed in this department.');
    //console.log("flashed");
    return res.redirect("/search/");
  }

  //handle one to multiple results
  else if(searchResults.length >= 1){
    console.log("Search results identified");
    let searchStrings = [];
    searchResults.forEach(((elt) => searchStrings.push(searchLinkGenerator(elt))));
    console.log(searchStrings);

    return res.render("searchResult.ejs", {searchResults: searchStrings, 
                                          loggedIn: loggedIn,
                                          formData: blank, depts: listOfDepts})
  }
  return res.render("searchbrowser.ejs");
})


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
    loggedIn = (req.session.loggedIn) || false;
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
