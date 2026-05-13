const text = `@article{smith2020, title={This is a test}, year={2020}}
@article{doe2021, title = "Another test"}
@inproceedings{foo,
  title = {A multiline
  title is here}
}`;
const regex = /title\s*=\s*(?:\{([^}]*)\}|"([^"]*)")/gi;
let match;
const titles = [];
while ((match = regex.exec(text)) !== null) {
  const title = match[1] || match[2];
  if (title) {
    titles.push(title.replace(/\s+/g, ' ').replace(/[{}]/g, '').trim());
  }
}
console.log(titles);
