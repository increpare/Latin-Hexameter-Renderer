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

// I distinguish text_display from text_internal for the case where
// coda vowels get brought to the next word, and also for punctuation.

const vowels = 'aeiouy';
const vowels_long = 'āēīōūȳ';
const diphthongs = ['ae', 'au', 'ei', 'eu', 'oe', 'ui', 'yi'];
const consonants = ['c', 'k', 'ch', 'g', 'gn', 'i', 'j', 'l', 'p', 'ph', 'qu', 'quu', 'r', 'rh', 's', 't', 'th', 'v', 'vu', 'x', 'z', 'b', 'd', 'f', 'h', 'm', 'n', 'q'];
const letters = vowels.split('').concat(vowels_long.split('')).concat(consonants);
const punctuation = ['.', ',', ';', ':', '?', '!', '“', '”', '‘', '’', '"', '\'','—'];
const syllable_breaks = [' ', '-'];

//parse a string, splitting into words, but have array entries for punctuation/whitespace
function parse_line(line) {
    let result = []; //tokens can be words or punctuation/whitespace sections
    let current_token = "";
    let mode = "unknown"; //can be unknown, word, or punctuation
    for (let i = 0; i < line.length; i++) {
        let c = line[i];
        if (letters.includes(c)) {
            if (mode === "unknown") {
                mode = "word";
            }
            current_token += c;
        } else if (punctuation.includes(c)) {
            if (mode === "unknown") {
                mode = "punctuation";
            }
            if (mode === "word") {
                result.push(current_token);
                current_token = "";
                mode = "punctuation";
            }
            current_token += c;
            result.push(current_token);
            current_token = "";
        } else if (syllable_breaks.includes(c)) {
            if (mode === "unknown") {
                mode = "whitespace";
            }
            if (mode === "word") {
                result.push(current_token);
                current_token = "";
                mode = "whitespace";
            }
            current_token += c;
            result.push(current_token);
            current_token = "";
        } else {
            console.log(`ERROR: unrecognized character ${c} in line ${line}`);
        }
    }
}

function syllable_long(syllable) {
    //if it contains a long vowel, it's long
    for (let i = 0; i < syllable.length; i++) {
        if (vowels_long.includes(syllable[i])) {
            return true;
        }
    }

    //if it starts with qu, remove the qu - bit of a cheat but chopping off initial consonants doesn't affect length ^^
    if (syllable.startsWith('qu')) {
        syllable = syllable.slice(2);
    }

    //if it contains a diphthong as a substring, it's long
    for (let i = 0; i < diphthongs.length; i++) {
        let diphthong = diphthongs[i];
        if (syllable.includes(diphthong)) {
            return true;
        }
    }

    //following two bits are inelegant
    //count how many 'i's it has
    let i_count = 0;
    for (let i = 0; i < syllable.length; i++) {
        if (syllable[i] === 'i') {
            i_count++;
        }
    }
    //if it ends with an 'i', and that 'i' is not the first vowel, it's long
    if (syllable[syllable.length - 1] === 'i' && i_count === 1) {
        return false;
    }

    //if it ends with a consonant, it's long
    if (consonants.includes(syllable[syllable.length - 1])) {
        return true;
    }

    return false;
}

function first_part_has_vowel(syllable) {
    for (let i = 0; i < syllable.length; i++) {
        var c = syllable[i];
        if (vowels.includes(c)) {
            return true;
        }
        if (c === " ") {
            return false;
        }
    }
    return false;
}

function second_part_has_vowel(syllable) {
    var found_space = false;
    for (let i = 0; i < syllable.length; i++) {
        var c = syllable[i];
        if (found_space) {
            if (vowels.includes(c)) {
                return true;
            }
        }
        if (c === " ") {
            found_space = true;
        }
    }
    return false;
}

function first_part_grab(syllable) {
    var result = "";
    for (let i = 0; i < syllable.length; i++) {
        var c = syllable[i];

        if (c === " ") {
            return result;
        } else {
            result += c;
        }
    }
    return result;
}

function second_part_grab(syllable) {
    var result = "";
    var found_space = false;
    for (let i = 0; i < syllable.length; i++) {
        var c = syllable[i];
        if (found_space) {
            result += c;
        }
        if (c === " ") {
            found_space = true;
        }
    }
    return result;
}

function strip_whitespace_and_punctuation_and_parens(syllable){
    var result = "";
    for (let i = 0; i < syllable.length; i++) {
        var c = syllable[i];
        if (!punctuation.includes(c) && c !== " " && c !== "(" && c !== ")"){
            result += c;
        }
    }
    return result;
}

// Syllablize a line of text into an array of syllables.
// returns open-ness
function syllablize(line) {
    if (line[line.length - 1] !== ' ') {
        line += ' ';
    }
    //we work character-by-character, being careful to handle parentheses - parentheses are
    //a special notation to indicate that their contents are to be treated as a single 
    //syllable (elision).
    let syllables = [];
    let current_syllable_display = "";
    let current_syllable_internal = "";
    let in_parentheses = false;
    let parenthetical_internal = "";
    let parenthetical_internal_verbatim = "";
    let last_break = ' ';
    let running_word_index = 0;
    let running_syllable_index = 0;
    let accent_current_syllable = false;
    let runon_syllable = false;
    for (let i = 0; i < line.length; i++) {
        let c = line[i];
        var c_caseless = c.toLowerCase();
        if (in_parentheses) {
            parenthetical_internal_verbatim += c;
        }

        if (c === '^') { // word-accent
            accent_current_syllable = true;
        } if (c === '/') { // principle caesura
            //add caesura to previous syllable
            syllables[syllables.length - 1].pause_after = true;
            i += 2;
        } if (c=== '>') { //open-end to line, and start of next line should open also
            runon_syllable = true;
            // if not at end of line, print error
            if (i<line.length-2){
                console.log("ERROR: open-end > to line not at end of line");
            }
        } else if (letters.includes(c_caseless)) {
            current_syllable_display += c;
            if (in_parentheses) {
                parenthetical_internal += c_caseless;
            } else {
                current_syllable_internal += c_caseless;
            }
        } else if (punctuation.includes(c)) {
            current_syllable_display += c;
        } else if (c === '(') {
            in_parentheses = true;
            current_syllable_display += '(';
        } else if (c === ')') {
            in_parentheses = false;

            //mark previous syllable as elided if current_syllable_internal has a vowel
            if (first_part_has_vowel(parenthetical_internal_verbatim)) {
                // console.log(syllables.length);
                syllables[syllables.length - 1].final_syllable_elided = true;
                syllables[syllables.length - 1].final_syllable = first_part_grab(parenthetical_internal_verbatim);
            }

            // if both parts have vowels, can strip vowels from the internal representation of the first part
            if (first_part_has_vowel(parenthetical_internal_verbatim) && second_part_has_vowel(parenthetical_internal_verbatim)) {
                let first_part = first_part_grab(parenthetical_internal_verbatim);
                let second_part = second_part_grab(parenthetical_internal_verbatim);

                //strip vowels from first part
                var first_part_stripped = "";
                for (let i = 0; i < first_part.length; i++) {
                    let c = first_part[i];
                    if (!vowels.includes(c)) {
                        first_part_stripped += c;
                    }
                }
                parenthetical_internal = strip_whitespace_and_punctuation_and_parens(first_part_stripped) + strip_whitespace_and_punctuation_and_parens(second_part);

            }
            

            current_syllable_display += ')';
            current_syllable_internal += parenthetical_internal;
            parenthetical_internal = "";
            parenthetical_internal_verbatim = "";
        }

        if (syllable_breaks.includes(c) || c === ')') {
            //if syllable nonempty, add it to the list of syllables
            // console.log(`length of ${current_syllable_internal} is ${syllable_long(current_syllable_internal)}`);
            if (current_syllable_display.length > 0) {
                if (current_syllable_internal.length === 0) {
                    //append display to previous syllable
                    syllables[syllables.length - 1].text_display += current_syllable_display;
                } else {
                    syllables.push({
                        text_display: current_syllable_display,
                        text_internal: current_syllable_internal,
                        syllable_long: syllable_long(current_syllable_internal),
                        accented: accent_current_syllable,
                        word_index: running_word_index,
                        syllable_index: running_syllable_index,
                        start_syllable: last_break === ' ',
                        end_syllable: c === ' ' || letters.includes(line[i + 1]) === false,
                        final_syllable_elided: false,
                        final_syllable: //only meaningful if end_syllable is true:
                            (c === ' ' || letters.includes(line[i + 1]) === false)
                                ? current_syllable_internal : "",
                        pause_after: false,
                        foot_start: false,
                        foot_end: false,
                        foot_position: -1,
                        foot_index: -1,
                        foot_type: "", //D,S,T   
                        runon_syllable: false,       
                    });
                }
                accent_current_syllable = false;
                current_syllable_display = "";
                current_syllable_internal = "";
                last_break = c;

            }
            if (c === ' ') {
                running_word_index++;
                running_syllable_index = 0;
            } else {
                if (!in_parentheses) {
                    running_syllable_index++;
                }
            }
        }
    }

    let word_already_accented = false;
    for (var i = 0; i < syllables.length; i++) {
        var syllable = syllables[i];
        if (syllable.accented) {
            word_already_accented = true;
        }

        //decide on accentuation when you reach the last syllable
        if (syllable.end_syllable === false) {
            continue;
        }

        var final_syllable_offset = syllable.final_syllable_elided ? 1 : 0;

        var syllable_count = 1 + syllable.syllable_index + final_syllable_offset;

        if (word_already_accented) {
            word_already_accented = false;
            continue;
        }

        //if this is a one-syllable word, accent it
        if (syllable.start_syllable) {
            syllable.accented = true;
        }

        //if this is a two-syllable word, accent the first syllable
        else if (syllable_count === 2) {
            syllables[final_syllable_offset + i - 1].accented = true;
        }

        //if it ends with an enclytic, the penultimate syllable is stressed
        else if (syllable.final_syllable === 'que') {
            // I'm leaving out -ne and -ve because they could just be part of a word
            syllables[final_syllable_offset + i - 1].accented = true;
        }

        // 	In a word of three or more syllables, the accent falls on the next to last syllable (sometimes called the "penult"), if that syllable is long.
        else if (syllable_count > 2 && syllables[final_syllable_offset + i - 1].syllable_long === true) {
            syllables[final_syllable_offset + i - 1].accented = true;
        }
        // Otherwise, the accent falls on the syllable before that (the "antepenult").
        else {
            // console.log(line);
            syllables[final_syllable_offset + i - 2].accented = true;
        }

    }

    //now we have the syllables, we can add the foot information
    //feet are either long-short-short (dactyl), long-long (spondee)
    let foot_syllable_index = 0;
    let running_foot_index = -1;
    for (let i = 0; i < syllables.length; i++) {
        let syllable = syllables[i];
        syllable.foot_position = foot_syllable_index;

        if (foot_syllable_index === 0) {
            running_foot_index++;
            syllable.foot_start = true;
            //set foot end of previous
            if (i > 0) {
                syllables[i - 1].foot_end = true;
            }
            if (syllable.syllable_long) {
                //good, no problem
                // console.log(`first syllable long: ${syllable.text_display} (${syllable.text_internal})`);
            } else {
                //if first syllable is short, display an informative error message
                console.log(`line: ${line}`);
                console.log(`ERROR: foot starts with short syllable "${syllable.text_display}" (internal: "${syllable.text_internal}")`);
                break;
            }
        } else if (foot_syllable_index === 1) {
            // console.log(`second syllable: ${syllable.text_display} (${syllable.text_internal}) length: ${syllable.syllable_long}`);
            if (syllable.syllable_long) {
                //great! spondee. set this and the previous syllable to be of that type
                syllables[i - 1].foot_type = "S";
                syllable.foot_type = "S";
                foot_syllable_index = -1;
            } else {//syllable short
                //if this is the final syllable, it's not a dactyl but trochee, which is okay
                if (i === syllables.length - 1) {
                    syllables[i - 1].foot_type = "T";
                    syllable.foot_type = "T";
                    foot_syllable_index = -1;
                }
                //otherwise, if the next syllable is long, print an error
                else if (syllables[i + 1].syllable_long) {
                    console.log(`line: ${line}`);
                    console.log(`ERROR: foot starts with short syllable: "${syllable.text_display}" (internal "${syllable.text_internal}")`);
                    break;
                } else {
                    //otherwise, it's a dactyl
                    syllables[i - 1].foot_type = "D";
                    syllable.foot_type = "D";
                    syllables[i + 1].foot_type = "D";
                    i++;
                    foot_syllable_index = -1;
                }
            }
        } else {
            //error
            console.log(`line: ${line}`);
            console.log(`ERROR: foot detection screwed up "${syllable.text_display}" (internal: "${syllable.text_internal})"`);
            break;
        }

        syllable.foot_index = running_foot_index;

        foot_syllable_index++;

    }

    //if less than 6 feet,error
    if (running_foot_index < 5) {
        console.log(`line: ${line}`);
        console.log(`ERROR: line has less than 6 feet`);
    } else if (running_foot_index > 5) {
        console.log(`line: ${line}`);
        console.log(`ERROR: line has more than 5 feet`);
    }
    //set foot end of final syllable
    syllables[syllables.length - 1].foot_end = true;

    syllables[syllables.length - 1].foot_index = running_foot_index;

    if (runon_syllable){
        syllables[syllables.length - 1].runon_syllable = true;
    }

    return syllables;
}



// Load input.txt and read lines into array
const inputFilePath = 'input.txt';
const lines = fs.readFileSync(inputFilePath, 'utf-8').split('\n');

//pop off the first line and parse it as the starting line number
let starting_line_number = parseInt(lines.shift());

var syllablized_lines = [];
// Syllablize each line
for (let i = 0; i < lines.length; i++) {
    var line = lines[i];
    line = line.trim();
    //if line doesn't end with punctuation or >
    if (!punctuation.includes(line[line.length - 1]) && line[line.length - 1] !== ">") {
        //add " >"
        line += " >";
    }
    var syllablized_line = syllablize(line);    

    if (i>0){
        var prev_line = syllablized_lines[i-1];
        //if previous line ended with open syllable, make first syllable of this line open
        if (prev_line[prev_line.length-1].runon_syllable){
            syllablized_line[0].runon_syllable = true;
        }
    }
    // console.log(line);
    // console.log(syllablized_line);
    syllablized_lines.push(syllablized_line);
}

function GetTestResults(line){
    var syllablized_line = syllablize(line);
    //extract string of feet type
    var feet = "";
    var stresses = "";
    for(let i=0;i<syllablized_line.length;i++){
        var syllable = syllablized_line[i];
        if (syllable.foot_end){
            feet += syllable.foot_type;
        }
        stresses += (syllable.accented ? "V" : "o");
    }
    var data = [line,feet,stresses];
    return JSON.stringify(data);
}

// console.log("running tests");
//load tests.txt
const testsFilePath = 'tests.txt';
const tests = fs.readFileSync(testsFilePath, 'utf-8').split('\n');
var error_count = 0;
for (let i = 0; i < tests.length; i++) {
    
    try {
        var [test_line,test_feet,test_stresses] = JSON.parse(tests[i]);
        var [calculated_line, calculated_feet, calculated_stresses ]  = JSON.parse(GetTestResults(test_line));
    } catch (error) {
        console.log(`TEST ERROR: An error was thrown while processing test ${i}:\n  ${test_line}`);
        console.log(`${error}`);
        error_count++;
    }

    var found_error=false;
    if (test_feet !== calculated_feet){
        console.log(`TEST ERROR: feet mismatch in test ${i}:\n  ${test_line}`);
        console.log(`expected:   ${test_feet}`);
        console.log(`calculated: ${calculated_feet}`);
        found_error=true;
    }
    if (test_stresses !== calculated_stresses){
        console.log(`TEST ERROR: stresses mismatch in test ${i}:\n  ${test_line}`);
        console.log(`expected:   ${test_stresses}`);
        console.log(`calculated: ${calculated_stresses}`);
        found_error=true;
    }

    if (found_error){
        error_count++;
    }
}
// console.log(`TESTS COMPLETE: ${tests.length-error_count}/${tests.length} passed`);

// console.log("generating test data");
// for (let i = 0; i < lines.length; i++) {
//     var line = lines[i];
//     console.log(GetTestResults(line));
// }

//now we have the data, we can start generating the svg files
const svg_folder = 'svg';
if (!fs.existsSync(svg_folder)) {
    fs.mkdirSync(svg_folder);
}

function syllablized_line_to_svg(syllablized_line) {
    let syllable_count = syllablized_line.length;

    // console.log("syllable count", syllable_count);
    const foot_width = 150;
    const syllable_width_dactyl = foot_width / 3;
    const syllable_width_spondee = foot_width / 2;

    const syllable_height = 20;


    const padding_top = 10;
    const padding_bottom = 10;
    const padding_left = 20;
    const padding_right = 20;

    const caesura_width = 4;

    let line_width = padding_left + 6 * foot_width + padding_right;



    let result = `<svg width=\"${line_width}\" height=\"${syllable_height * 2 + padding_top + padding_bottom}\"  viewBox=\"0 0 ${line_width} ${syllable_height * 2 + padding_top + padding_bottom}\" xmlns=\"http://www.w3.org/2000/svg\">\n`;
    //background blue
    // result += `<rect x="${0}" y="${0}" width="${line_width}" height="${syllable_height*2 + padding_top + padding_bottom}" style="fill:rgb(200,200,255);stroke-width:1;stroke:rgb(0,0,0)" />\n`;
    //transform to account for padding
    result += `<g transform="translate(${padding_left},${padding_top})">\n`;

    //if opening syllable isn't runon, draw a line
    if (!syllablized_line[0].runon_syllable){
        //initial word-boundary line
        //result += `<line x1="${0}" y1="${0.5*syllable_height}" x2="${0}" y2="${1.5*syllable_height}" style="stroke:rgb(0,0,0);stroke-width:1" />\n`;
        //this was a line, but I've changed it to a semicircular arc, going counter-clockwise
        result += `<path d="M 0 ${syllable_height} A ${syllable_height / 2} ${syllable_height / 2} 0 0 0 0 ${syllable_height * 2}" stroke="black" stroke-width="1" fill="transparent" />\n`;
    }
    //draw top and bottom lines of box
    result += `<line x1="${0}" y1="${syllable_height}" x2="${6 * foot_width}" y2="${syllable_height}" style="stroke:rgb(0,0,0);stroke-width:1" />\n`;
    result += `<line x1="${0}" y1="${syllable_height * 2}" x2="${6 * foot_width}" y2="${syllable_height * 2}" style="stroke:rgb(0,0,0);stroke-width:1" />\n`;

    let left_position = 0;


    for (let i = 0; i < syllablized_line.length; i++) {
        let syllable = syllablized_line[i];
        let syllable_display = syllable.text_display;


        var syllable_width = syllable.foot_type === "D" ? syllable_width_dactyl : syllable_width_spondee;
        if (syllable.foot_type === "D") {
            if (syllable.foot_position === 0) {
                syllable_width = foot_width / 3;
            } else {
                syllable_width = foot_width / 3;
            }
        }
        let right_position = left_position + syllable_width;
        let center_position = left_position + syllable_width / 2;
        //add syllable label to svg
        result += `<text x="${center_position}" y="${syllable_height / 2}" text-anchor="middle" fill="black">${syllable_display}</text>\n`;


        //not a final syllable, add a hyphen
        if (!syllable.end_syllable) {
            result += `<text x="${left_position + (1) * syllable_width}" y="${syllable_height / 2}" text-anchor="middle" fill="black">-</text>\n`;
        } else { //draw word-boundary lines

            //line x coordinate is (i+1)*syllable_width                
            if (i < syllable_count - 1) {
                if (syllablized_line[i].pause_after) {
                    let line_height = (syllable.foot_end) ? 0.5 : 0.5;

                    result += `<line x1="${left_position + (1) * syllable_width - caesura_width / 2}" y1="${(0.5 + 0) * syllable_height}" x2="${left_position + (1) * syllable_width - caesura_width / 2}" y2="${(1 + line_height - 0) * syllable_height}" style="stroke:rgb(0,0,0);stroke-width:1" />\n`;
                    result += `<line x1="${left_position + (1) * syllable_width + caesura_width / 2}" y1="${(0.5 + 0) * syllable_height}" x2="${left_position + (1) * syllable_width + caesura_width / 2}" y2="${(1 + line_height - 0) * syllable_height}" style="stroke:rgb(0,0,0);stroke-width:1" />\n`;
                } else {

                    //line-height is halved if above a caesura
                    let line_height = (syllable.foot_end) ? 0.0 : 0.5;
                    //also halved if above a foot boundary
                    result += `<line x1="${left_position + (1) * syllable_width}" y1="${0.5 * syllable_height}" x2="${left_position + (1) * syllable_width}" y2="${(1 + line_height) * syllable_height}" style="stroke:rgb(0,0,0);stroke-width:1" />\n`;
                }
            } 
        }

        //draw foot boundary lines -- they go under the box
        if (syllable.foot_start && i > 0) {
            // console.log("foot start");

            result += `<line x1="${left_position + (0) * syllable_width}" y1="${syllable_height}" x2="${left_position + (0) * syllable_width}" y2="${syllable_height * 2}" style="stroke:rgb(0,0,0);stroke-width:1" />\n`;
        }



        if (syllable.accented) {
            //draw a 'v'-shape underneath
            //give the line nice end and corner caps
            //result += `<line x1="${(i+0.4)*syllable_width}" y1="${syllable_height*1.25}" x2="${(i+0.5)*syllable_width}" y2="${syllable_height*1.75}" stroke-linecap="round" style="stroke:rgb(0,0,0);stroke-width:1.5 " />\n`;
            //result += `<line x1="${(i+0.5)*syllable_width}" y1="${syllable_height*1.75}" x2="${(i+0.6)*syllable_width}" y2="${syllable_height*1.25}" stroke-linecap="round" style="stroke:rgb(0,0,0);stroke-width:1.5" />\n`;
            //draw downward-pointing filled dart instead

            var dart_width = foot_width / 24;
            result += `<path d="M ${center_position - dart_width} ${syllable_height * 1.25} L ${center_position} ${syllable_height * 1.75} L ${center_position + dart_width} ${syllable_height * 1.25} L ${center_position} ${syllable_height * 1.5} Z" stroke="black" stroke-width="1" fill="black" />\n`;

        }
        else {
            //draw small filled circle
            result += `<circle cx="${center_position}" cy="${syllable_height * 1.5}" r="2" stroke="black" stroke-width="1" fill="black" />\n`;
        }



        // result += `<rect x="${i*syllable_width}" y="${syllable_height}" width="${syllable_width}" height="${syllable_height}" style="fill:rgb(255,255,255);stroke-width:1;stroke:rgb(0,0,0)" />\n`;

        left_position = right_position;
    }


    //if final syllable isn't runon, draw a line
    if (!syllablized_line[syllable_count - 1].runon_syllable){
        //result += `<line x1="${(syllable_count)*syllable_width}" y1="${syllable_height}" x2="${(syllable_count)*syllable_width}" y2="${syllable_height*2}" style="stroke:rgb(0,0,0);stroke-width:1" />\n`;
        //draw final foot ending - a semicircular arc at the end of the line
        result += `<path d="M ${6 * foot_width} ${syllable_height} A ${syllable_height / 2} ${syllable_height / 2} 0 0 1 ${6 * foot_width} ${syllable_height * 2}" stroke="black" stroke-width="1" fill="transparent" />\n`;
    }

    result += "</g></svg>";
    return result;
}

//generate svg files for each line
for (let i = 0; i < syllablized_lines.length; i++) {
    let syllablized_line = syllablized_lines[i];
    let svg = syllablized_line_to_svg(syllablized_line);
    let filename = `svg/${i}.svg`;
    fs.writeFileSync(filename, svg);
}

//genereate html page
let html = `<html lang="en"><head><meta charset="utf-8">
<style>
img { vertical-align:top; }
.line {
    color: #888;
    font-size: 70%;
}
body {
    font-family: 'Noto Serif';
    font-size: 20px;
}
</style>
</head><body>\n`;
for (let i = 0; i < syllablized_lines.length; i++) {
    var line_number = starting_line_number + i;
    var line = lines[i];

    let filename = `svg/${i}.svg`;
    //escape line to make it safe for javascript inclusion
    line = line.replace(/"/g, '\\"');
    line = line.replace(/'/g, "\\'");
    line = line.replace(/</g, '&lt;');
    line = line.replace(/>/g, '&gt;');
    

    html += `<span class="line">${line_number}:</span> <img alt="${line}" src="${filename}"  />\n`;
    html += "<br/>\n";
}
html += "</body></html>";
fs.writeFileSync("index.html", html);


console.log("generated index.html + svgs")