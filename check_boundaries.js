const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, 'backend', 'src', 'modules');
const modules = fs.existsSync(modulesDir) ? fs.readdirSync(modulesDir) : [];

if (modules.length === 0) {
    console.log("No modules found.");
    process.exit(1);
}

console.log(`Checking ${modules.length} modules for cross-boundary violations...`);

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

const violations = [];

modules.forEach(moduleName => {
    const modulePath = path.join(modulesDir, moduleName);
    if (!fs.statSync(modulePath).isDirectory()) return;

    const files = getAllFiles(modulePath);

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split(/\r?\n/);
        
        lines.forEach((line, index) => {
            // Check for import/require from other modules internal paths
            // Regex to catch: from '../../otherModule/models/...' or require('../../otherModule/models/...')
            // We assume modules are siblings.
            
            // Matches: key terms like "modules/X/models", "modules/X/controllers"
            // But we must allow "modules/X" (the facade)
            
            // Simple heuristic violation rule:
            // If import path contains "modules/" AND it contains "/models/" or "/controllers/" or "/services/"
            // AND the module name in the path is NOT the current module name.
            
            const importRegex = /(?:from|require\s*\()\s*['"](.+?)['"]/g;
            let match;
            while ((match = importRegex.exec(line)) !== null) {
                const importPath = match[1];
                
                // Parse the import path to see if it targets another module's internals
                if (importPath.includes('modules/')) {
                    const parts = importPath.split('modules/');
                    if (parts.length > 1) {
                         const afterModules = parts[1]; // e.g., "identity/models/User.js"
                         const targetModule = afterModules.split('/')[0];
                         
                         if (targetModule && targetModule !== moduleName) {
                             // It is importing another module. Check if it accesses internals.
                             const remainder = afterModules.substring(targetModule.length);
                             // If remainder has more than just "", e.g. "/models/..."
                             // We allow optional "/index.js" or just "/"
                             
                             if ((remainder.includes('/models/') || remainder.includes('/controllers/') || remainder.includes('/services/')) && !remainder.includes('index.js')) {
                                 violations.push({
                                     file: path.relative(path.join(__dirname, 'backend'), file),
                                     line: index + 1,
                                     importPath: importPath,
                                     reason: `Direct access to ${targetModule} internals`
                                 });
                             }
                         }
                    }
                }
            }
        });
    });
});

if (violations.length > 0) {
    console.log(`Found ${violations.length} violations:`);
    violations.forEach(v => {
        console.log(`[${v.file}:${v.line}] Import: ${v.importPath} -> ${v.reason}`);
    });
} else {
    console.log("No cross-module boundary violations found!");
}
