const slideDataFile = "./slides.yaml";
const siteDataFile = "./site.yaml";
const templateFolder = "./templates/";
const defaultTemplate = "default";
const layoutTemplate = "index";
const templateSuffix = ".html.mustache";

const path = require("path");
const fs = require("fs");
const {promisify} = require("util");
const yaml = require("yaml-parser");
const mustache = require("mustache");

const fsPromisesTo = {
    readFile: promisify(fs.readFile),
    writeFile: promisify(fs.writeFile),
    mkdir: promisify(fs.mkdir)
}

module.exports = function(src, destination, options={}) {
    let slideDataArray = [];
    let fetchTemplates = templateParser(path.resolve(src, templateFolder));
    let siteData, layout;

// load and process the main source files (site data, slide content, layout template)
Promise.all([
    fsPromisesTo.readFile(path.resolve(src, siteDataFile), 'utf8')
    .then((dataString)=> {
        siteData = yaml.safeLoad( dataString );
    }),

    fsPromisesTo.readFile(path.resolve(src, slideDataFile), 'utf8')
    .then((dataString)=> {
        yaml.safeLoadAll(
            dataString,
            (slide)=>{if(slide) slideDataArray.push(slide)},
            {onWarning: console.error.bind(console) }
        );
    }),

    fetchTemplates(layoutTemplate)
    .then((layoutTemplateContent)=> {
        layout = layoutTemplateContent;
    })
]).then(()=>{
    slideDataArray.forEach( slugAndTitleGenerator(options.slugStyle) );

    slideDataArray.forEach( (d, i)=> {
        d.index = i+1;
        let dirPath = path.join(destination, d.slug);
        let rendered;
        fetchTemplates(d.template||defaultTemplate)
            .then((template)=> {
                rendered = mustache.render(template, d);
            })
            .then( ()=>fsPromisesTo.mkdir(dirPath) )
            .then( ()=>true, //mkdir was successful
                   (err)=>{
                        if (err.code == 'EEXIST') {
                            // it's still good!
                            return true;
                        }
                        else throw err;
                   }
            )
            .then( ()=> { // write the output files in parallel
                let contentPath = path.join(dirPath, "content.html");
                let writeContent = 
                    fsPromisesTo.writeFile(contentPath, rendered);

                let filePath = path.join(dirPath, "index.html");
                let allSlides = slideDataArray.map(
                    (d)=>({slug: d.slug, name: d.name})
                );
                allSlides[i].current = true;
                let data = {
                    page: d,
                    allSlides: allSlides,
                    previous: i? allSlides[i-1] : null,
                    next: ( (i+1) < allSlides.length)?
                            allSlides[i+1] : null,
                    site: siteData,
                    content: rendered
                }
                let wrapped = mustache.render(layout, data);
                let writeIndex =
                    fsPromisesTo.writeFile(filePath, wrapped);
                
                return Promise.all([writeContent, writeIndex]);
            })
            .catch( (err)=> {
                console.error(err);
            });
    });

});
    
}

function templateParser(templateFolder) {
    let templates = new Map();

    return function(name) {
        let template = templates.get(name);
        if (!template) {
            let filename = path.resolve(templateFolder, (name + templateSuffix));
            return fsPromisesTo.readFile(filename, 'utf8')
                    .then((template)=>{
                        templates.set(name, template);
                            // save for re-use
                        mustache.parse( template );
                            // mustache stores the parsed object internally
                        return template;
                    });
        }
        else return Promise.resolve(template);
    }
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