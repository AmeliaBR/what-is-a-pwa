const staticFiles = [
    "index.html", // top-level index page
    "slides.css",
    "slides.js",
    "manifest.json",
    "icon_96.png",
    "icon_384.png",
];

const path = require("path");
const fs = require("fs");
const {promisify} = require("util");

const fsPromisesTo = {
    copyFile: promisify(fs.copyFile),
    mkdir: promisify(fs.mkdir)
}

// basic file copy routine
// TODO: add copying subfolders, and making directories if required
module.exports = function(src, destination, options={}) {
    let ops = staticFiles.map((filename)=> {
        return fsPromisesTo.copyFile(
            path.resolve(src, filename),
            path.resolve(destination, filename)
        )
    })

    return Promise.all(ops);
};
