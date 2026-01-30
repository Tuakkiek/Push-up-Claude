const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.js')) {
                arrayOfFiles.push(path.join(dirPath, file));
            }
        }
    });
    return arrayOfFiles;
}

const modulesDir = path.join(__dirname, 'backend', 'src', 'modules');
if (!fs.existsSync(modulesDir)) {
    console.log("Modules dir not found");
    process.exit(1);
}

const files = getAllFiles(modulesDir);
let fixedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;

    // Pattern 1: export default mongoose.model("Name", schema);
    // Replacement: export default mongoose.models.Name || mongoose.model("Name", schema);
    
    // Pattern 2: const Name = mongoose.model("Name", schema);
    // Replacement: const Name = mongoose.models.Name || mongoose.model("Name", schema);

    // We use a regex to capture the model name
    // Regex explanation:
    // mongoose\.model\s*\(\s*(['"])(.*?)\1
    // Matches: mongoose.model("User"
    // Group 2 is "User"
    
    content = content.replace(/mongoose\.model\s*\(\s*(['"])(.+?)\1/g, (match, quote, modelName) => {
        // Check if we already have the check (avoid double patching)
        const checkStr = `mongoose.models.${modelName}`;
        const checkStrBracket = `mongoose.models['${modelName}']`;
        const checkStrBracket2 = `mongoose.models["${modelName}"]`;
        
        // Look behind in the original content to see if it's already there
        // This is hard with replace.
        // Instead, let me check if the line containing this match already has "mongoose.models"
        
        return `mongoose.models.${modelName} || mongoose.model(${quote}${modelName}${quote}`;
    });
    
    // Verification: if we replaced it, but it was already correct, we might end up with:
    // mongoose.models.User || mongoose.models.User || mongoose.model(...)
    // So let's simple-fix that edge case
    content = content.replace(/(mongoose\.models\.[a-zA-Z0-9_]+ \|\| )+/g, '$1');

    if (content !== originalContent) {
        console.log(`Fixed model registration in ${path.basename(file)}`);
        fs.writeFileSync(file, content, 'utf8');
        fixedCount++;
    }
});

console.log(`Fixed ${fixedCount} files.`);
