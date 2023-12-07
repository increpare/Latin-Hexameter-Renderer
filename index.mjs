/* 
This program takes latin hexameter from input.txt and 
generates svg files for each verse (in the svg folder). 
It then generates index.html including all the svg files.

Input looks something like

Prī-mu(s am)-or Phoe-bī Daph-nē Pē-nē-i-a, quem nōn
for(s ig)nā-ra de-dit, sed sae-va Cu-pī-di-ni(s ī)-ra,
Dē-li-us hunc nū-per, vic-tā ser-pen-te su-per-bus,
*/

import fs from 'fs';

/* Syllable data structure
// I distinguish text_display from text_internal for the case where
// coda vowels get brought to the next word, and also for punctuation.
{
    text_display : string  
    text_internal : string
    syllable_long : boolean
    accented : boolean
    word_index : integer
    start_syllabe : bool
    end_syllable : bool
    syllable_index : integer
    pause_after : bool
}
*/

const vowels = 'aeiouy';
const vowels_long = 'āēīōūȳ';
const diphthongs = ['ae', 'au', 'ei', 'eu', 'oe', 'ui', 'yi'];
const consonants = ['c', 'k','ch', 'g','gn','i', 'j', 'l', 'p', 'ph', 'qu' ,'quu','r','rh','s','t','th','v','vu','x','z','b','d','f','h','m','n','q'];
//join all together into single array
const letters = vowels.split('').concat(vowels_long.split('')).concat(consonants);
//punctuation includes quotation marks (including fancy ones), question marks, commas, periods, etc.
const punctuation = ['.', ',', ';', ':', '?', '!', '“', '”', '‘', '’','"','\'' ];
const syllable_breaks = [' ', '-'];

console.log(letters);

function syllable_long(syllable) {
    //if it contains a long vowel, it's long
    for (let i=0;i<syllable.length;i++) {
        if (vowels_long.includes(syllable[i])) {
            return true;
        }
    }
    //if it contains a diphthong as a substring, it's long
    for (let i=0;i<diphthongs.length;i++) {
        let diphthong = diphthongs[i];
        if (syllable.includes(diphthong)) {
            return true;
        }
    }

    //following two bits are inelegant
    //count how many 'i's it has
    let i_count = 0;
    for (let i=0;i<syllable.length;i++) {
        if (syllable[i] === 'i') {
            i_count++;
        }
    }
    //if it ends with an 'i', and that 'i' is not the first vowel, it's long
    if (syllable[syllable.length-1] === 'i' && i_count === 1) {
        return false;
    }

    //if it ends with a consonant, it's long
    if (consonants.includes(syllable[syllable.length-1])) {
        return true;
    }
    
    return false;
}
// Syllablize a line of text into an array of syllables.
function syllablize(line) {
    if (line[line.length-1] !== ' ') {
        line += ' ';
    }
    //we work character-by-character, being careful to handle parentheses - parentheses are
    //a special notation to indicate that their contents are to be treated as a single 
    //syllable (elision).
    let syllables = [];
    let current_syllable_display="";
    let current_syllable_internal="";
    let in_parentheses = false;
    let parenthetical_internal = "";
    let last_break = ' ';
    let running_word_index=0;
    let running_syllable_index=0;
    let running_foot_index=0;
    let accent_current_syllable = false;

    for (let i=0;i<line.length;i++) {
        let c = line[i];
        var c_caseless = c.toLowerCase();     
        
        if (c==='^') { // word-accent
            accent_current_syllable = true;
        } if (c==='/') { // principle caesura
            //add caesura to previous syllable
            syllables[syllables.length-1].pause_after = true;
            i+=2;
        } if (letters.includes(c_caseless)) {            
            current_syllable_display += c;
            if (in_parentheses) {
                parenthetical_internal += c_caseless;
            } else {
                current_syllable_internal += c_caseless;
            }
        } else if (punctuation.includes(c)) {
            current_syllable_display += c;
        } else if ( c === '('){
            in_parentheses = true;
            current_syllable_display += '(';
        } else if ( c === ')'){
            in_parentheses = false;
            current_syllable_display += ')';
            current_syllable_internal += parenthetical_internal;
        }      
        
        if (syllable_breaks.includes(c) || c===')') {
            //if syllable nonempty, add it to the list of syllables
            console.log("length of " + current_syllable_internal + " is " +syllable_long(current_syllable_internal) );
            if (current_syllable_display.length > 0) {
                syllables.push({ 
                    text_display: current_syllable_display, 
                    text_internal: current_syllable_internal,
                    syllable_long: syllable_long(current_syllable_internal),
                    accented: accent_current_syllable,
                    word_index: running_word_index,
                    syllable_index: running_syllable_index,
                    start_syllable: last_break === ' ',
                    end_syllable: c === ' ',
                    pause_after: false ,
                    foot_start : false,
                    foot_end : false,
                    foot_position : -1,
                    foot_index: -1,
                    foot_type: "", //D,S,T          
                });
                accent_current_syllable=false;
                current_syllable_display = "";
                current_syllable_internal = "";
                last_break=c;

            }
            if (c === ' ') {
                running_word_index++;
                running_syllable_index=0;
            } else {
                running_syllable_index++;
            }
        } 
    }

    let word_already_accented = false;
    for (var i=0;i<syllables.length;i++) {
        var syllable = syllables[i];
        if (syllable.accented){
            word_already_accented = true;
        }

        //decide on accentuation when you reach the last syllable
        if (syllable.end_syllable===false){
            continue;
        }

        if (word_already_accented){
            word_already_accented=false;
            continue;
        }

        //if this is a one-syllable word, accent it
        if (syllable.start_syllable) {
            syllable.accented = true;
        }

        //if this is a two-syllable word, accent the first syllable
        else if (syllable.syllable_index===1) {
            syllables[i-1].accented = true;
        }
        
        //if it ends with an enclytic, the penultimate syllable is stressed
        else if (syllable.text_internal === 'que') {
            // I'm leaving out -ne and -ve because they could just be part of a word
            syllables[i-1].accented = true;
        }

        // 	In a word of three or more syllables, the accent falls on the next to last syllable (sometimes called the "penult"), if that syllable is long.
        else if (syllable.syllable_index > 1 && syllables[i-1].syllable_long === true) {
            syllables[i-1].accented = true;
        }
        // Otherwise, the accent falls on the syllable before that (the "antepenult").
        else {
            syllables[i-2].accented = true;
        }
        
    }

    //now we have the syllables, we can add the foot information
    //feet are either long-short-short (dactyl), long-long (spondee)
    let foot_syllable_index = 0;    
    for (let i=0;i<syllables.length;i++) {
        let syllable = syllables[i];
        syllable.foot_position = foot_syllable_index;    

        if (foot_syllable_index===0){
            syllable.foot_start = true;
            //set foot end of previous
            if (i>0) {
                syllables[i-1].foot_end = true;
            }
            if (syllable.syllable_long) {
                //good, no problem
                console.log("first syllable long: " + syllable.text_display + " (" + syllable.text_internal + ")");
            } else {
                //if first syllable is short, display an informative error message
                console.log("ERROR: foot starts with short syllable: " + syllable.text_display + " (" + syllable.text_internal + ")");
                console.log("line: " + line);
            }            
        } else if (foot_syllable_index===1){
            console.log("second syllable: " + syllable.text_display + " (" + syllable.text_internal + ") length: " + syllable.syllable_long);
            if (syllable.syllable_long) {
                //great! spondee. set this and the previous syllable to be of that type
                syllables[i-1].foot_type = "S";
                syllable.foot_type = "S";
                foot_syllable_index=-1;
            } else {//syllable short
                //if this is the final syllable, it's not a dactyl but trochee, which is okay
                if (i===syllables.length-1) {
                    syllables[i-1].foot_type = "T";
                    syllable.foot_type = "T";
                    foot_syllable_index=-1;
                } 
                //otherwise, if the next syllable is long, print an error
                else if (syllables[i+1].syllable_long) {
                    console.log("ERROR: foot starts with short syllable: " + syllable.text_display+ " (" + syllable.text_internal + ")");
                    console.log("line: " + line);
                } else {
                    //otherwise, it's a dactyl
                    syllables[i-1].foot_type = "D";
                    syllable.foot_type = "D";
                    syllables[i+1].foot_type = "D";
                    i++;
                    foot_syllable_index=-1;
                }
            } 
        } else {
            //error
            console.log("foot detection screwed up " + syllable.text_display+ " (" + syllable.text_internal + ")"); 
            console.log("line: " + line);           
        }
        foot_syllable_index++;

        
    }
    //set foot end of final syllable
    syllables[syllables.length-1].foot_end = true;

    return syllables;
}



// Load input.txt and read lines into array
const inputFilePath = 'input.txt';
const lines = fs.readFileSync(inputFilePath, 'utf-8').split('\n');

var syllablized_lines = [];
// Syllablize each line
for (let i=0;i<lines.length;i++) {
    var line = lines[i];
    var syllablized_line = syllablize(line);
    console.log(line);
    console.log(syllablized_line);
    syllablized_lines.push(syllablized_line);
}

//now we have the data, we can start generating the svg files
const svg_folder = 'svg';
if (!fs.existsSync(svg_folder)) {
    fs.mkdirSync(svg_folder);
}

function syllablized_line_to_svg(syllablized_line){
    let syllable_count = syllablized_line.length;

    console.log("syllable count", syllable_count  );
    const syllable_width=50;
    const syllable_height=20;

    
    const padding_top = 10;
    const padding_bottom = 10;
    const padding_left = 20;
    const padding_right = 20;

    const caesura_width = 4;

    let line_width = padding_left+ syllable_count * syllable_width + padding_right;



    
    let result = "<svg width=\"" + line_width + "\" height=\"" + (syllable_height*2 + padding_top + padding_bottom) + "\"  viewBox=\"0 0 " + line_width + " " + (syllable_height*2 + padding_top + padding_bottom) + "\" xmlns=\"http://www.w3.org/2000/svg\">\n";
    //background blue
    // result += `<rect x="${0}" y="${0}" width="${line_width}" height="${syllable_height*2 + padding_top + padding_bottom}" style="fill:rgb(200,200,255);stroke-width:1;stroke:rgb(0,0,0)" />\n`;
    //transform to account for padding
    result += `<g transform="translate(${padding_left},${padding_top})">\n`;
    
    //initial word-boundary line
    //result += `<line x1="${0}" y1="${0.5*syllable_height}" x2="${0}" y2="${1.5*syllable_height}" style="stroke:rgb(0,0,0);stroke-width:1" />\n`;
    //this was a line, but I've changed it to a semicircular arc, going counter-clockwise
    result += `<path d="M 0 ${syllable_height} A ${syllable_height/2} ${syllable_height/2} 0 0 0 0 ${syllable_height*2}" stroke="black" stroke-width="1" fill="transparent" />\n`;

    //draw top and bottom lines of box
    result += `<line x1="${0}" y1="${syllable_height}" x2="${syllable_count*syllable_width}" y2="${syllable_height}" style="stroke:rgb(0,0,0);stroke-width:1" />\n`;
    result += `<line x1="${0}" y1="${syllable_height*2}" x2="${syllable_count*syllable_width}" y2="${syllable_height*2}" style="stroke:rgb(0,0,0);stroke-width:1" />\n`;

    for (let i=0;i<syllablized_line.length;i++) {
        let syllable = syllablized_line[i];
        let syllable_display = syllable.text_display;
        //add syllable label to svg
        result += `<text x="${(i+0.5)*syllable_width}" y="${syllable_height/2}" text-anchor="middle" fill="black">${syllable_display}</text>\n`;

    
        //not a final syllable, add a hyphen
        if (!syllable.end_syllable) {        
            result += `<text x="${(i+1)*syllable_width}" y="${syllable_height/2}" text-anchor="middle" fill="black">-</text>\n`;
        } else { //draw word-boundary lines
            //result += `<text x="${(i+1)*syllable_width}" y="${0}" text-anchor="middle" fill="black"> </text>\n`;
            //the above didn't work because labels with just spaces are ignored in svg - I thought that the fix was to use a non-breaking space
            //result += `<text x="${(i+1)*syllable_width}" y="${0}" text-anchor="middle" fill="black">&#160;</text>\n`;
            //but that gets ignored in copy/paste behaviour. The final solution was:
            //result += `<text x="${(i+1)*syllable_width}" y="${0}" text-anchor="middle" fill="black">_</text>\n`;
            //but that's ugly, so I'm just giving up for now.


            //line x coordinate is (i+1)*syllable_width                
            if (i<syllable_count-1 ){
                if (i>0 && syllablized_line[i].pause_after) {
                    let line_height = (syllable.foot_end)? 0.5 : 0.5;

                    result += `<line x1="${(i+1)*syllable_width-caesura_width/2}" y1="${(0.5+0)*syllable_height}" x2="${(i+1)*syllable_width-caesura_width/2}" y2="${(1+line_height-0)*syllable_height}" style="stroke:rgb(0,0,0);stroke-width:1" />\n`;	                    
                    result += `<line x1="${(i+1)*syllable_width+caesura_width/2}" y1="${(0.5+0)*syllable_height}" x2="${(i+1)*syllable_width+caesura_width/2}" y2="${(1+line_height-0)*syllable_height}" style="stroke:rgb(0,0,0);stroke-width:1" />\n`;	                    
                } else {
                    
                    //line-height is halved if above a caesura
                    let line_height = (syllable.foot_end)? 0.0 : 0.5;
                    //also halved if above a foot boundary
                    result += `<line x1="${(i+1)*syllable_width}" y1="${0.5*syllable_height}" x2="${(i+1)*syllable_width}" y2="${(1+line_height)*syllable_height}" style="stroke:rgb(0,0,0);stroke-width:1" />\n`;
                }
            }
        } 
        
        //draw foot boundary lines -- they go under the box
        if (syllable.foot_start && i>0 ) {
            console.log("foot start");
                
            result += `<line x1="${(i)*syllable_width}" y1="${syllable_height}" x2="${(i)*syllable_width}" y2="${syllable_height*2}" style="stroke:rgb(0,0,0);stroke-width:1" />\n`;	                    
        }


        
        if (syllable.accented){
            //draw a 'v'-shape underneath
            //give the line nice end and corner caps
            //result += `<line x1="${(i+0.4)*syllable_width}" y1="${syllable_height*1.25}" x2="${(i+0.5)*syllable_width}" y2="${syllable_height*1.75}" stroke-linecap="round" style="stroke:rgb(0,0,0);stroke-width:1.5 " />\n`;
            //result += `<line x1="${(i+0.5)*syllable_width}" y1="${syllable_height*1.75}" x2="${(i+0.6)*syllable_width}" y2="${syllable_height*1.25}" stroke-linecap="round" style="stroke:rgb(0,0,0);stroke-width:1.5" />\n`;
            //draw downward-pointing filled dart instead
            result += `<path d="M ${(i+0.4)*syllable_width} ${syllable_height*1.25} L ${(i+0.5)*syllable_width} ${syllable_height*1.75} L ${(i+0.6)*syllable_width} ${syllable_height*1.25} L ${(i+0.5)*syllable_width} ${syllable_height*1.5} Z" stroke="black" stroke-width="1" fill="black" />\n`;
            
        }
        else {
            //draw small filled circle
            result += `<circle cx="${(i+0.5)*syllable_width}" cy="${syllable_height*1.5}" r="2" stroke="black" stroke-width="1" fill="black" />\n`;
        }
        
    

        // result += `<rect x="${i*syllable_width}" y="${syllable_height}" width="${syllable_width}" height="${syllable_height}" style="fill:rgb(255,255,255);stroke-width:1;stroke:rgb(0,0,0)" />\n`;
    }

    
    //result += `<line x1="${(syllable_count)*syllable_width}" y1="${syllable_height}" x2="${(syllable_count)*syllable_width}" y2="${syllable_height*2}" style="stroke:rgb(0,0,0);stroke-width:1" />\n`;
    //draw final foot ending - a semicircular arc at the end of the line
    result += `<path d="M ${syllable_count*syllable_width} ${syllable_height} A ${syllable_height/2} ${syllable_height/2} 0 0 1 ${syllable_count*syllable_width} ${syllable_height*2}" stroke="black" stroke-width="1" fill="transparent" />\n`;

    result += "</g></svg>";
    return result;
}

//generate svg files for each line
for (let i=0;i<syllablized_lines.length;i++) {
    let syllablized_line = syllablized_lines[i];
    let svg = syllablized_line_to_svg(syllablized_line);
    let filename = "svg/" + i + ".svg";
    fs.writeFileSync(filename, svg);
}

//genereate html page
let html = "<html><body>\n";
for (let i=0;i<syllablized_lines.length;i++) {
    let filename = "svg/" + i + ".svg";
    html += `<img src="${filename}" />\n`;
    html += "<p/>\n";
}
html += "</body></html>";
fs.writeFileSync("index.html", html);