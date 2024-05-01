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
            //let cN = $(cC).find('.courseName').text();
            let cID = $(cC).attr('id');
            console.log(`WITHIN HANDLER ${cID}`);
            // call function to POST to backend
            removeReview(cID);

            $(cC).remove();
        });


function incVotes(reviewId, upInc, downInc){
    $.post('/increment-votes/', {rid: reviewId, upInc: upInc, downInc: downInc});
}

$(".courseCard").one().on('click', 'button', (event) => {
    const voteNum = $(event.target).closest('.courseCard').find('p[data-role=voteNum]');
    const revId = voteNum.id;
    const totalVotes = parseInt(voteNum.text());

    const btnType = event.target.getAttribute('data-role');
    if (btnType === 'downBtn') {
        const newVotes = incVotes(revId, 0, 1)
    } else {
        const newVotes = incVotes(revId, 1, 0);
    }
    voteNum.text(newVotes);
    
    
})

console.log('main.js loaded');

/*
function loadProfessors(){
    $.get("/test/"+123, {}).then(processAction)


}

$('[name="courseIdReview"]').change(loadProfessors)
*/

