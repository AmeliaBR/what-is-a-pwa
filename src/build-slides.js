const slideDataFile = "./slides.yaml";
//const siteDataFile = "./site.yaml";

const path = require("path");
const fs = require("fs");
const yaml = require("yaml-parser");

module.exports = function(src, destination, options={}) {
    let slideDataArray = [];
    let siteData = {}; //yaml.safeLoad(siteDataFile);


    yaml.safeLoadAll(
        fs.readFileSync(path.resolve(src, slideDataFile), 'utf8'),
        (slide)=>{if(slide) slideDataArray.push(slide)},
        {onWarning: console.error.bind(console) }
    );
    slideDataArray.forEach( slugAndTitleGenerator(options.slugStyle) );

    slideDataArray.forEach( (d)=> {
        let dirPath = path.join(destination, d.slug)
        fs.mkdir(dirPath, (err)=> {
            if (err && (err.code != 'EEXIST')) {
                console.error(err);
                return;
            }
            let filePath = path.join(dirPath, "index.html");
            fs.writeFile(filePath, JSON.stringify(d, null, 2),
                        (err)=>{if (err) console.error(err)});
        });
    });
    
}

const defaultSlugWordBreaks = [
    " ",
    ".",
    "—",
    ":"
];
function slugAndTitleGenerator({separator, wordBreaks} 
                = {separator:"-", wordBreaks: defaultSlugWordBreaks}) {
    let slugs = new Set();

    wordBreaks = wordBreaks.map((b)=>{
        return encodeURIComponent(b)
            .replace(/([\.\+\*\[\]\(\)\{\}\|\^\$\?\:\=\!])/g, "\\$1");
    });

    let wordBreakRE = new RegExp( `(${wordBreaks.join("|")})`, "g");
    let separatorEndsRE = new RegExp (`(^\\${separator}|\\${separator}$)`, "g");

    function slugify(text) {
        return encodeURIComponent(text.toString().toLocaleLowerCase() )
                    .replace(wordBreakRE, separator) 
                    .replace(/(%[0-9A-F]{2})+/g, "") // strip other URL encoded characters
                    .replace(separatorEndsRE, ""); // strip leading/trailing separators
    }
    function stripMarkupAndCollapse(text) {
        return text.replace(/<[^>]+>/g, "")
                   .replace(/\s+/g, " ");
    }

    return function(data, i) {
        if (!data.name) {
            data.name = stripMarkupAndCollapse(
                data.text || `Slide ${i}`
            );
        }
        let slug = data.name? slugify(data.name) : "";
        if ( (!slug) || slugs.has(slug) ) {
            slug += slugify(data.text);
        }
        while (slugs.has(slug)) slug += i; // just in case
        slugs.add(slug);

        data.slug = slug;
    }
}