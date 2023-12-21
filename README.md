![image](https://github.com/increpare/Latin-Hexameter-Renderer/assets/465632/20e4075c-505d-4754-adf6-411b29bd2ed7)

Generates images like the above from markup like this:

```452
Prī-mu(s a)mor Phoe-bī // Daph-nē Pē-nē-i-a, // quem nōn >
for(s ig)nā-ra de-dit, // sed sae-va Cu-pī-di-ni(s ī)ra; 
Dē-li-u(s hunc) nū-per, // vic-tō ser-pen-te su-per-bus, >
vī-de-ra(t // ad)duc-tō flec-ten-tem cor-nu-a ner-vō; 
"Quid"-que "ti-bī, // las-cī-ve pu-er, // cum for-ti-bu(s ar)mīs?" >
dīx-e-ra(t; // "Is)ta de-cent u-me-rōs ges-tā-mi-na nos-trōs,
```

I was thinking about how I'd prefer to indicate metrical and accent information (it also hints that when there are run-on lines, either with a '>' explicitly, or if you end a line with no punctuation).

line_syllabification.html is some kind of broken/janky code to insert hyphens between syllables, but it doesn't work great (nonetheless it's an okay start)...it uses https://github.com/bramstein/hypher and the Latin data file for it from https://github.com/bramstein/hyphenation-patterns
