const fs = require('fs');
const css = fs.readFileSync('app/results/results.module.css', 'utf8');
const lines = css.split(/\r?\n/);

const firstSpin = lines.findIndex(l => l.includes('@keyframes spin'));
if (firstSpin !== -1) {
  // truncate array at firstSpin + 3
  const newLines = lines.slice(0, firstSpin + 3);
  const mediaQuery = `
@media (max-width: 768px) {
  .headerRow {
    flex-direction: column;
    align-items: flex-start;
  }
  .statsGrid, .fourCol, .oneCol {
    grid-template-columns: 1fr !important;
    gap: 16px;
  }
  .span2 {
    grid-column: span 1 !important;
    flex-direction: column !important;
    gap: 16px;
  }
  .emptyStateActions {
    flex-direction: column;
  }
  .page {
    padding: 24px 12px 64px !important;
  }
}
`;
  const newCss = newLines.join('\n') + mediaQuery;
  fs.writeFileSync('app/results/results.module.css', newCss);
  console.log("Fixed!");
} else {
  console.log("Could not find @keyframes spin");
}
