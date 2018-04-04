const path = require("path");
const srcFolder = "./src/";
const buildFolder = path.resolve("./docs/");



// copy static files
require(path.resolve(srcFolder, "copy-static.js"))(srcFolder, buildFolder);

// could add other build steps, e.g. CSS from Sass

// build slides

require(path.resolve(srcFolder, "build-slides.js"))(srcFolder, buildFolder);