import test from "node:test";
import assert from "node:assert/strict";
import { isSafePublicUrl, validInstagramPost, validYouTubeVideo } from "../src/utils/validation.js";

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

test("YouTube video validation accepts public watch data", () => {
  assert.equal(validYouTubeVideo({
    videoId: "AbCdEf12345",
    title: "Example",
    url: "https://www.youtube.com/watch?v=AbCdEf12345",
    publishedAt: "2026-06-12T00:00:00Z",
    thumbnail: "https://i.ytimg.com/vi/AbCdEf12345/hqdefault.jpg"
  }), true);
});
