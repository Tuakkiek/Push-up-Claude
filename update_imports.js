const fs = require('fs');
const path = require('path');

const filesListPath = 'files.txt';
// Detect encoding or just try utf16le which corresponds to PS default >
let filesContent = '';
try {
    filesContent = fs.readFileSync(filesListPath, 'utf16le');
} catch (e) {
    filesContent = fs.readFileSync(filesListPath, 'utf8');
}

const files = filesContent.split(/\r?\n/).filter(line => line.trim().length > 0 && line.includes('backend')).map(f => f.trim());

// Map: basename -> fullPath
const fileMap = {};
files.forEach(f => {
    // Basic normalization
    const normalized = f.replace(/\\/g, '/');
    const base = path.basename(normalized);
    
    // Safety check for duplicates
    if (fileMap[base]) {
        console.warn('WARN: Duplicate basename found:', base);
    } else {
        fileMap[base] = normalized;
    }
});

// Helper to resolve new path
function getNewRelativePath(fromFile, importPath) {
    const fromDir = path.dirname(fromFile).replace(/\\/g, '/');
    
    // Extract basename from import
    let importName = path.basename(importPath);
    // Remove query params or anchors if any (unlikely in requires)
    
    // Try to find the file in our map
    // If import is `../models/User.js`, look for `User.js`
    // If `../models/User`, look for `User.js` or `User/index.js`
    
    let targetFile = fileMap[importName];
    if (!targetFile && !importName.endsWith('.js')) {
        targetFile = fileMap[importName + '.js'];
    }
    
    if (targetFile) {
        let rel = path.relative(fromDir, targetFile).replace(/\\/g, '/');
        if (!rel.startsWith('.')) rel = './' + rel;
        return rel;
    }
    
    // Handle specific shared patterns if not found in map (e.g. they weren't moved, but we are deeper now)
    // Old: ../config/db.js  (Depth=2 from src)
    // New: modules/identity/controllers/authController.js (Depth=4 from src)
    // We need to go up 2 more levels.
    
    if (importPath.includes('config/')) {
        // Find where config is.
        // If config is at `backend/src/config`, and we are at `backend/src/modules/identity/controllers`
        // We need `../../../config`.
        const configPath = files.find(f => f.includes('src/config') || f.includes('src\\config'));
        if (configPath && importPath.includes(path.basename(configPath))) {
             // Logic is getting complex.
             // Simpler: Just rely on filename matching for config files too.
        }
    }
    
    return null;
}

files.forEach(filePath => {
    if (!filePath.endsWith('.js') || filePath.includes('node_modules')) return;
    
    let content = fs.readFileSync(filePath, 'utf8'); // Source files are likely utf8
    let originalContent = content;
    
    // Regex for imports
    const regex = /(from\s+['"])([\.\/][^'"]+)(['"])|(require\(['"])([\.\/][^'"]+)(['"])/g;
    
    content = content.replace(regex, (match, p1, p2, p3, p4, p5, p6) => {
        const prefix = p1 || p4;
        const oldPath = p2 || p5;
        const suffix = p3 || p6;
        
        // Skip node_modules or absolute paths
        if (!oldPath.startsWith('.')) return match;
        
        const newPath = getNewRelativePath(filePath, oldPath);
        
        if (newPath) {
            console.log(`Fixing ${path.basename(filePath)}: ${oldPath} -> ${newPath}`);
            return `${prefix}${newPath}${suffix}`;
        } else {
             console.log(`Could not resolve: ${oldPath} in ${path.basename(filePath)}`);
             return match;
        }
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
});
