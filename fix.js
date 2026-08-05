const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

// The code currently has string literals with backslash escaped backticks.
// e.g. className={\`relative overflow-hidden...
// and \${shareCardTheme === "light"
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');

fs.writeFileSync('src/app/page.tsx', code);
