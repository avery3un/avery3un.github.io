/* ==========================================================
   on repeat —— 我在听的歌
   加一首歌：复制下面任意一段 { ... }（包括后面的逗号），粘贴到列表里，改成新歌的信息。
   - cover：封面图片（放在 images/play/music/ 里，正方形最好；图片还没有时会显示渐变色）
   - title：歌名
   - artist：歌手
   - spotify：这首歌的 Spotify 链接（在 Spotify 里点 分享 → 复制歌曲链接）
              留空 "" 的话，播放按钮会自动隐藏
   顺序就是播放顺序：往右滑是下一首，最后一首接回第 1 首。
   打开页面时在正中间的歌：改最下面 MUSIC_START 里的歌名。
   ========================================================== */
window.MUSIC = [
  {
    cover: "images/play/music/kyoto-snow.jpg",
    title: "Kyoto Snow",
    artist: "John Splithoff",
    spotify: "https://open.spotify.com/track/1nBqS2NtjhbOZ0UNxBlp43"
  },
  {
    cover: "images/play/music/yuzai.jpeg",
    title: "魚仔",
    artist: "Crowd Lu（盧廣仲）",
    spotify: "https://open.spotify.com/track/2sb6AZQLeoD3VgA4zglQB6"
  },
  {
    cover: "images/play/music/always.jpeg",
    title: "Always",
    artist: "Daniel Caesar",
    spotify: "https://open.spotify.com/track/2g5eyjDwIUDiA5mc3nSoVm"
  },
  {
    cover: "images/play/music/white-ferrari.jpeg",
    title: "White Ferrari",
    artist: "Frank Ocean",
    spotify: "https://open.spotify.com/track/4r9CtoTORnhgolvhslLdTx"
  },
  {
    cover: "images/play/music/wantchu.jpeg",
    title: "WANTCHU",
    artist: "keshi",
    spotify: "https://open.spotify.com/track/0XWf8CRB6IptewumZDi5b6"
  },
  {
    cover: "images/play/music/honest.jpeg",
    title: "honest (feat. moon tang)",
    artist: "Gareth.T",
    spotify: "https://open.spotify.com/track/2tKSpQd11l37lsQqLtCvwf"
  }
];

/* 打开页面时放在正中间的歌（填歌名，要和上面的 title 一样） */
window.MUSIC_START = "Always";
