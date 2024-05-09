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

/**
 * In the given reviewId, increments the upvotes by upInc and the downvotes by downInc, 
 * then updates the text of the given element to the most recent total votes
 * (upvotes-downvotes) number.
 * @param {number} reviewId 
 * @param {number} upInc 
 * @param {number} downInc 
 * @param {Element} votesElement 
 */
function incVotes(reviewId, upInc, downInc, votesElement){
    $.post('/increment-votes/', {rid: reviewId, upInc: upInc, downInc: downInc}, function(data){
        votesElement.text(data.totalVotes)
    });
}

// Upvotes event handler
$(".courseCard").one().on('click', 'button', (event) => {
    // Get relevant elements
    const reviewCard = $(event.target).closest('.courseCard');
    const voteNum = reviewCard.find('p[data-role=voteNum]');
    const revId = reviewCard.attr('id');

    // Increment votes
    const btnType = event.target.getAttribute('data-role');
    if (btnType === 'downBtn') {
        console.log("DOWN");
        incVotes(revId, 0, 1, voteNum);
    } else {
        console.log("UP");
        incVotes(revId, 1, 0, voteNum);
    }
})

console.log('main.js loaded');