const path = require('path');

module.exports = function(source, map, meta) {
  const callback = this.async();
  const componentPath = this.resourcePath; // Gets the current file's absolute path

  const basePath = process.cwd(); // Consider using a base path if needed
  const identifierPath = path.resolve(basePath, './src/AutoDevSupport/WithComponentIdentifier');

  // Calculate relative path from the current file to WithComponentIdentifier.js
  let relativePath = path.relative(path.dirname(componentPath), identifierPath);
  relativePath = relativePath.replace(/\\/g, '/'); // Normalize path to use forward slashes (Unix style)

  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  const pathToFile = componentPath.replace(basePath, '').replace(/\\/g, '/');

  /*

  // Additional logging for debugging
  console.log(`Base Path: ${basePath}`);
  console.log(`Component Path: ${componentPath}`);

  console.log(`Identifier Path: ${identifierPath}`);
  console.log(`Relative Path: ${relativePath}`);


  console.log(`Path to File: ${pathToFile}`);*/

  // Modify the source code
  if (source.includes('export default') && !source.includes('import withComponentIdentifier from')) {
    const newSource = source.replace(
      /export default ([\w]+)/,
      `import withComponentIdentifier from '${relativePath}';
      export default withComponentIdentifier($1, '${pathToFile}');`
    );

    console.log(newSource);
    callback(null, newSource, map, meta);
  } else {
    callback(null, source, map, meta);
  }
};
