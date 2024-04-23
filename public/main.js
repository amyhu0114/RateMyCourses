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

function removeReview(cN){
    $.post('/remove-review/', {cN: cN});
    // console.log(`INSIDE removeReview ${cN}`)
    // const req = new Request('/remove-review-ajax/', {method: 'POST',
    //                                            body: `{"cN": "${cN}"}`}); // body: {"cN": cN}});
    // fetch(req)
    //     .then(nextIfOk)
    //     .catch((error) => { console.error(error); });
}

$("#allReviews")
    .one()
    .on('click',
        'button[data-role=deleteReview]',
        function (event) {
            let cC = $(event.target).closest('.courseCard');
            let cN = $(cC).find('.courseName').text();
            console.log(`WITHIN HANDLER ${cN}`);
            removeReview(cN);
            $(cC).remove();
        });

console.log('main.js loaded');

/*
function loadProfessors(){
    $.get("/test/"+123, {}).then(processAction)


}

$('[name="courseIdReview"]').change(loadProfessors)
*/
