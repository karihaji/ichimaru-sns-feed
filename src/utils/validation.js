const allowedPlatforms = new Set(["x", "instagram", "youtube"]);

export function isSafePublicUrl(value, hosts = []) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (!hosts.length || hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)));
  } catch {
    return false;
  }
}

export function validAccount(account) {
  return Boolean(
    account &&
    typeof account.id === "string" &&
    allowedPlatforms.has(account.platform) &&
    typeof account.displayName === "string" &&
    isSafePublicUrl(account.url) &&
    typeof account.order === "number"
  );
}

export function validInstagramPost(post) {
  const isProfile = post?.type === "profile";
  return Boolean(
    post &&
    typeof post.id === "string" &&
    typeof post.accountId === "string" &&
    isSafePublicUrl(post.postUrl, ["instagram.com"]) &&
    (isProfile || /^\d{4}-\d{2}-\d{2}$/.test(post.publishedAt)) &&
    typeof post.caption === "string" &&
    typeof post.thumbnail === "string" &&
    typeof post.alt === "string" &&
    ["image", "carousel", "video", "profile"].includes(post.type)
  );
}

export function validXPost(post) {
  return Boolean(
    post &&
    /^\d+$/.test(post.id) &&
    typeof post.authorName === "string" &&
    /^@[A-Za-z0-9_]{1,15}$/.test(post.authorHandle) &&
    typeof post.text === "string" &&
    post.text.length > 0 &&
    !Number.isNaN(new Date(post.createdAt).getTime()) &&
    isSafePublicUrl(post.url, ["x.com"]) &&
    (!post.authorAvatar || isSafePublicUrl(post.authorAvatar, ["twimg.com"])) &&
    (!post.mediaUrl || isSafePublicUrl(post.mediaUrl, ["twimg.com"]))
  );
}

export function validYouTubeVideo(video) {
  return Boolean(
    video &&
    /^[A-Za-z0-9_-]{6,20}$/.test(video.videoId) &&
    typeof video.title === "string" &&
    isSafePublicUrl(video.url, ["youtube.com", "youtu.be"]) &&
    !Number.isNaN(new Date(video.publishedAt).getTime()) &&
    isSafePublicUrl(video.thumbnail, ["ytimg.com"])
  );
}
