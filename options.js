// Saves options to chrome.storage.sync.
function save_options() {
    var stripeWidth = Number(document.getElementById('stripeWidth').value);
    chrome.storage.sync.set({
        stripeWidth: stripeWidth
    }, function() {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = chrome.i18n.getMessage("optionSaved");
        setTimeout(function() {
            status.textContent = '';
        }, 750);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.sync.get({
        stripeWidth: 10
    }, function(items) {
        document.getElementById('stripeWidth').value = items.stripeWidth;
    });
}

function i18n() {
    document.querySelector('.optionTitle').innerHTML = chrome.i18n.getMessage("optionTitle");
    document.querySelector('.optionSave').innerHTML = chrome.i18n.getMessage("optionSave");
    document.querySelector('.optionStripeWidth').innerHTML = chrome.i18n.getMessage("optionStripeWidth");
}

document.addEventListener('DOMContentLoaded', restore_options);
document.addEventListener('DOMContentLoaded', i18n);
document.getElementById('save').addEventListener('click', save_options);