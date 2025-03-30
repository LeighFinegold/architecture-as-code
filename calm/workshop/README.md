calm generate --pattern ./conference-signup.pattern.json --output ./conference-signup.arch.json

Current Issues
You can't generate a pattern with controls without using the all option, but then you get placeholders for 
stuff you don't need and that breaks docify.


calm docify --input ./conference-signup.arch.json --output ./doc-website

Bugs
Since no flows. The sidebar breaks.