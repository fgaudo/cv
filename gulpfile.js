import path from "path";
import Handlebars from "handlebars";
import { parallel, series, watch } from "gulp";
import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import info from "./data/info.js";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname } from "path";
import { deleteAsync } from "del";
import wkhtmltopdf from "wkhtmltopdf";
import { createReadStream, createWriteStream } from "fs";
import puppeteer from "puppeteer";

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

  const html = renderTemplate({
    info,
    css: "./css/style.css",
    nextrek: renderNextrekTemplates,
  });

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
        path.join(__dirname, "data/*"),
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

export async function buildPDF() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const website_url = pathToFileURL(path.join(__dirname, "dist/index.xhtml"));
  await page.goto(website_url, { waitUntil: "networkidle0" });
  await page.emulateMediaType("screen");
  await page.pdf({
    path: "result.pdf",
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    printBackground: true,
    format: "A4",
  });
  await browser.close();
}

async function clean() {
  await deleteAsync(path.join(__dirname, "dist/"));

  await mkdir(path.join(__dirname, "dist/css"), { recursive: true });
}

export default () =>
  watch(
    [
      path.normalize("templates/*"),
      path.normalize("css/*"),
      path.normalize("data/*"),
    ],
    { ignoreInitial: false },
    series(clean, parallel(buildHtml, buildCss)),
  );
