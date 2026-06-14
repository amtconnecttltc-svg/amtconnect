import fs from 'fs';
import path from 'path';

function inlineAssets() {
  const distDir = path.join(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distDir, 'index.html');
  const outputHtmlPath = path.join(process.cwd(), 'gas-index.html');

  if (!fs.existsSync(indexHtmlPath)) {
    console.error('index.html not found in dist.');
    return;
  }

  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  // Find css link and inline it
  const cssRegex = /<link rel="stylesheet"[^>]*href="\/assets\/([^"]+)"[^>]*>/g;
  indexHtml = indexHtml.replace(cssRegex, (match, cssFile) => {
    const cssPath = path.join(distDir, 'assets', cssFile);
    if (fs.existsSync(cssPath)) {
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      return `<style>${cssContent}</style>`;
    }
    return match;
  });

  // Find js script and inline it
  const jsRegex = /<script type="module"[^>]*src="\/assets\/([^"]+)"[^>]*><\/script>/g;
  indexHtml = indexHtml.replace(jsRegex, (match, jsFile) => {
    const jsPath = path.join(distDir, 'assets', jsFile);
    if (fs.existsSync(jsPath)) {
      const jsContent = fs.readFileSync(jsPath, 'utf8');
      return `<script type="module">${jsContent}</script>`;
    }
    return match;
  });

  fs.writeFileSync(outputHtmlPath, indexHtml, 'utf8');
  fs.writeFileSync(path.join(distDir, 'gas-index.html'), indexHtml, 'utf8');
  
  // Also write to public folder so it's accessible directly via the web app URL under /gas-index.html
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }
  fs.writeFileSync(path.join(publicDir, 'gas-index.html'), indexHtml, 'utf8');

  console.log('Successfully generated self-contained HTML for Google Apps Script at: gas-index.html, dist/gas-index.html and public/gas-index.html');
}

inlineAssets();
