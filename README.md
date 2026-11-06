# カニ省の長屋──江戸っ子のAI達と暮らして8ヶ月──

大江戸Ruby会議11（2026-11-08 / 東京芸術センター 天空劇場）の発表スライド。
原稿: [esa #1108](https://taea.esa.io/posts/1108)

[claude-code-as-a-friend](https://github.com/taea/claude-code-as-a-friend) の Markdown スライドエンジンを土台に、
[kani.show](https://kani.show/) の色とドット絵（`scripts/pixel.js`）を借りて組んだ。

## 動かす

```sh
python3 -m http.server 8811
# → http://localhost:8811/
```

`index.md` を直してリロードすれば反映される。ビルドなし。フォントと JS ライブラリは同梱してあるので、会場がオフラインでも動く。

## 配信

https://docs.kani.show/oedo11/ — Cloudflare Workers の静的 assets（`wrangler.jsonc`）。
`worker.js` が `/oedo11` を剥がしてリポジトリ直下のファイルを返す。公開しないものは `.assetsignore` に書く。

```sh
npx wrangler deploy
```

## 操作

| 操作 | 動作 |
|---|---|
| `→` / `Space` / `Enter` / 画面右側クリック / 左スワイプ | 次へ（ステップがあれば先にステップ） |
| `←` / `Backspace` / 画面左側クリック | 戻る |
| `↓` / `↑` | ステップを飛ばして次 / 前のスライド |
| `Home` / `End` | 先頭 / 末尾 |
| `f` | フルスクリーン |
| `t` / `r` | 20分タイマーの開始・一時停止 / 20:00 に戻す（右上に出る。最初の `t` までは隠れてる） |
| `#12` / `#12.1` | 12枚目 / 12枚目のステップ1 に直接飛ぶ |

## 原稿の書き方

claude-code-as-a-friend と同じ（`# h1` / `## h2` / `---` で区切り、frontmatter で表紙情報）。足したもの:

| コメント | 意味 |
|---|---|
| `<!-- layout: shot -->` | スクショをバーンと見せる。本文があれば、次のキーで幕がかかって詳細が乗る。本文が短い1段落なら札の添え書きになる |
| `<!-- layout: chapter -->` | 章扉。夕焼けの長屋に、その章の部屋のカニが立つ |
| `<!-- layout: big -->` | 一言をでかく |
| `<!-- layout: 2column -->` | 左に画像（札）、右に本文。画像なしで `###` が2つあれば左右の箱に割る |
| `<!-- layout: end -->` | 長屋の前でカニたちが踊る |
| `<!-- chapter: 秘書 -->` | 章（フッターの長屋の部屋）。以降のスライドに引き継がれる。部屋は frontmatter の `rooms` |
| `<!-- class: stack -->` | スクショを縦に積む（横長のスクショ2枚向け） |
| `<!-- class: full -->` | shot のスクショを大きく。見出しの札は画像の上に重ねる |
| `<!-- class: side -->` | shot の本文の引用（`>`）をスクショの右脇に添え書きとして出す（幕とは別） |
| `<!-- class: dense -->` | 文字を少し小さく（詰め込みスライド向け） |
| `<!-- pause -->` | ここで一旦止める |
| `<!-- skip -->` | 本番では軽く流していい印。送りでは普通に出るが、右上（タイマーの下）に小さく skip 札が付く |

## 素材

- `assets/esa/NN.png` — esa #1108 の画像（`index.json` に元の名前と URL）
- `assets/qr/` — yota.kani.show / bsky.app/profile/kani.show / kani.show の QR
