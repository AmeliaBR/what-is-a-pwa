const path = require("path");
const srcFolder = "./src/";
const buildFolder = path.resolve("./docs/");



// copy static files

// build CSS from Sass

// build slides

require(path.resolve(srcFolder, "build-slides.js"))(srcFolder, buildFolder);