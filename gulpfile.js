import path from "path";
import Handlebars from "handlebars";
import { parallel, series, watch } from "gulp";
import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { deleteAsync } from "del";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildHtml() {
  const [template, nextrekTemplateNames] = await Promise.all([
    readFile(path.join(__dirname, "templates/index.hbs"), "utf-8"),
    readdir(path.join(__dirname, "data/nextrek")),
  ]);

  const nextrekTemplates = await Promise.all(
    nextrekTemplateNames.map((a) =>
      readFile(path.join(__dirname, "data/nextrek/", a), "utf-8"),
    ),
  );

  const renderNextrekTemplates = nextrekTemplates
    .map((a) => Handlebars.compile(a))
    .map((render) => render());

  const renderTemplate = Handlebars.compile(template);

  const html = renderTemplate({ nextrek: renderNextrekTemplates });

  await writeFile(path.join(__dirname, "dist/index.xhtml"), html);
}

async function buildCss() {
  const cssFilePath = path.join(__dirname, "css/style.css");
  const css = await readFile(cssFilePath, "utf-8");
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
  const cssOutputFilePath = path.join(__dirname, "dist/css/style.css");

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
