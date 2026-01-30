const fs = require('fs');
const path = require('path');

const filesToDelete = [
  'backend/src/modules/catalog/controllers/accessoryController.js',
  'backend/src/modules/catalog/controllers/airPodsController.js',
  'backend/src/modules/catalog/controllers/appleWatchController.js',
  'backend/src/modules/catalog/controllers/iPadController.js',
  'backend/src/modules/catalog/controllers/iPhoneController.js',
  'backend/src/modules/catalog/controllers/macController.js',
  'backend/src/modules/catalog/models/Accessory.js',
  'backend/src/modules/catalog/models/AirPods.js',
  'backend/src/modules/catalog/models/AppleWatch.js',
  'backend/src/modules/catalog/models/BaseProduct.js',
  'backend/src/modules/catalog/models/IPad.js',
  'backend/src/modules/catalog/models/IPhone.js',
  'backend/src/modules/catalog/models/Mac.js',
  'backend/src/modules/catalog/routes/accessoryRoutes.js',
  'backend/src/modules/catalog/routes/airPodsRoutes.js',
  'backend/src/modules/catalog/routes/appleWatchRoutes.js',
  'backend/src/modules/catalog/routes/iPadRoutes.js',
  'backend/src/modules/catalog/routes/iPhoneRoutes.js',
  'backend/src/modules/catalog/routes/macRoutes.js',
  'backend/src/modules/catalog/routes/productRoutes.js'
];

const projectRoot = 'c:/Project_1/v19-refactor-Modular_Monolith/SmartMobileStore';

filesToDelete.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log(`Deleted: ${file}`);
    } catch (err) {
      console.error(`Error deleting ${file}: ${err.message}`);
    }
  } else {
    console.log(`File not found (already deleted?): ${file}`);
  }
});
