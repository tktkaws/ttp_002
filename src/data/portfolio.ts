import type {
  DescriptionItem,
  NavItem,
  SectionContent,
  StrengthItem,
  TextCardItem,
} from "../types/portfolio";

export const identity = {
  title: "タカハシタカユキのポートフォリオ",
  description:
    "東京都在住のフロントエンドエンジニア、タカハシタカユキのポートフォリオ。WordPressを中心としたサイト制作の技術・強み・成果物を紹介しています。",
  logoLabel: "タカハシ タカユキ のポートフォリオ",
  logoLines: ["タカハシ", "タカユキ", "のポート", "フォリオ"],
  githubUrl: "https://github.com/tktkaws",
};

export const sections = {
  about: { id: "section01", number: "01", title: "自己紹介" },
  skills: { id: "section02", number: "02", title: "技術" },
  strengths: { id: "section03", number: "03", title: "強み" },
  projects: { id: "section04", number: "04", title: "成果物" },
} satisfies Record<string, SectionContent>;

export const navItems = Object.values(sections).map(({ id, title }) => ({
  href: `#${id}`,
  label: title,
})) satisfies NavItem[];

export const introduction = [
  "はじめまして。タカハシタカユキと申します。",
  "都内のWeb制作会社で、コーダーとして勤務しています。",
  "1986年生まれですが、業務歴は3年弱です。",
  "主に静的サイトの制作保守やWordPressの構築を担当しています。",
  "Webアクセシビリティとモダンフロントエンドに興味があり、日々学習しています。",
];

export const skills = [
  {
    label: "HTML",
    description:
      "セマンティックなマークアップを意識し、Web標準に準拠したUIを実装します。制作過程では、Nu Html Checkerやmarkuplintによる検証を適宜行い、品質を担保します。",
  },
  {
    label: "CSS",
    description:
      "業務ではMindBEMdingを意識し、既存プロジェクトのルールに沿ったCSS設計・実装を行っています。個人開発ではTailwind CSSをよく使用しており、ユーティリティファーストな開発にも対応できます。",
  },
  {
    label: "JavaScript",
    description:
      "業務では、アニメーションなどの演出を実装するためのVanilla JavaScriptの記述や、既存ライブラリの導入・調整を主に行っています。個人開発では、TypeScript、React、Next.js、Astroを学びながら実装に取り組んでいます。",
  },
  {
    label: "WordPress",
    description:
      "業務では、クラシックエディタとAdvanced Custom Fieldsを用いたテーマ開発を多く経験しています。また、セキュリティに配慮した実装を心がけています。",
  },
  {
    label: "Accessibility",
    description:
      "JIS X 8341-3:2016への適合を目指す既存サイトの改修を担当しました。日々の案件でも、可能な限りWCAG 2.2に沿った実装を心がけています。また、DHS Trusted Tester認定を取得し、WCAG 2.0に基づいたWebアクセシビリティ試験を実施できます。",
  },
  {
    label: "Git",
    description:
      "基本的なGit操作に加え、GitHub Flowによるブランチ運用を理解しています。変更内容が追いやすいコミットを意識し、ブランチの作成からプルリクエスト、レビュー、マージまで、チーム開発の流れに沿って作業できます。",
  },
] satisfies DescriptionItem[];

export const strengths = [
  {
    label: "知的好奇心",
    lines: [
      "技術への探究心を原動力に、日々の学習を習慣として継続しています。",
      "書籍や有料のイベントなど複数のインプット手段を用い、体系的な知識と最新の動向を取り入れています。",
      "さらに、週末には学んだ内容を実際に手を動かして実装し、知識を実践で使えるスキルへと定着させています。",
    ],
  },
  {
    label: "業務改善意欲",
    lines: [
      "チーム全体の生産性と品質を高めるため、自ら課題を見つけて改善に取り組んできました。",
      "コーダー向けの勉強会を主催し、社内への知識共有を推進しています。",
      "あわせて、ドキュメント化を進め、知識が組織の資産として残る環境づくりに努めています。",
      "また、スムースにプロジェクトを開始できる状態を目指して、情報共有のフォーマットを整備しています。",
    ],
  },
] satisfies StrengthItem[];

export const outputs = [
  {
    label: "技術ブログ",
    description:
      "microCMS、Astroを使用しブログを作成しました。Swupによる擬似的な非同期遷移も実装しました。",
    image: "/front-dispatch-2026.vercel.app_.png",
    href: "https://thinking-in-the-grey.pages.dev/",
    detailsHref: "https://thinking-in-the-grey.pages.dev/blog/ekgrhcgdn/",
  },
  {
    label: "会議室予約システム",
    description: "Next.jsとSupabaseを使用して会議室予約アプリを作成しました。",
    image: "/reservation-01.vercel.app_.png",
    href: "https://reservation-01.vercel.app/",
    detailsHref: "https://example.com/",
  },
  {
    label: "SCROLL WARS",
    description:
      "three.jsとLenisを使用し、スター・ウォーズのオープニングとエンディングをWebサイト上で再現しました。",
    image:
      "https://raw.githubusercontent.com/tktkaws/scroll_wars/main/public/screenshot.png",
    imageLayout: "inset",
    href: "https://scroll-wars.vercel.app/",
    detailsHref: "https://example.com/",
  },
  {
    label: "Spotify UI",
    description:
      "Spotifyで印象的な、カバー画像が縮小して背景色が浮き上がってくるUIを再現してみました。",
    image: "/spotify_ui.png",
    href: "https://spotify-ui-six.vercel.app/",
    detailsHref: "https://example.com/",
  },
  {
    label: "p5.js Learning",
    description: "P5.jsを学習するサイトを作成しました。",
    image: "/p5-learning.png",
    href: "https://p5-learning-tau.vercel.app/",
    detailsHref: "https://example.com/",
  },
  {
    label: "Scroll Image Distortion",
    description: "スクロールに応じて画像が歪むUIを作成しました。",
    image: "/Scroll_Image_Distortion.png",
    href: "https://scroll-image-distortion.vercel.app/",
    detailsHref: "https://example.com/",
  },
] satisfies TextCardItem[];
