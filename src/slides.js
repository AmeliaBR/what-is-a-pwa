/* This is ES5; it should run in all browsers */
'use strict';

/* Support PageUp / PageDown to cycle slides */
window.addEventListener("keyup", function(e) {
    var el;
    if ((e.key == "PageDown")||(e.keyCode == 34)) {
        el = document.getElementById("next-slide-link");
    }
    else 
    if ((e.key == "PageUp")||(e.keyCode == 33)) {
        el = document.getElementById("previous-slide-link");
    }
    if (el) {
        el.click();
        e.preventDefault();
        return false;
    }
});

// TODO: Add arrow handling for the ToC list

// TODO: register service worker

// create SPA effect
if (window.history && document.querySelector) initializeSwapper();

function initializeSwapper() {
var savedPages = {}; // TODO, upgrade to service worker or local storage
savedPages[location.href] = extractContent(document);

var currentHref = location.href;
    // href of currently displayed content, regarless of popstate changes
var scopeURL = location.origin + 
        document.querySelector("meta[itemprop=scope]").getAttribute("content");

[].forEach.call(
    document.querySelectorAll("[data-slides-swap]"),
    function(el) { 
        el.addEventListener("click", interceptLinkClick);
        if (el.getAttribute("data-slides-swap") == "preload") {
            fetchPageContent(el.href, true);
        }
    });

window.addEventListener("popstate", function(e) {
    var newHref = location.href;
    if (newHref = currentHref) return;

    if (savedPages[newHref]) swapPage(newHref, e.state);
    else fetchPageContent(newHref);
})

function extractContent(doc) {
    return doc.querySelector(".slide");
}

function interceptLinkClick(e) {
    if (e.button||e.ctrlKey||e.shiftKey||e.metaKey) {
        // this wasn't a regular click
        // (e.button was not 0, or a modifier key was used)
        return;
    }
    
    var el = e.currentTarget,
        href = el.href; // absolute link target URL

    if (href.search(scopeURL)) {
        // href doesn't start with the full scope URL
        // (search didn't return 0)
        return;
    }

    if (savedPages[href]) {
        swapPage(href);
    }
    else {
        fetchPageContent(href);
    }

    e.preventDefault();
    return false;
}

function fetchPageContent(href, preloadOnly) {
    var contentHref =  href.replace(/[\/]?$/, "/content.html");
    var request = new XMLHttpRequest();
    request.open("GET", contentHref);
    request.responseType = "document";
    request.addEventListener("load",
        function(e) {
            if ((this.status >= 400)||(!this.responseXML)) {
                if (!preloadOnly) showError(e);
                return;
            }
            savedPages[href] = extractContent(this.responseXML);
            if (!preloadOnly) swapPage(href);
        }
    );
    if (!preloadOnly) {
        request.addEventListener("error", showError);
    }
    request.send();
}

function swapPage(newHref, popstate) {
    var oldContent = document.querySelector(".slide:not([aria-hidden])");
    var newContent = savedPages[newHref];
    var oldIndex = parseInt(oldContent.getAttribute("data-slide-index"), 10);
    var newIndex = parseInt(newContent.getAttribute("data-slide-index"), 10);
    /* if (window.animate && (Math.abs(newIndex-oldIndex) = 1)) {
        // slide in the new content
    } else {*/
        // swap
        oldContent.parentElement.insertBefore(
            newContent,
            oldContent
        );
        oldContent.remove();
    /* } */

    var oldToCEntry = getToCEntry(oldIndex);
    oldToCEntry.href = currentHref;
    oldToCEntry.removeAttribute("aria-current");

    var newToCEntry = getToCEntry(newIndex);
    newToCEntry.setAttribute("aria-current", "page");
    newToCEntry.removeAttribute("href");

    updateSlideLink(document.getElementById("next-slide-link"),
                    getToCEntry(newIndex + 1)
                );
    updateSlideLink(document.getElementById("previous-slide-link"),
                    getToCEntry(newIndex - 1)
                );

    document.getElementById("toc-toggle").checked = false;
        // close popup menu if it was open

    currentHref = newHref;
    var newTitle = newContent.getAttribute("data-slide-name");
    history.pushState({}, newTitle, newHref);
    document.title = newTitle;
}

function getToCEntry(index) {
    var toc = document.getElementById("toc");
    return toc.querySelector("li:nth-of-type(" + index + ") > a");
}
function updateSlideLink(slideLink, tocEntry) {
    if (tocEntry) {
        var href = slideLink.href = tocEntry.href;
        slideLink.style.display = null; // remove inline style
        if (!savedPages[href]) {            
            fetchPageContent(href, true);  // preload
        }
    }
    else {
        slideLink.removeAttribute("href");
        slideLink.style.display = "none";
    }
}

function showError(statusEvent) {
    var errorContainer = document.getElementById("error");
    errorContainer.removeAttribute("aria-hidden");
    errorContainer.innerHTML =
        "<p>Couldn't load slide at "
        + statusEvent.target.responseURL
        + (statusEvent.target.status?
            "; the server responded with " + statusEvent.target.statusText
            : " because of a network error.")
        + "</p>"
        + ((navigator.onLine)?"": "<p>You appear to be offline.</p>")
        + "<button class='close-button'>Dismiss this notice</button>";
    errorContainer.querySelector(".close-button")
        .addEventListener("click", function(e) {
            errorContainer.innerHTML = ""; 
            errorContainer.setAttribute("aria-hidden", "true");
        });
}
}