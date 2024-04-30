# RateMyCourse: Crowdsourcing Reviews on Wellesley Courses
### Developers: Jia Yuan (Amy) Hu, Sofia Kobayashi, Nico Pierson, and Nyana Wright

## Project Overview
RateMyCourse lets Wellesley students rate their courses and view course ratings by other students. Submitters give each course a 5-point rating in different categories (ex. content difficulty, workload, accessibility, etc.), an overall rating (it wouldn’t make sense to average the other ratings since with some 1-star is good, but vice versa for others), a text review. Other users can then search up courses (by department, course code, or course title), see those reviews, and (if logged in) upvote or downvote the reviews they like or dislike respectively. RateMyCourse is similar to sites like Rate My Teacher or Rate My Professor, but here we focus on rating the courses themselves. Hopefully, students will also be able to upload Wellesley course syllabi. 

## Status of the project
**Features Not Requiring Login**
- Homepage: /
- Search: /search
- Browse: /browse
- Course: /course/123

**Features Requiring Login**
- Make Review [Requires Login]: /review
- Make Course [Requires Login]: /makeCourse
- Profile [Requires Login]: /profile
- Delete Review [Requires Login]: /remove-review

**Features to be added in the Beta Version:**
- Sorting and filtering courses on course pages
- Adding professors for new courses

## Directions for use
If you want to submit a review, you must log in, or sign up using any username and any password. You can then click the “Make Review” button to submit. To access any course page you must search in the search bar any element of a course code, either/or the letters and the numbers or both. 

**Testing Procedure:**
1. On Home page, click on the “browse all courses” button
    - That should send you to a search results page listing all current courses that have reviews in the database
2. Chose a department in the “filter by department” dropdown, and then press “filter”
    - You should only see results of courses in the department you selected
3. Go back to the home page and search using search bar on home page -> search for “cs”
    - This should redirect you to search result page
    - Note: If you search for anything else (which currently does not exist), webpage will redirect you to home and flash that the search did not find anything
4. After searching for CS, Click on CS 304 to go to course page
5. Click on Make a Review on the Navbar
    - Make a Review is an logged-in-only action so it will flash that you’re not logged in
6. Register with any username & password
    - Login with the same username & password
7. Click on Make a Review on the Navbar again
    - Click on the Course dropdown menu in the “make a review” tab, if the course that you hope to review doesn’t exist already, click on the make course button
        - Fill out form and submit
        - This should redirect you to the “Make a Review” page
    - Fill in the review form
        - Check that courses without professors, automatically give the option to insert new professor
        - Try adding a new professor
    - Submit
        - This should redirect you to the course page for the course that you just reviewed -> You should see your review appear
    - Return to Make Review, check that added professor is available in the professors drop down menu
8. Click on Profile from the Navbar
    - You should see a list of all the reviews you’ve made
    - Click on the delete review button to delete the review
        - This should delete the review
9. Click on Home in the navbar to go back to home page
10. Search for the course that you’ve deleted your review from using search bar and this time you should see your review disappear
11. Click on Logout on the Navbar
    - This time, clicking on Make a Review should flash that you’re not logged in


