import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { validInstagramPost } from "../src/utils/validation.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const accountsPath = resolve(root, "public/data/accounts.json");
const instagramPath = resolve(root, "public/data/instagram.json");
const accounts = JSON.parse(await readFile(accountsPath, "utf8"))
  .filter((account) => account.platform === "instagram" && account.enabled !== false);

if (!accounts.length) throw new Error("Instagram accounts are not registered in accounts.json");

const rl = createInterface({ input, output });
try {
  console.log("Instagramアカウントを選択してください:");
  accounts.forEach((account, index) => console.log(`${index + 1}. ${account.displayName} (${account.handle})`));
  const selectedIndex = Number(await rl.question("番号: ")) - 1;
  const account = accounts[selectedIndex];
  if (!account) throw new Error("アカウント番号が正しくありません。");

  const postUrl = (await rl.question("投稿URL: ")).trim();
  const publishedAt = (await rl.question("投稿日 (YYYY-MM-DD): ")).trim();
  const caption = (await rl.question("短い説明: ")).trim();
  const thumbnailName = (await rl.question("サムネイルファイル名 (例: instagram-001.webp): ")).trim();
  const alt = (await rl.question("代替テキスト: ")).trim();
  const type = (await rl.question("投稿種別 (image/carousel/video) [image]: ")).trim() || "image";
  const items = JSON.parse(await readFile(instagramPath, "utf8"));
  const sequence = items.reduce((max, item) => {
    const number = Number(item.id?.match(/(\d+)$/)?.[1] || 0);
    return Math.max(max, number);
  }, 0) + 1;
  const accountId = account.id.replace(/^instagram-/, "");
  const item = {
    id: `instagram-${String(sequence).padStart(3, "0")}`,
    accountId,
    accountName: account.displayName,
    accountHandle: account.handle,
    accountUrl: account.url,
    postUrl,
    publishedAt,
    caption,
    thumbnail: `./assets/instagram/${thumbnailName}`,
    alt,
    type,
    enabled: true
  };

  if (!validInstagramPost(item)) throw new Error("入力内容が不正です。HTTPSのInstagram投稿URL、日付、必須項目を確認してください。");
  if (items.some((existing) => existing.id === item.id || existing.postUrl === item.postUrl)) throw new Error("同じIDまたは投稿URLが既に登録されています。");

  items.push(item);
  await writeFile(instagramPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  console.log(`${item.id} を追加しました。画像ファイルを public/assets/instagram/${thumbnailName} に配置してください。`);
} finally {
  rl.close();
}
