"use strict";

var g;

function nextIfOk(resp) {
    g = resp;
    console.log('response received');
    if(resp.status === 200) {
        return resp.json();
    } else {
        throw new Error('Something went wrong on server!');
    }
}

function loginAjax() {
    let uid = $('[name=uid]').val();
    let form = document.getElementById('login_form');
    console.log('form', form);
    let form_data = new FormData(form);
    console.log('data', form_data);
    const req = new Request('/set-uid-ajax/', {method: 'POST',
                                               body: form_data});
    fetch(req)
        .then(nextIfOk)
        .then((resp) => { console.debug(resp);
                          // update page for logged-in user
                          $("#login-uid").text(uid);
                          $("#logged-in").show();
                          $("#not-logged-in").hide();
                        })
        .catch((error) => { console.error(error); });
}

$("#login-ajax").click(loginAjax);
    // Ajax function to post the courseID to the /remove-review endpoint
    function removeReview(cID){
    $.post('/remove-review/', {cID: cID});
}

// Delegated handler to delete an review with the corresponding clicked button
$("#allReviews")
    .one()
    .on('click',
        'button[data-role=deleteReview]',
        function (event) {
            let cC = $(event.target).closest('.courseCard');
            let cID = $(cC).attr('id');
            console.log(`WITHIN HANDLER ${cID}`);

            // call function to POST to backend
            removeReview(cID);

            $(cC).remove();
        });

// // Upvotes increment function
// async function incVotes(reviewId, upInc, downInc){
//     await $.post('/increment-votes/', {rid: reviewId, upInc: upInc, downInc: downInc}, function(data){
//         console.log("DATA", data);
//       });
//     console.log("nt2", nt2);
// }


function incVotes(reviewId, upInc, downInc, votesElement){
    console.log("here1")
    $.post('/increment-votes/', {rid: reviewId, upInc: upInc, downInc: downInc}, function(data){
        votesElement.text(data.totalVotes)
    });
}



// Upvotes event handler
$(".courseCard").one().on('click', 'button', (event) => {
    const reviewCard = $(event.target).closest('.courseCard');
    const voteNum = reviewCard.find('p[data-role=voteNum]');
    const revId = reviewCard.attr('id');

    const totalVotes = parseInt(voteNum.text());

    const btnType = event.target.getAttribute('data-role');
    if (btnType === 'downBtn') {
        console.log("DOWN");
        incVotes(revId, 0, 1, voteNum);
        // console.log("newVotes", newVotes)
        // voteNum.text(totalVotes-1);
    } else {
        console.log("UP");
        // const newVotes = incVotes(revId, 1, 0);
        incVotes(revId, 1, 0, voteNum);

        // voteNum.text(totalVotes+1);
    }
})

/**
 * Calculates the given number out of a 5-point scale represented with star symbols.
 * @param {number} starNum 
 * @returns {string} star representation of given number
 */
function makeStars(starNum) {
    starNum = Math.floor(starNum);
    return '★'.repeat(starNum) + '☆'.repeat(5-starNum);
  }

console.log('main.js loaded');


/*
function loadProfessors(){
    $.get("/test/"+123, {}).then(processAction)


}

$('[name="courseIdReview"]').change(loadProfessors)
*/

