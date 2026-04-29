const fs = require('fs');

const b64 = fs.readFileSync('NotoSans-Regular.ttf').toString('base64');
fs.writeFileSync('src/utils/notoSansRegular.js', 'export const notoSansRegular = "' + b64 + '";');

const b64b = fs.readFileSync('NotoSans-Bold.ttf').toString('base64');
fs.writeFileSync('src/utils/notoSansBold.js', 'export const notoSansBold = "' + b64b + '";');

console.log('Done! Files created in src/utils/');