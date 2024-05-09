// start app with 'npm run dev' in a terminal window
// go to http://localhost:port/ to view your deployment!
// every time you change something in server.js and save, your deployment will automatically reload
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
const counter = require('./counter-utils.js');
const { filter } = require('bluebird');


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


// Configure Multer for file upload
const ALLOWED_EXTENSIONS = ['.pdf' ];
app.use('/uploads', express.static('uploads'));

// Helper function for syllabus upload
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
      // the path module provides a function that returns the extension
      let ext = path.extname(file.originalname).toLowerCase();
      cb(null, file.fieldname + '-' + ext);
  }
})

// Helper function for syllabus upload
var upload = multer(
  { storage: storage,
    // check whether the file should be allowed
    // should also install and use mime-types
    // https://www.npmjs.com/package/mime-types
    fileFilter: function(req, file, cb) {
        let ext = path.extname(file.originalname).toLowerCase();
        let ok = ALLOWED_EXTENSIONS.includes(ext);
        if(ok) {
            cb(null, true);
        } else {
            cb(null, false, new Error('not an allowed extension:'+ext));
        }
    },
    // max fileSize in bytes
    limits: {fileSize: 1_000_000 }});

// ================================================================

// Constant declaration
const DBNAME = 'RateMyCourse';
const USERS = 'users';
const COURSES = 'courses'
const REVIEWS = 'reviews'
const COUNTERS = 'counters'
const FILES = 'files';
const ROUNDS = 15;

// Main page. This shows the use of session cookies
app.get('/', (req, res) => {
  // Set relevant variables
  let uid = req.session.uid || 'unknown';
  let visits = req.session.visits || 0;
  visits++;
  req.session.visits = visits;

  // Check logged in status
  const loggedIn = (req.session.loggedIn) || false;
  return res.render('main.ejs', {loggedIn: loggedIn});
});

// =============== Beginning of Sofia Work ============================
/**
 * Calculates the given number out of a 5-point scale represented with 
 * star symbols.
 * @param {number} starNum 
 * @returns {string} star representation of given number
 */
function makeStars(starNum) {
  starNum = starNum === undefined ? 0 : Math.floor(starNum);
  return '★'.repeat(starNum) + '☆'.repeat(5-starNum);
}

/**
 * Gets the average ratings for the given courseId aggregated by every review for
 * that course.
 * @param {number} courseId 
 * @returns {Object} of all present ratings
 */
async function getAvgRatings(courseId) {
  const db = await Connection.open(mongoUri, DBNAME);
  const ratings = await db.collection(REVIEWS).aggregate(
    [
      {$match: {courseId: courseId}}, 
      {$group: 
        {
          _id: "$courseId", 
          overall: {$avg: "$overallRating"},
          workload: {$avg: "$workloadRating"},
          content: {$avg: "$contentDifficulty"},
          accessibility: {$avg: "$accessibilityRating"}
        }
      }
    ]
  ).toArray();
  return ratings.length == 0 ? {} : ratings[0];
}

/**
 * Takes array of reviews, formats relevant data to display reviews.
 * @param {Array} reviewData 
 * @returns {Array} of reviews
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
    const title = reviewObj.title;
    const db = await Connection.open(mongoUri, DBNAME);

    // Get course data
    const courseList = await db.collection(COURSES).find(
      {courseId: parseInt(cid)}).toArray();
    const courseName = courseList[0].courseName;

    // Format review data
    return {workloadStars: makeStars(workloadNum),
            accessibilityStars: makeStars(accessibilityNum),
            contentStars: makeStars(contentNum),
            overallStars:makeStars(overallNum),
            text: reviewObj.reviewText,
            courseName: courseName,
            upvotes: reviewObj.upvotes,
            downvotes: reviewObj.downvotes,
            id: reviewObj.reviewId,
            courseId: parseInt(reviewObj.courseId),
            title: title,
            professor: 'professor' in reviewObj ? reviewObj.professor : null,
            }
  }));
  return reviewList;
}

app.get('/course/:cid', async (req, res) => {
  // START HERE FOR DOC: 
  // clean up console.logs
  // make sure all functions have doc strings

  // finish limited upvoting

  // Make sure all reviews have title
  // read Scott's feedback
  // Update README

  // Set relevant variables
  const cid = req.params.cid;
  const db = await Connection.open(mongoUri, DBNAME);
  const filterRating = parseInt(req.query.rating);
  const filterProf = req.query.professor;

  // Get course data
  const courseList = await db.collection(COURSES).find({
    courseId: parseInt(cid)}).toArray();
  if (courseList.length === 0) {
    req.flash('error', `Course with courseId ${cid} not found!`);
    return res.redirect("/");
  }
  const courseData = courseList[0]

  // Get department data
  const deptList = await db.collection('departments').find({
    departmentId: courseData.departmentId}).toArray();
  if (deptList.length === 0) {
    req.flash('error', 
      `Department with departmentId ${courseData.departmentId} not found!`);
    return res.redirect("/");
  }
  const departmentName = deptList[0].departmentName;

  // Create review query based on filters
  const query = {courseId: parseInt(cid)};
  if (!isNaN(filterRating)) {
    query['overallRating'] = filterRating;
  }
  if (filterProf !== "" && filterProf !== undefined) {
    query['professor'] = filterProf;
  }

  // Get review data
  const reviewData = await db.collection(REVIEWS).find(query).toArray();
  const reviewList = await formatReveiws(reviewData);

  // Get average ratings data
  const ratings = await getAvgRatings(parseInt(cid));

  // Get session data
  const loggedIn = (req.session.loggedIn) || false;

  return res.render("course.ejs", {
        cid: courseData.courseId,
        courseHeader: `${courseData.courseCode}: ${courseData.courseName}`,
        courseSubheader: 
          `${departmentName} - Taught By: ${courseData.professorNames.join(", ")}`,
        professors: courseData.professorNames,
        overallStars: makeStars(ratings.overall),
        accessibilityStars: makeStars(ratings.accessibility),
        workloadStars: makeStars(ratings.workload), 
        contentStars: makeStars(ratings.content),
        overallNum: ratings.overall === undefined ? 
          null : ratings.overall.toFixed(2),
        accessibilityNum: ratings.accessibility === undefined ? 
          null : ratings.accessibility.toFixed(2),
        workloadNum: ratings.workload === undefined ? 
          null : ratings.workload.toFixed(2),
        contentNum: ratings.content === undefined ? 
          null : ratings.content.toFixed(2),
        reviewList: reviewList,
        loggedIn: loggedIn,
        filterProf: filterProf,
        filterRating: filterRating,
                                })

})

// Ajax function, handles increment/decrementing upvotes & downvotes
app.post('/increment-votes/', async (req, res) => {  
  // Set relevant variables
  const rid = parseInt(req.body.rid);
  const button = req.body.button;
  const uid = req.session.userId;
  console.log("uid", uid)
  const db = await Connection.open(mongoUri, DBNAME);
  console.log()
  console.log("rid", rid)

  let errorMessage = "";
  if (req.session.loggedIn) {
    const user = await db.collection(USERS).find({userId: uid}).toArray();
    let upInc = 0;
    let downInc = 0;
    const upvoted = user[0].upvoted;
    const downvoted = user[0].downvoted;
    console.log(upvoted, downvoted)

    if (upvoted.includes(rid)) {
      if (button === 'up') {
        errorMessage = "You already upvoted here!"
        console.log('already up');
      } 
      // else {
      //   // remove rid from upvotes, add it to downvoted, -1 review upvote num
      //   upvoted.push(rid)
      //   downvoted.pop(rid)
      //   upInc = -1;
      //   console.log('');
      // }
    } else {
      if (button === 'up') {
        // add to upvoted, upvotes+1
        console.log('new upvote')
        upInc = 1;
        upvoted.push(rid);
      } else {
        // add to downvotes, upvotes+1
        downInc = 1;
        downvoted.push(rid);
      }
    }

    // else if (!downvotes.contains(rid)) {
    //   if (button === 'down') {
    //     errorMessage = "You already downvoted here, hater!"
    //   } else {
    //     // remove rid from downvotes, add it to upvoted, -1 review downvote num
    //   }
    // } 
  
    // Update review voting numbers
    await db.collection(REVIEWS).updateOne({reviewId: rid}, 
      {$inc: {upvotes: upInc, downvotes: downInc}});  
    console.log(upvoted, downvoted)

    // Update user voting lists
    await db.collection(USERS).updateOne({userId: uid}, 
      {$set: {upvoted: upvoted, downvoted: downvoted}});  
  } else {
    errorMessage = "Please log in to vote!";
  }

  // Get & return new total votes (second call in case someone else voted when you did)
  const review = await db.collection(REVIEWS).findOne({reviewId: rid});
  return res.json({totalVotes: review.upvotes-review.downvotes, 
                  errorMessage: errorMessage});
  
});
// =============== End of Sofia Work ==================================

// =============== Beginning of Amy Work ============================
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

      // given that the username does not exist, hash the password and add the user 
      // (userID, userName, hashed passwrod) to the user database
      const hash = await bcrypt.hash(password, ROUNDS);
      const counterCol = db.collection(COUNTERS);
      // use the counter module to generate the next userID
      var uID = await counter.incrCounter(counterCol, USERS);
      await db.collection(USERS).insertOne({
          userId: uID,
          userName: username,
          hash: hash
      });
      console.log('successfully joined as', username);
      req.flash('info', 'successfully joined and logged in as ' + username);
      // set username & userID of session, set loggedIn of session to true
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
      if (!existingUser) {
        req.flash('error', "Username does not exist - try again.");
        console.log("Username does not exist - try again.");
       return res.redirect('/')
      }
      // Given username exists, compare hashed password stored in database with
      // the hashed version of the password entered by the user
      const match = await bcrypt.compare(password, existingUser.hash); 
      if (!match) {
          req.flash('error', "Username or password incorrect - try again.");
          console.log("Username or password incorrect - try again.");
          return res.redirect('/')
      }
      req.flash('info', 'successfully logged in as ' + username);
      console.log('successfully logged in as ' + username);
      // set username & userID of session, set loggedIn of the session to true
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
  
  // GET handler to enable log out by clearing/nullifying all session info
  app.get('/logout/', async (req,res) => {
    if (req.session.username) {
      // nullify username & userID of session, set loggedIn of session to false
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

  /**
   * Ensures the user is logged in to be called by any endpoints that 
   * requires login
   */
  function requiresLogin(req, res, next) {
    // if the user is not logged in, flash the error and redirect to home
    if (!req.session.loggedIn) {
      req.flash('error', 'This page requires you to be logged in - please do so.');
      return res.redirect("/");
    } else {
        next();
    }
  }

  // GET handler that shows all the reviews made by the logged in user
  app.get("/profile", async (req, res) => {
    // Get review data given the logged in user from the database
    var userId = req.session.userId;
    var username = req.session.username;
    const db = await Connection.open(mongoUri, DBNAME);
    const reviewData = await db.collection(REVIEWS).find({
      userId: parseInt(userId)}).toArray();
    const reviewList = await formatReveiws(reviewData);
    
    // Get session data
    const loggedIn = (req.session.loggedIn) || false;
    return res.render("profile.ejs", {userName: username, 
                                      reviewList: reviewList, 
                                      loggedIn: loggedIn});
  })

  // POST handler for user to delete any review they've made
  app.post('/remove-review/',requiresLogin, async (req, res) => {
        let cID = parseInt(req.body.cID);
        var userId = req.session.userId;
        const db = await Connection.open(mongoUri, DBNAME);
        let result = await db.collection(REVIEWS).deleteOne({courseId:cID, 
                                                              userId: userId});
    });
// ===============End of Amy Work ==================================

// ===============Beginning of Nya Work ============================
/**
 * Inserts reviews with the given data.
 * Helper function for the Post handler of the /review/ page.
 * @param {db} db 
 * @param {string} courseId 
 * @param {string} difficulty 
 * @param {string} workload 
 * @param {string} text 
 * @param {string} userId 
 * @param {string} rating 
 * @param {string} accessibility 
 * @param {string} professor 
 * @param {string} title 
 * @returns promise to update the database
 */
async function insertReview(db, courseId, difficulty, workload, text, userId, 
  rating, accessibility, professor, title){
  // Get review id from counter collection
  const counterCol = await db.collection(COUNTERS);
  const newId = await counter.incrCounter(counterCol, REVIEWS);
  
  // Inserts review  
  let result = db.collection(REVIEWS).insertOne({
    courseId: parseInt(courseId), 
    contentDifficulty: parseInt(difficulty), 
    workloadRating: parseInt(workload), 
    reviewText: text, 
    userId: parseInt(userId), 
    overallRating: parseInt(rating), 
    accessibilityRating: parseInt(accessibility), 
    professor: professor, 
    upvotes: 0, 
    downvotes: 0, 
    reviewId: newId, 
    title: title});
  return result;
}

/* Get handler for the /review/ page.
Renders the makeReview.ejs page, with the courses in the database as 
options for courses to review
*/
app.get('/review/', requiresLogin, async (req, res) => {
  if (!req.session.loggedIn) {
    req.flash('error', 'You are not logged in - please do so.');
    console.log('You are not logged in - please do so.');
    return res.redirect("/");
  }
  const db = await Connection.open(mongoUri, DBNAME);

  //finds courses to feed into rendering of makeReview.ejs page
  var courses = await db.collection(COURSES).find({}).toArray();
  var professors = {};
  courses.forEach(course => professors[course.courseId]=course.professorNames)
  const loggedIn = (req.session.loggedIn) || false;
  res.render('makeReview.ejs', {courses: courses, professors:professors,
                                loggedIn: loggedIn
                              });
});

/* Post handler for the /review/ page to enable form submission 
  Inserts a review into the database, with the information submitted in the form
*/
app.post("/review/", async (req, res) => {
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
    var title = req.body.reviewTitle;

    // Handles adding a new professor
    if (professor == 'other' || professor == null){
      var newProf = req.body.newProf;
      await insertReview(db, course_id, difficulty, workload, text, userId, 
        rating, accessibility, newProf, title);
      await db.collection(COURSES).updateOne({courseId: parseInt(course_id)}, 
                                              {$push: {professorNames: newProf}});
    }
    else{ //inserting the review
    await insertReview(db, course_id, difficulty, workload, text, userId, 
      rating, accessibility, professor, title);
    }

    //flashing verification that review is submitted, redirects to the home page
    req.flash("info", "You have successfully submitted a review!");
    return res.redirect('/course/'+course_id);
  } catch (error) { //error handler, redirects to home page
    req.flash('error', `Form submission error: ${error}`);
    return res.redirect('/')
  }
});

/* Uploading syllabi route */
app.post('/upload/:cid', upload.single('photo'), async (req, res) => {
  // insert file data into mongodb
  const db = await Connection.open(mongoUri, DBNAME);
  const unprot = db.collection(FILES);
  const result = await unprot.insertOne({title: req.body.title,
                                         courseId: req.params.cid,
                                         path: '/uploads/'+req.file.filename});
  // Flash confirmation
  req.flash('info', 'file uploaded');
  return res.redirect('/');
});

/* Viewing Syllabi route*/
app.get('/upload/:cid', async (req, res) => {
  const db = await Connection.open(mongoUri, DBNAME);
  let course_id = req.params.cid;
  //finding files with the right courseId
  let files = await db.collection(FILES).find({courseId: course_id}).toArray();
  const loggedIn = (req.session.loggedIn) || false;
  return res.render('uploadSyllabus.ejs', {uploads: files, loggedIn: loggedIn});
});

/**
 * Inserts a course with the given info.
 * Helper function for the /inputCourse/ POST handler.
 * @param {db} db 
 * @param {string} course_name 
 * @param {string} course_code 
 * @param {string} department_id 
 * @param {Array} professor_list 
 * @returns a promise to update the database
 */
async function insertCourse(db, course_name, course_code, department_id, 
  professor_list){
  // Get course id from counters collection
  const counterCol = await db.collection(COUNTERS);
  const course_id = await counter.incrCounter(counterCol, COURSES);

  // Insert course
  let result = db.collection(COURSES).insertOne({
    courseId: parseInt(course_id), 
    courseName: course_name, 
    courseCode: course_code, 
    departmentId: parseInt(department_id), 
    professorNames: professor_list});
  return result;
}

/* get handler for /inputCourse/ page
The input course button on the /review/ page, redirects to this page renders the 
makeCourse.ejs form, with the available departments as options on the form
*/
app.get('/inputCourse/', requiresLogin, async (req, res) => {
  //flashes error, does not let you access this page if you're not logged in
  if (!req.session.loggedIn) {
    req.flash('error', 'You are not logged in - please do so.');
    console.log('You are not logged in - please do so.');
    return res.redirect("/");
  }

  //finds departments to put in the ejs form when rendering
  const db = await Connection.open(mongoUri, DBNAME);
  var departments = await db.collection("departments").find({}).toArray();
  
  // Gets session info
  const loggedIn = (req.session.loggedIn) || false;
  res.render('makeCourse.ejs', {departments: departments, loggedIn: loggedIn});
});

/* POST handler for /inputCourse/
  inserts a course into the database, with the data inputted in the form
  Redirects to teh review page
*/
app.post("/inputCourse/", async (req, res) => {
  try {
    //getting the relevant variables
    const db = await Connection.open(mongoUri, DBNAME);
    var course_name = req.body.courseName;
    var course_code = req.body.courseCode;
    var department_id = req.body.department;

    //inserting the course
    insertCourse(db, course_name, course_code, department_id, []);

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

  //open database connection
  const db = await Connection.open(mongoUri, DBNAME);
  let listOfDepts = await db.collection("departments").find().toArray();
  
  //search database for term
  let searchResults = await db.collection(COURSES).find(
    {courseCode: {$regex: customRegex}}).project(
      {_id: 0, courseCode: 1, courseId: 1}).toArray();

  //handle no search results
  if(searchResults.length <1){
    console.log("no results identified");
    req.flash('error', 'Sorry, your search did not return any results.');
    return res.redirect("/");
  } else if(searchResults.length >= 1){  //handle one to multiple results
    console.log("Search results identified");
    let searchStrings = [];
    searchResults.forEach(((elt) => searchStrings.push(searchLinkGenerator(elt))));
    
    // Get session info
    loggedIn = (req.session.loggedIn) || false;
    return res.render("searchResult.ejs", {searchResults: searchStrings, 
                                          loggedIn: loggedIn,
                                          formData: formData, depts: listOfDepts})
  }
})
/**
 * Function for generating search results with clickable hyperlinks
 * @param {tuple} searchResult (coursecode, coursename) info from database
 * @returns hyperlink and class name to be displayed on site
 */
function searchLinkGenerator(searchResult) {
  let className = searchResult.courseCode;
  let courseID = searchResult.courseId
  return [`/course/${courseID}`, `${className}`]
}

/**
 * Route to go to the "browse all courses" page, which is the search 
 * page with all available results loaded. Also dynamically generates the 
 * filter by department dropdown options from the available departments 
 * listed in the database. 
 */
app.get('/browse/', async (req, res) => {
  // Get query
  let queryDept = req.query.department;
  console.log(`you submitted ${queryDept} to the search`)
  
  //open database connection & set variables
  const db = await Connection.open(mongoUri, DBNAME);
  console.log("successfully connected to database")
  let blank = "";
  let deptIdInt = parseInt(queryDept)
  const loggedIn = (req.session.loggedIn) || false;
  
  //now, search courses for department ID
  let searchResults = await db.collection(COURSES).find({departmentId: deptIdInt}).toArray();
  let listOfDepts = await db.collection("departments").find().toArray();
  //now we have our list of search results
  
  //handle no search results
  if(searchResults.length <1){
    console.log("no results identified");
    req.flash('error', 'Sorry, there are no courses currently listed in this department.');
    return res.redirect("/search/");
  }

  //handle one to multiple results
  else if(searchResults.length >= 1){
    console.log("Search results identified");
    let searchStrings = [];
    searchResults.forEach(((elt) => searchStrings.push(searchLinkGenerator(elt))));
    
    return res.render("searchResult.ejs", {searchResults: searchStrings, 
                                          loggedIn: loggedIn,
                                          formData: blank, depts: listOfDepts})
  }

  return res.render("searchbrowser.ejs", {loggedIn: loggedIn});
})

/**
 * route to send the user to the signup prompt page
 */
app.get('/signup/', async (req, res) => {
  const loggedIn = (req.session.loggedIn) || false;
  return res.render("signup.ejs" , {loggedIn: loggedIn})
})

/**
 * route to send the user to the login
 */
app.get('/login/', async (req, res) => {
  const loggedIn = (req.session.loggedIn) || false;
  return res.render("login.ejs", {loggedIn: loggedIn})
})

//================End of Nico Work =================================

const serverPort = cs304.getPort(8080);
// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`open http://localhost:${serverPort}`);
});
