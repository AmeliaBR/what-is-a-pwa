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