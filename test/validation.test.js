import test from "node:test";
import assert from "node:assert/strict";
import { isSafePublicUrl, validInstagramPost, validXPost, validYouTubeVideo } from "../src/utils/validation.js";

test("public URL validation rejects insecure and unexpected hosts", () => {
  assert.equal(isSafePublicUrl("https://www.instagram.com/p/example/", ["instagram.com"]), true);
  assert.equal(isSafePublicUrl("http://www.instagram.com/p/example/", ["instagram.com"]), false);
  assert.equal(isSafePublicUrl("https://example.com/p/example/", ["instagram.com"]), false);
});

test("Instagram post requires the supported shape", () => {
  assert.equal(validInstagramPost({
    id: "instagram-001",
    accountId: "ichimarugroup",
    postUrl: "https://www.instagram.com/p/example/",
    publishedAt: "2026-06-12",
    caption: "caption",
    thumbnail: "./assets/instagram/example.webp",
    alt: "alt",
    type: "image"
  }), true);
});

test("Instagram profile card can omit a publication date", () => {
  assert.equal(validInstagramPost({
    id: "instagram-profile-example",
    accountId: "example",
    postUrl: "https://www.instagram.com/example/",
    caption: "Official profile",
    thumbnail: "./assets/placeholders/social-placeholder.svg",
    alt: "Official Instagram profile",
    type: "profile"
  }), true);
});

test("X post accepts API-normalized public data", () => {
  assert.equal(validXPost({
    id: "2065375791920406964",
    authorName: "市丸グループ",
    authorHandle: "@Cosmo_Ichimaru",
    authorAvatar: "https://pbs.twimg.com/profile_images/example.jpg",
    text: "公開Xリストの投稿です。",
    createdAt: "2026-06-12T00:00:00Z",
    url: "https://x.com/Cosmo_Ichimaru/status/2065375791920406964",
    mediaUrl: "",
    mediaType: ""
  }), true);
});

test("YouTube video validation accepts public watch data", () => {
  assert.equal(validYouTubeVideo({
    videoId: "AbCdEf12345",
    title: "Example",
    url: "https://www.youtube.com/watch?v=AbCdEf12345",
    publishedAt: "2026-06-12T00:00:00Z",
    thumbnail: "https://i.ytimg.com/vi/AbCdEf12345/hqdefault.jpg"
  }), true);
});
