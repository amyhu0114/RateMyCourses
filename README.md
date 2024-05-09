# RateMyCourse: Crowdsourcing Reviews on Wellesley Courses
## Developers
Jia Yuan (Amy) Hu, Sofia Kobayashi, Nico Pierson, and Nyana Wright

## [Link to Demonstration Video](https://drive.google.com/file/d/1pyZEbWsQNXyZpiFgnExQcneoWgqs16VS/view?usp=sharing)

## Project Overview
RateMyCourse lets Wellesley students rate their courses and view course ratings by other students. Submitters give each course a 5-point rating in different categories (ex. content difficulty, workload, accessibility, etc.), an overall rating (it wouldn’t make sense to average the other ratings since with some 1-star is good, but vice versa for others), a text review. Other users can then search up courses (by department, course code, or course title), see those reviews, and (if logged in) submit a review, make a new course, or upvote or downvote the reviews they like or dislike respectively. RateMyCourse is similar to sites like Rate My Teacher or Rate My Professor, but here we focus on rating the courses themselves. Students will also be able to upload Wellesley course syllabi. 

## What’s New
- Working upvote/downvotes on reviews, limited to one vote per signed-in user
- Reviews can now be filtered based on professor, rating, or both
- Dynamically averaged overall course ratings from reviews
- Syllabus Upload
- Improved UI/UX
    - Better login/signup UX
    - Streamlining page interactions

## Status of the project
RateMyCourse has all course features working! Authentication is working (registration, logging in, session, and logout), and when logged in, a user can submit a review, add a course or new professor, upvote/downvote on reviews, upload syllabi, and view and delete their own reviews. All users can view course pages and their reviews and search for courses.

## Directions for use
If you want to submit a review, you must log in, or sign up using any username and any password. You can then click the “Make Review” button to submit. To access any course page you must search in the search bar any element of a course code, either/or the letters and the numbers or both. 

### Testing Procedure:
1. On Home page, click on the “browse all courses” button [Nico]
    - That should send you to a search results page listing all current courses that have reviews in the database
2. Choose a department in the “filter by department” dropdown, and then press “filter” [Nico]
    - You should only see results of courses in the department you selected
3. Go back to the home page and search using search bar on home page -> search for “cs” [Nico]
    - This should redirect you to search result page
    - Note: If you search for anything that currently does not exist, webpage will redirect you to home and flash that the search did not find anything
4. After searching for CS, Click on CS 304 to go to course page [Sofia]
    - This should show a page of all the reviews for the course CS 304
    - You can filter reviews by overall rating, professor, or both. Select one or both from the drop down menu, and click filter
    - Cannot upvote or downvote without being logged in
5. Click on Make a Review on the Navbar [Nya]
    - Make a Review is an logged-in-only action so it will flash that you’re not logged in
6. Click on Signup in the Navbar and register with any username & password [Amy]
    - OR Login with the existing username & password
7. Click on Make a Review on the Navbar again [Nya]
    - Click on the Course dropdown menu in the “make a review” tab, if the course that you hope to review doesn’t exist already, click on the make course button
        - Fill out form and submit
        - This should redirect you to the “Make a Review” page
    - Fill in the review form
        - Check that courses without professors, automatically give the option to insert new professor
        - Try adding a new professor
     - Submit
        - This should redirect you to the course page for the course that you just reviewed -> You should see your review appear
        - If you see an existing review that you like or dislike, click on upvote or downvote for the review [Sofia]
        - The number of upvotes/downvotes for the review should change accordingly [Sofia]
        - Upload a syllabus pdf (optional) [Nya]
        - If you’ve uploaded a syllabus, you can click on view syllabus button
            - You should see that your added syllabus is now in there
            - If you choose a course with no uploaded syllabi, it will tell you
    - Return to Make Review, check that added professor is available in the professors drop down menu
8. Click on Profile from the Navbar [Amy]
    - You should see a list of all the reviews you’ve made
    - Click on the delete review button to delete the review
        - This should delete the review
9. Click on Home in the navbar to go back to home page [Amy]
10. Search for the course that you’ve deleted your review from using search bar and this time you should see your review disappear [Amy]
11. Click on Logout on the Navbar [Amy]
    - This time, clicking on Make a Review should flash that you’re not logged in


