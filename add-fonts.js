const fs = require('fs');
const path = require('path');

// Font mapping based on fontWeight
const fontMap = {
  'bold': 'Prompt_700Bold',
  '700': 'Prompt_700Bold',
  '600': 'Prompt_600SemiBold',
  '500': 'Prompt_500Medium',
  '400': 'Prompt_400Regular',
  'normal': 'Prompt_400Regular',
};

function addFontToStyles(content) {
  // Pattern to match style objects with fontSize but no fontFamily
  const stylePattern = /(\w+):\s*\{([^}]*fontSize:\s*\d+[^}]*)\}/g;
  
  let modified = content;
  let match;
  
  while ((match = stylePattern.exec(content)) !== null) {
    const styleName = match[1];
    const styleContent = match[2];
    
    // Skip if already has fontFamily
    if (styleContent.includes('fontFamily')) {
      continue;
    }
    
    // Determine font based on fontWeight
    let font = 'Prompt_400Regular';
    
    if (styleContent.includes("fontWeight: 'bold'") || styleContent.includes('fontWeight: "bold"')) {
      font = 'Prompt_700Bold';
    } else if (styleContent.includes("fontWeight: '700'") || styleContent.includes('fontWeight: "700"')) {
      font = 'Prompt_700Bold';
    } else if (styleContent.includes("fontWeight: '600'") || styleContent.includes('fontWeight: "600"')) {
      font = 'Prompt_600SemiBold';
    } else if (styleContent.includes("fontWeight: '500'") || styleContent.includes('fontWeight: "500"')) {
      font = 'Prompt_500Medium';
    }
    
    // Add fontFamily as first property
    const newStyleContent = styleContent.replace(/^(\s*)/, `$1fontFamily: '${font}',\n$1`);
    const newStyle = `${styleName}: {${newStyleContent}}`;
    
    modified = modified.replace(match[0], newStyle);
  }
  
  return modified;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Only process files with StyleSheet.create
    if (!content.includes('StyleSheet.create')) {
      return false;
    }
    
    const modified = addFontToStyles(content);
    
    if (modified !== content) {
      fs.writeFileSync(filePath, modified, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other non-source directories
      if (!['node_modules', '.git', 'android', 'ios', '.expo'].includes(file)) {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Main execution
const srcDir = path.join(__dirname, 'src');
const files = walkDir(srcDir);

console.log(`Found ${files.length} TypeScript files`);
console.log('Adding Prompt font to all text styles...\n');

let updatedCount = 0;
files.forEach(file => {
  if (processFile(file)) {
    updatedCount++;
  }
});

console.log(`\n✅ Done! Updated ${updatedCount} files`);
console.log('Please restart Metro bundler: npx expo start -c');
