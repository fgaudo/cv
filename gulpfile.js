import path from "path";
import Handlebars from "handlebars";
import experiences from "./data/experiences.js";
import { parallel, series, watch } from "gulp";
import { mkdir, readFile, writeFile } from "fs/promises";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { deleteAsync } from "del";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildHtml() {
  const template = await readFile(
    path.join(__dirname, "templates/index.hbs"),
    "utf-8",
  );

  var renderTemplate = Handlebars.compile(template);
  var html = renderTemplate(experiences);

  await writeFile(path.join(__dirname, "dist/index.html"), html);
}

async function buildCss() {
  const cssFilePath = path.join(__dirname, "css/style.css");
  const css = await readFile(cssFilePath);
  const processor = postcss(
    autoprefixer(),
    tailwindcss({
      content: [
        path.join(__dirname, "templates/*"),
        path.join(__dirname, "css/*"),
      ],
      theme: {
        extend: {},
      },
      plugins: [],
    }),
  );
  const cssOutputDir = path.join(__dirname, "dist/css");
  const cssOutputFilePath = path.join(cssOutputDir, "style.css");

  const result = await processor.process(css, {
    from: cssFilePath,
    to: cssOutputFilePath,
  });

  await writeFile(cssOutputFilePath, result.css);
}

async function clean() {
  await deleteAsync(path.join(__dirname, "dist/"));

  await mkdir(path.join(__dirname, "dist/css"), { recursive: true });
}

const task = series(clean, parallel(buildHtml, buildCss));
watch(
  [
    path.normalize("templates/*"),
    path.normalize("css/*"),
    path.normalize("data/*"),
  ],
  task,
);

export default task;
