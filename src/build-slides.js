const slideDataFile = "./slides.yaml";
const siteDataFile = "./site.yaml";
const templateFolder = "./templates/";
const defaultTemplate = "default";
const layoutTemplate = "index";
const templateSuffix = ".html.mustache";

const path = require("path");
const fs = require("fs");
const yaml = require("yaml-parser");
const mustache = require("mustache");

module.exports = function(src, destination, options={}) {
    let slideDataArray = [];
    let fetchTemplates = templateParser(path.resolve(src, templateFolder));
    let siteData, layout;

// load and process the main source files (site data, slide content, layout template)
Promise.all([
    Promise.resolve()
    .then(()=> {
        siteData = yaml.safeLoad(
            fs.readFileSync(path.resolve(src, siteDataFile), 'utf8')
        );
    }),

    Promise.resolve()
    .then(()=> {
        yaml.safeLoadAll(
            fs.readFileSync(path.resolve(src, slideDataFile), 'utf8'),
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
        fetchTemplates(d.template||defaultTemplate)
            .then((template)=> {
                let rendered = mustache.render(template, d);
                return rendered;
            })
            .then((rendered)=> {
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath);
                }
                return rendered;
            })
            .then( (rendered)=> {
                let filePath = path.join(dirPath, "content.html");
                fs.writeFileSync(filePath, rendered);
                return rendered;
            })
            .then( (rendered)=> {
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
                fs.writeFileSync(filePath, wrapped);
                return true;
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
        return new Promise((resolve, reject)=>{
            try {
                let template = templates.get(name);
                if (!template) {
                    let filename = path.resolve(templateFolder, (name + templateSuffix));
                    template = fs.readFileSync(filename, 'utf8');
                    templates.set(name, template); // save for re-use
                    mustache.parse( template ); // mustache stores the parsed object internally
                }
                resolve( template );
            }
            catch(err){ reject(err); }
        });
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